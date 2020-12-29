import type {Link} from "mdast";
import type {Node} from "unist";
import type {context} from "@actions/github";
import {getOctokit} from "@actions/github";

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

export type LContext = {
  context: typeof context,
  toolkit: ReturnType<typeof getOctokit>,
  cacheUtils: {
    restoreCache: any,
    saveCache: any,
  }
}
