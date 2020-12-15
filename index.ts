#!/usr/bin/env node

import fs from "fs";
import Url from "url";
import Path from "path";
import isAbsoluteUrl from "is-absolute-url";
import Remark from "remark";
import pAll from "p-all";
import type { Link } from "mdast";
import type { Node } from "unist";
import { selectAll } from "unist-util-select";
import frontmatter from "remark-frontmatter";
import MagicString from "magic-string";
import { getOctokit, context } from "@actions/github";
import { saveCache, restoreCache } from "@actions/cache";
import sniff from "./sniff";

const dry = process.env.DRY_RUN;
const toolkit = getOctokit(process.env.GITHUB_TOKEN!);
const CACHE_FILE = ".linkrot-cache";
const DEVELOPMENT = process.platform === "darwin";

type FileChanges = {
  filename: string;
  gitPath: string;
  ast: Node;
  text: string;
  externalLinks: Link[];
  replacements: string[];
};

function replace(
  a: string,
  b: string,
  urlReferences: Map<string, FileChanges[]>
) {
  let results = [];
  for (let file of urlReferences.get(a)!) {
    let text = file.text;
    const s = new MagicString(text);
    const remark = Remark().use(frontmatter, ["yaml"]);
    const ast = remark.parse(text);
    const links = selectAll("link", ast) as Link[];
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

/**
 * If an existing PR has the linkrot tag,
 * print and return true to exit.
 */
async function checkForExisting() {
  const { data: existingLinkrotIssues } = await toolkit.issues.listForRepo({
    ...context.repo,
    labels: "linkrot",
  });
  const existingPr = existingLinkrotIssues.find((issue) => issue.pull_request);
  if (existingPr) {
    console.log("Skipping linkrot because a pull request already exists");
    console.log(existingPr.pull_request.html_url);
    process.exit();
  }
}

async function suggestChanges(replacements: FileChanges[], body: string) {
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
      body,
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

async function createRedirectCommits(
  branch: string,
  replacements: FileChanges[]
) {
  for (let file of replacements) {
    const message = file.replacements.join(", ");
    const ref = `refs/heads/${branch}`;
    const path = file.gitPath;

    if (dry) {
      console.log(`DRY: updating ${file.filename} with message: ${message}`);
    } else {
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
    const links = selectAll("link", ast) as Link[];
    const externalLinks = links.filter((link) => {
      const url = link.url as string;
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

type Cache = {
  [key: string]: number;
};

function getCache(): Cache {
  try {
    const c = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    for (let entry of c) {
      if (c[entry] < Date.now() - 100 * 60 * 60 * 24 * 14) {
        delete c[entry];
      }
    }
    return c;
  } catch (e) {
    return {};
  }
}

(async function () {
  await checkForExisting();

  if (!DEVELOPMENT) {
    await restoreCache([CACHE_FILE], "linkrot");
  }

  const cache = getCache();
  const files = gatherFiles();
  const urls = new Set<string>();
  const urlReferences = new Map<string, FileChanges[]>();
  let cacheSkipped = 0;

  for (let file of files) {
    for (let link of file.externalLinks) {
      if (link.url in cache) {
        cacheSkipped++;
        continue;
      }
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
  let upgrades = 0;

  await pAll(
    subset.map((url) => {
      return async () => {
        console.log(`Checking ${url}`);
        const result = await sniff(url);
        cache[url] = Date.now();
        switch (result.status) {
          case "upgrade":
            upgrades++;
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

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));

  if (!DEVELOPMENT) {
    await saveCache([CACHE_FILE], "linkrot");
  }

  if (replacements.size == 0) {
    return console.log("No changes to suggest");
  } else {
    console.log(`Creating PR with ${replacements.size} changes`);
  }

  await suggestChanges(
    Array.from(replacements),
    `- ${urls.size.toLocaleString()} URLs detected
- ${subset.length.toLocaleString()} checked in this run
- ${Object.keys(cache).length.toLocaleString()} URLs in cache
- ${cacheSkipped.toLocaleString()} skipped because of the cache
- ${upgrades.toLocaleString()} upgraded`
  );
})();
