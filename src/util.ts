import Url from "url";
import Fs from "fs";
import Path from "path";
import MagicString from "magic-string";
import Remark from "remark";
import { selectAll } from "unist-util-select";
import type { Link } from "mdast";
import frontmatter from "remark-frontmatter";
import isAbsoluteUrl from "is-absolute-url";
import glob from "glob";
import { LFile, LURLGroup, LContext } from "../types";

const remark = Remark().use(frontmatter, ["yaml", "toml"]);

export function groupFiles(ctx: LContext, files: LFile[]) {
  const groups = new Map<string, LURLGroup>();
  for (let file of files) {
    for (let link of selectAll("link", file.ast) as Link[]) {
      const { url } = link;
      const group = groups.get(url) || {
        url,
        files: new Set(),
      };
      group.files.add(file);
      groups.set(url, group);
    }
  }
  ctx.message(`${groups.size.toLocaleString()} unique URLs detected`);
  return Array.from(groups.values());
}

export function gatherFiles(ctx: LContext) {
  const { cwd } = ctx;
  const files = glob
    .sync("_posts/*.md", {
      cwd,
      absolute: true,
    })
    .map((filename) => {
      return toLFile(filename, Path.relative(cwd, filename));
    });
  ctx.message(`${files.length.toLocaleString()} files detected`);
  return files;
}

export function shouldScan(url: string) {
  const parts = Url.parse(url);
  return parts.protocol === "http:" || parts.protocol === "https:";
}

function filterGroup(ctx: LContext, group: LURLGroup) {
  const { url } = group;
  if (!isAbsoluteUrl(url)) {
    ctx.stats.relativeSkipped++;
    return false;
  }
  if (!shouldScan(url)) {
    ctx.stats.protocolSkipped++;
    return false;
  }
  if (ctx.cache[url]) {
    ctx.stats.cacheSkipped++;
    return false;
  }
  return true;
}

export function skipGroups(ctx: LContext, groups: LURLGroup[]) {
  ctx.stats.urlsDetected = groups.length;
  const filtered = groups.filter((group) => filterGroup(ctx, group));
  const limited = filtered.slice(0, ctx.limit);
  ctx.stats.urlsScanned = limited.length;
  return limited;
}

export function toLFile(filename: string, gitPath: string): LFile {
  const text = Fs.readFileSync(filename, "utf8");
  const ast = remark.parse(text);

  return {
    filename,
    gitPath,
    ast,
    magicString: new MagicString(text),
    replacements: [],
  };
}

export function replaceLinks(file: LFile, a: string, b: string) {
  const { ast, magicString } = file;
  const links = selectAll("link", ast) as Link[];
  for (let link of links) {
    if (link.url === a) {
      link.url = b;
      magicString.overwrite(
        link.position!.start.offset!,
        link.position!.end.offset!,
        remark.stringify(link)
      );
    }
  }
  file.replacements.push(`${a} → ${b}`);
}

export function updateFiles(ctx: LContext, groups: LURLGroup[]): LFile[] {
  let updatedFiles: Set<LFile> = new Set();
  for (let group of groups) {
    switch (group.status?.status) {
      case "upgrade": {
        for (let file of group.files) {
          replaceLinks(file, group.url, group.status.to);
          updatedFiles.add(file);
          ctx.stats.upgradedSSL++;
        }
      }
      case "archive": {
        for (let file of group.files) {
          replaceLinks(file, group.url, group.status.to);
          updatedFiles.add(file);
          ctx.stats.archived++;
        }
      }
    }
  }
  return Array.from(updatedFiles);
}
