import Fs from "node:fs";
import Path from "node:path";
import MagicString from "magic-string";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatter } from "micromark-extension-frontmatter";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { selectAll } from "unist-util-select";
import type { LFile, YamlNode, TomlNode } from "../types.js";
import type { Node } from "unist";
import yaml from "js-yaml";
import TOML from "@iarna/toml";

function parseMarkdown(text: string) {
  return fromMarkdown(text, {
    extensions: [frontmatter(["yaml", "toml"])],
    mdastExtensions: [frontmatterFromMarkdown(["yaml", "toml"])],
  });
}

export function frontmatterDate(ast: Node) {
  const nodes = selectAll("yaml,toml", ast) as (YamlNode | TomlNode)[];
  const node = nodes[0];
  if (!node) return;
  // Jekyll allows duplicate keys in YAML, but js-yaml will,
  // by default, throw if it encounters one. The json: true
  // option changes its behavior to take the last key value.
  const parsed = (node.type === "yaml"
    ? yaml.load(node.value, { json: true })
    : TOML.parse(node.value)) as Record<string, unknown>;
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
  const ast = parseMarkdown(text);

  return {
    filename,
    date: frontmatterDate(ast) || fileNameDate(filename),
    gitPath,
    ast,
    magicString: new MagicString(text),
    replacements: [],
  };
}
