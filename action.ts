import Fs from "fs";
import { action } from "./index";
import { getCache } from "./src/get_cache";
import { getOctokit, context } from "@actions/github";
import { restoreCache, saveCache } from "@actions/cache";
import { getInput } from "@actions/core";
import { LContext } from "./types";

const toolkit = getOctokit(process.env.GITHUB_TOKEN!);
const cacheKey = `notfoundbot-v2-${Date.now()}`;

const messages: string[] = [];

function message(msg: string) {
  messages.push(msg);
  console.log(msg);
}

(async function () {
  const ctx: LContext = {
    contentDir: getInput("content-folder"),
    cwd: process.env.GITHUB_WORKSPACE || __dirname,
    toolkit,
    context,
    cache: {},
    message,
    messages,
    limit: 100,
    branchName: `notfoundbot-${new Date()
      .toLocaleDateString()
      .replace(/\//g, "-")}`,
    stats: {
      cacheSkipped: 0,
      upgradedSSL: 0,
      urlsDetected: 0,
      urlsScanned: 0,
      protocolSkipped: 0,
      relativeSkipped: 0,
      archived: 0,
    },
  };
  const cacheFilePath = ".notfoundbot-cache";
  try {
    await restoreCache([cacheFilePath], cacheKey, ["notfoundbot-v2-"]);
  } catch (e) {
    ctx.message("ERROR: Failed to restore cache!");
  }
  await getCache(ctx, cacheFilePath);
  await action(ctx);
  ctx.message(`Saving cache with ${Object.keys(ctx.cache).length} items`);
  Fs.writeFileSync(cacheFilePath, JSON.stringify(ctx.cache));
  try {
    await saveCache([cacheFilePath], cacheKey);
  } catch (e) {
    ctx.message("ERROR: Failed to save cache!");
    throw e;
  }
})();
