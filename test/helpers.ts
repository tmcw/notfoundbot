import { temporaryDirectory } from "tempy";
import { getOctokit, context } from "@actions/github";
import Fs from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import fetchMock, { FetchMock } from "fetch-mock";
import { LContext } from "../types.js";
import { getFiles } from "../src/get_files.js";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

export function getTestFiles(ctx: LContext) {
  Fs.copyFileSync(
    Path.join(__dirname, "./fixtures/example.md"),
    Path.join(ctx.cwd, `${ctx.contentDir}/2020-01-01-example.md`)
  );

  return getFiles(ctx);
}

export function createMockFetch(): FetchMock {
  return fetchMock.createInstance();
}

export function testContext(contentDir = "_posts", mock?: FetchMock): LContext {
  const tmp = temporaryDirectory();
  Fs.mkdirSync(Path.join(tmp, contentDir));
  process.env["GITHUB_REPOSITORY"] = "foo/bar";
  process.env["GITHUB_EVENT_PATH"] = Path.join(__dirname, "payload.json");
  process.env["GITHUB_TOKEN"] = "0000000000000000000000000000000000000000";
  process.env["GITHUB_WORKSPACE"] = tmp;

  const octokitOptions = mock
    ? { request: { fetch: mock.fetchHandler.bind(mock) } }
    : {};

  const toolkit = getOctokit(process.env.GITHUB_TOKEN!, octokitOptions);
  const messages: string[] = [];
  function message(str: string) {
    messages.push(str);
  }
  return {
    contentDir,
    cwd: tmp,
    limit: 100,
    toolkit,
    context,
    message,
    messages,
    cache: {},
    branchName: "test-branch",
    stats: {
      cacheSkipped: 0,
      upgradedSSL: 0,
      urlsScanned: 0,
      urlsDetected: 0,
      protocolSkipped: 0,
      relativeSkipped: 0,
      archived: 0,
    },
  };
}
