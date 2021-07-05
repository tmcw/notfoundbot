import Tempy from "tempy";
import { getOctokit, context } from "@actions/github";
import Fs from "fs";
import Path from "path";
import { LContext } from "../types";
import { getFiles } from "../src/get_files";

export function getTestFiles(ctx: LContext) {
  Fs.copyFileSync(
    Path.join(__dirname, "./fixtures/example.md"),
    Path.join(ctx.cwd, `${ctx.contentDir}/2020-01-01-example.md`)
  );

  return getFiles(ctx);
}

export function testContext(contentDir = "_posts"): LContext {
  const tmp = Tempy.directory();
  Fs.mkdirSync(Path.join(tmp, contentDir));
  process.env["GITHUB_REPOSITORY"] = "foo/bar";
  process.env["GITHUB_EVENT_PATH"] = Path.join(__dirname, "payload.json");
  process.env["GITHUB_TOKEN"] = "0000000000000000000000000000000000000000";
  process.env["GITHUB_WORKSPACE"] = tmp;
  const toolkit = getOctokit(process.env.GITHUB_TOKEN!);
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
