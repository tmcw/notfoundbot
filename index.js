#!/usr/bin/env node
const fs = require("fs");
const Url = require("url");
const path = require("path");
const got = require("got");
const Remark = require("remark");
const { selectAll } = require("unist-util-select");
const frontmatter = require("remark-frontmatter");
const MagicString = require("magic-string");
const { getOctokit, context } = require("@actions/github");

// From https://github.com/sindresorhus/is-absolute-url
function isAbsoluteUrl(url) {
  if (/^[a-zA-Z]:\\/.test(url)) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
}

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

const toolkit = getOctokit(process.env.GITHUB_TOKEN);

async function suggestChanges(branch, replacements) {
  // Sometimes branch might come in with refs/heads already
  branch = branch.replace("refs/heads/", "");

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
        sha: context.sha,
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
    base: "main",
  });
}

function shouldScan(url) {
  const parts = Url.parse(url);
  return parts.scheme === "http:";
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
    const externalLinks = links.filter(
      (link) => isAbsoluteUrl(link.url) && shouldScan(link.url)
    );
    list.push({
      filename,
      ast,
      text,
      externalLinks,
    });
  }
  return list;
}

async function testUrl(url) {
  try {
    const resp = await got.head(url, { timeout: 2000 });
    if (resp.url !== url) {
      return { status: "redirect", to: resp.url };
    } else if (resp.status >= 400) {
      return { status: "error", responseCode: resp.status };
    } else {
      return { status: "ok" };
    }
  } catch (e) {
    return { status: "error" };
  }
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

  for (let url of [...urls].reverse()) {
    const { status, to } = await testUrl(url);
    switch (status) {
      case "ok":
        process.stdout.write(".");
        break;
      case "redirect":
        const httpsized = Url.format({
          ...Url.parse(url),
          protocol: "https:",
        });
        if (httpsized === to) {
          for (let file of replace(url, to, urlReferences)) {
            replacements.add(file);
          }
        }
        break;
      case "error":
        process.stdout.write("\n");
        console.log(`error: ${url}`);
        break;
    }
  }

  if (replacements.size == 0) {
    return console.log("No changes to suggest");
  }

  await suggestChanges(
    `linkrot-${new Date().toLocaleDateString().replace("/", "-")}`,
    [...replacements]
  );
})();
