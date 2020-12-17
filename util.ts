import Url from "url";
import Fs from "fs";
import Path from "path";
import MagicString from "magic-string";
import Remark from "remark";
import { selectAll } from "unist-util-select";
import type { Link } from "mdast";
import frontmatter from "remark-frontmatter";
import isAbsoluteUrl from "is-absolute-url";
import { FileChanges } from "./types";

function getRemark() {
  return Remark().use(frontmatter, ["yaml"]);
}

export function gatherFiles() {
  const BASE = Path.join(process.env.GITHUB_WORKSPACE || __dirname, "_posts");
  return Fs.readdirSync(BASE)
    .filter((f) => f.endsWith(".md"))
    .map(findLinks);
}

export function findLinks(basename: string): FileChanges {
  const BASE = Path.join(process.env.GITHUB_WORKSPACE || __dirname, "_posts");
  const filename = Path.join(BASE, basename);
  const text = Fs.readFileSync(filename, "utf8");
  const remark = getRemark();
  const ast = remark.parse(text);
  const links = selectAll("link", ast) as Link[];
  const externalLinks = links.filter((link) => {
    const url = link.url as string;
    return isAbsoluteUrl(url) && shouldScan(url);
  });
  return {
    filename,
    gitPath: Path.join("_posts", basename),
    ast,
    text,
    externalLinks,
    replacements: [],
  };
}

export function replaceFile(file: FileChanges, a: string, b: string) {
  let text = file.text;
  const s = new MagicString(text);
  const remark = getRemark();
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
}

export function shouldScan(url: string) {
  const parts = Url.parse(url);
  return parts.protocol === "http:";
}
