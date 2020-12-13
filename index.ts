#!/usr/bin/env node

import fs from "fs";
import Url from "url";
import Path from "path";
import isAbsoluteUrl from "is-absolute-url";
import Remark from "remark";
import pAll from "p-all";
import { selectAll } from "unist-util-select";
import frontmatter from "remark-frontmatter";
import MagicString from "magic-string";
import { getOctokit, context } from "@actions/github";
import sniff from "./sniff";

const dry = process.env.DRY_RUN;
const toolkit = getOctokit(process.env.GITHUB_TOKEN!);

type FileChanges = {
  filename: string,
  gitPath: string,
  ast: any,
  text: string,
  externalLinks: any[],
  replacements: Array<any>,
};

function replace(a: string, b: string, urlReferences: any) {
  let results = [];
  for (let file of urlReferences.get(a)) {
    let text = file.text;
    const s = new MagicString(text);
    const remark = Remark().use(frontmatter, ["yaml"]);
    const ast = remark.parse(text);
    const links = selectAll("link", ast);
    for (let link of links) {
      if (link.url === a) {
        link.url = b;
        s.overwrite(
          link.position!.start.offset!,
          link.position!.end.offset!,
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

async function suggestChanges(replacements: FileChanges[]) {
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

  await createRedirectCommits(branch, replacements);
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

async function createRedirectCommits(branch: string, replacements: FileChanges[]) {
  for (let file of replacements) {
    const message = file.replacements.join(", ");
    const ref = `refs/heads/${branch}`;
    const path = file.gitPath;

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

function shouldScan(url: string) {
  const parts = Url.parse(url);
  return parts.protocol === "http:";
}

function gatherFiles() {
  const BASE = Path.join(process.env.GITHUB_WORKSPACE || __dirname, "_posts");
  const files = fs.readdirSync(BASE).filter((f) => f.endsWith(".md"));
  const list: FileChanges[] = [];
  for (let f of files) {
    // console.log(`Scanning, ${f}`);
    const filename = Path.join(BASE, f);
    const text = fs.readFileSync(filename, "utf8");
    const remark = Remark().use(frontmatter, ["yaml"]);
    const ast = remark.parse(text);
    const links = selectAll("link", ast);
    const externalLinks = links.filter((link) => {
      const url = link.url as string
      return isAbsoluteUrl(url) && shouldScan(url);
    });
    list.push({
      filename,
      gitPath: Path.join("_posts", f),
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

  const urls = new Set<string>();
  const urlReferences = new Map<string, FileChanges[]>();
  for (let file of files) {
    for (let link of file.externalLinks) {
      urls.add(link.url);
      urlReferences.set(
        link.url,
        (urlReferences.get(link.url) || []).concat(file)
      );
    }
  }

  const subset = Array.from(urls).reverse().slice(0, 100);
  console.log(`Checking ${subset.length} URLs`);

  let replacements = new Set<FileChanges>();

  await pAll(
    subset.map((url) => {
      return async () => {
        console.log(`Checking ${url}`);
        const result= await sniff(url);
        switch (result.status) {
          case "upgrade":
            for (let file of replace(url, result.to, urlReferences)) {
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

  await suggestChanges(Array.from(replacements));
})();
