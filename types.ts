import type { Link } from "mdast";
import type { Node } from "unist";

export type FileChanges = {
  filename: string;
  gitPath: string;
  ast: Node;
  text: string;
  externalLinks: Link[];
  replacements: string[];
};

export type Cache = {
  [key: string]: number;
};
