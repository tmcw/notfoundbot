import Fs from "fs";
import Path from "path";
import MagicString from "magic-string";
import frontmatter from "remark-frontmatter";
import Remark from "remark";
import { select } from "unist-util-select";
import type { LFile } from "../types";
import type { Node } from "unist";
import type { YamlNode, TomlNode } from "remark-frontmatter";
import yaml from "js-yaml";
import TOML from "@iarna/toml";

const remark = Remark().use(frontmatter, ["yaml", "toml"]);

export function frontmatterDate(ast: Node) {
  const node = select("yaml,toml", ast) as YamlNode | TomlNode;
  if (!node) return;
  // Jekyll allows duplicate keys in YAML, but js-yaml will,
  // by default, throw if it encounters one. The json: true
  // option changes its behavior to take the last key value.
  const parsed = (node.type === "yaml"
    ? yaml.safeLoad(node.value, { json: true })
    : TOML.parse(node.value)) as any;
  if (!(typeof parsed.date === "string")) return;
  const date = new Date(parsed.date);
  if (date && !isNaN(date.getFullYear())) {
    return date;
  }
}

export function fileNameDate(filename: string) {
  const basename = Path.basename(filename);
  const match = basename.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    // Month here is 'monthIndex', a weird API, zero-indexed. Be careful.
    return new Date(Date.UTC(+match[1], parseInt(match[2], 10) - 1, +match[3]));
  }
}

export function toLFile(filename: string, gitPath: string): LFile {
  const text = Fs.readFileSync(filename, "utf8");
  const ast = remark.parse(text);

  return {
    filename,
    date: frontmatterDate(ast) || fileNameDate(filename),
    gitPath,
    ast,
    magicString: new MagicString(text),
    replacements: [],
  };
}
