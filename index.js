#!/usr/bin/env node
const fs = require("fs");
const Url = require("url");
const path = require("path");
const isAbsoluteUrl = require("is-absolute-url");
const Remark = require("remark");
const pAll = require("p-all");
const { selectAll } = require("unist-util-select");
const frontmatter = require("remark-frontmatter");
const MagicString = require("magic-string");
const { getOctokit, context } = require("@actions/github");
const sniff = require("./sniff");

function replace(a, b, urlReferences) {
  let results = [];
  for (let file of urlReferences.get(a)) {
    let text = file.text;
    const s = new MagicString(text);
    const remark = Remark().use(frontmatter, "yaml");
    const ast = remark.parse(text);
    const links = selectAll("link", ast);
    for (let link of links) {
      if (link.url === a) {
        link.url = b;
        s.overwrite(
          link.position.start.offset,
          link.position.end.offset,
          remark.stringify(link)
        );
      }
    }
    file.text = s.toString();
    results.push(file);
  }
  return results;
}

async function suggestChanges(branch, replacements) {
  const toolkit = getOctokit(process.env.GITHUB_TOKEN);
  // Sometimes branch might come in with refs/heads already
  branch = branch.replace("refs/heads/", "");

  const {
    data: { default_branch },
  } = await toolkit.repos.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });

  const {
    data: {
      object: { sha },
    },
  } = await toolkit.git.getRef({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: `heads/${default_branch}`,
  });

  // throws HttpError if branch already exists.
  try {
    await toolkit.repos.getBranch({
      ...context.repo,
      branch,
    });
  } catch (error) {
    if (error.name === "HttpError" && error.status === 404) {
      await toolkit.git.createRef({
        ref: `refs/heads/${branch}`,
        sha,
        ...context.repo,
      });
    } else {
      throw Error(error);
    }
  }
  for (let file of replacements) {
    const existing = await toolkit.repos.getContent({
      ...context.repo,
      ref: `refs/heads/${branch}`,
      path: file.filename,
    });

    await toolkit.repos.createOrUpdateFileContents({
      ...context.repo,
      path: file.filename,
      branch,
      sha: existing.data.sha,
      message: "Fixing redirect",
      content: Buffer.from(file.text).toString("base64"),
    });
  }
  await toolkit.pulls.create({
    ...context.repo,
    title: "Updating redirects",
    head: branch,
    base: default_branch,
  });
}

function shouldScan(url) {
  const parts = Url.parse(url);
  return parts.protocol === "http:" || parts.protocol === "https:";
}

function gatherFiles() {
  const BASE = "./_posts";
  const files = fs.readdirSync(BASE).filter((f) => f.endsWith(".md"));
  const list = [];
  for (let f of files) {
    const filename = path.join(BASE, f);
    const text = fs.readFileSync(filename, "utf8");
    const remark = Remark().use(frontmatter, "yaml");
    const ast = remark.parse(text);
    const links = selectAll("link", ast);
    const externalLinks = links.filter((link) => {
      return isAbsoluteUrl(link.url) && shouldScan(link.url);
    });
    list.push({
      filename,
      ast,
      text,
      externalLinks,
    });
  }
  return list;
}

(async function () {
  const files = gatherFiles();

  const urls = new Set();
  const urlReferences = new Map();
  for (let file of files) {
    for (let link of file.externalLinks) {
      urls.add(link.url);
      urlReferences.set(
        link.url,
        (urlReferences.get(link.url) || []).concat(file)
      );
    }
  }

  console.log(`Checking ${urls.size} URLs`);

  let replacements = new Set();

  await pAll(
    [...urls].reverse().map((url) => {
      return async () => {
        const { status, to } = await sniff(url);
        switch (status) {
          case "ok":
            // process.stdout.write("O");
            break;
          case "redirect":
            const httpsized = Url.format({
              ...Url.parse(url),
              protocol: "https:",
            });
            if (httpsized === to) {
              // process.stdout.write("S");
              for (let file of replace(url, to, urlReferences)) {
                replacements.add(file);
              }
            } else {
              console.log(httpsized, to);
              // process.stdout.write("R");
            }
            break;
          case "error":
            // process.stdout.write("E");
            // console.log(`error: ${url}`);
            break;
        }
      };
    }),
    { concurrency: 10 }
  );

  if (replacements.size == 0) {
    return console.log("No changes to suggest");
  } else {
    console.log(`Creating PR with ${replacements.size} changes`);
  }

  await suggestChanges(
    `linkrot-${new Date().toLocaleDateString().replace("/", "-")}`,
    [...replacements]
  );
})();
