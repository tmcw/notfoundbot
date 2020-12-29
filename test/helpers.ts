import Tempy from "tempy";
import { getOctokit, context } from "@actions/github";
import Fs from "fs";
import Path from "path";
import { LContext } from "../types";

export function testContext(): LContext {
  const tmp = Tempy.directory();
  Fs.mkdirSync(Path.join(tmp, "_posts"));
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
    cwd: tmp,
    limit: 100,
    toolkit,
    context,
    message,
    messages,
    cache: {},
    stats: {
      cacheSkipped: 0,
      upgradedSSL: 0,
      urlsScanned: 0,
      urlsDetected: 0,
    },
  };
}