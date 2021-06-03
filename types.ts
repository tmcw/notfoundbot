import type { Node } from "unist";
import type { context } from "@actions/github";
import MagicString from "magic-string";
import { getOctokit } from "@actions/github";

export type LFile = {
  filename: string;
  gitPath: string;
  ast: Node;
  date: Date | undefined;
  magicString: MagicString;
  replacements: string[];
};

export type LStatus =
  | {
      status: "upgrade";
      to: string;
    }
  | {
      status: "archive";
      to: string;
    }
  | {
      status: "error";
    }
  | { status: "ok" };

export type LURLGroup = {
  url: string;
  files: Set<LFile>;
  status?: LStatus;
};

export type Cache = {
  [key: string]: number;
};

export type LContext = {
  contentDir: string;
  cwd: string;
  context: typeof context;
  toolkit: ReturnType<typeof getOctokit>;
  cache: Cache;
  message: (message: string) => void;
  messages: string[];
  limit: number;
  branchName: string;
  stats: {
    cacheSkipped: number;
    upgradedSSL: number;
    urlsScanned: number;
    urlsDetected: number;
    protocolSkipped: number;
    relativeSkipped: number;
    archived: number;
  };
};

export class LError extends Error {}

export type IAResults = {
  results: IAResult[];
};

type IASnapshot = {
  closest: {
    url: string;
    status: string;
    timestamp: string;
    available: boolean;
  };
};

type IAResult = {
  url: string;
  tag: string;
  archived_snapshots?: IASnapshot;
};
