import Remark from "remark";
import { selectAll } from "unist-util-select";
import type { Link } from "mdast";
import frontmatter from "remark-frontmatter";
import { LFile, LURLGroup, LContext } from "../types";

const remark = Remark().use(frontmatter, ["yaml", "toml"]);

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
      case "upgrade":
      case "archive": {
        for (let file of group.files) {
          replaceLinks(file, group.url, group.status.to);
          updatedFiles.add(file);
          ctx.stats[
            group.status.status == "upgrade" ? "upgradedSSL" : "archived"
          ]++;
        }
      }
    }
  }
  return Array.from(updatedFiles);
}
