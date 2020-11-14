#!/usr/bin/env node
const fs = require("fs");
const Url = require("url");
const Path = require("path");
const isAbsoluteUrl = require("is-absolute-url");
const Remark = require("remark");
const pAll = require("p-all");
const { selectAll } = require("unist-util-select");
const frontmatter = require("remark-frontmatter");
const MagicString = require("magic-string");
const { getOctokit, context } = require("@actions/github");
const sniff = require("./sniff");

const dry = process.env.DRY_RUN;
const toolkit = getOctokit(process.env.GITHUB_TOKEN);

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
    file.replacements.push(`${a} → ${b}`);
    results.push(file);
  }
  return results;
}

async function suggestChanges(replacements) {
  const branch = `linkrot-${new Date()
    .toLocaleDateString()
    .replace(/\//g, "-")}`;

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
      const branchRef = `refs/heads/${branch}`;
      if (dry) {
        console.log(`DRY: creating ref: ${branchRef}`);
      } else {
        await toolkit.git.createRef({
          ...context.repo,
          ref: branchRef,
          sha,
        });
      }
    } else {
      throw Error(error);
    }
  }

  await createRedirectCommits(toolkit, branch, replacements);
  const title = `🔗 Linkrot: updating ${replacements.length} links`;

  if (dry) {
    console.log(`DRY: creating pull: ${title}`);
  } else {
    const {
      data: { number },
    } = await toolkit.pulls.create({
      ...context.repo,
      title,
      head: branch,
      base: default_branch,
    });

    await toolkit.issues.addLabels({
      ...context.repo,
      issue_number: number,
      labels: ["linkrot"],
    });
  }
}

async function createRedirectCommits(toolkit, branch, replacements) {
  for (let file of replacements) {
    const message = file.replacements.join(", ");
    const ref = `refs/heads/${branch}`;
    const path = file.filename;

    if (dry) {
      console.log(`DRY: updating ${file.filename} with message: ${message}`);
    } else {
      console.log("Finding existing file", {
        ...context.repo,
        ref,
        path,
      });
      const existing = await toolkit.repos.getContent({
        ...context.repo,
        ref,
        path,
      });

      await toolkit.repos.createOrUpdateFileContents({
        ...context.repo,
        path,
        branch,
        sha: existing.data.sha,
        message,
        content: Buffer.from(file.text).toString("base64"),
      });
    }
  }
}

function shouldScan(url) {
  const parts = Url.parse(url);
  return parts.protocol === "http:";
}

function gatherFiles() {
  const BASE = Path.join(process.env.GITHUB_WORKSPACE || __dirname, "_posts");
  const files = fs.readdirSync(BASE).filter((f) => f.endsWith(".md"));
  const list = [];
  for (let f of files) {
    // console.log(`Scanning, ${f}`);
    const filename = Path.join(BASE, f);
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
      replacements: [],
    });
  }
  return list;
}

(async function () {
  // const { data: pulls } = await toolkit.pulls.list({
  //   owner: context.repo.owner,
  //   repo: context.repo.repo,
  // });

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

  const subset = [...urls].reverse().slice(0, 100);
  console.log(`Checking ${subset.length} URLs`);

  let replacements = new Set();

  await pAll(
    subset.map((url) => {
      return async () => {
        console.log(`Checking ${url}`);
        const { status, to } = await sniff(url);
        switch (status) {
          case "upgrade":
            for (let file of replace(url, to, urlReferences)) {
              replacements.add(file);
            }
            break;
          case "error":
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

  await suggestChanges([...replacements]);
})();
