import Fs from "fs";
import { action } from "./";
import { getCache } from "./src/get_cache";
import { getOctokit, context } from "@actions/github";
import { restoreCache, saveCache } from "@actions/cache";

const toolkit = getOctokit(process.env.GITHUB_TOKEN!);

const messages: string[] = [];

function message(msg: string) {
  messages.push(msg);
  console.log(msg);
}

(async function () {
  const ctx = {
    cwd: process.env.GITHUB_WORKSPACE || __dirname,
    toolkit,
    context,
    cache: {},
    message,
    messages,
    limit: 100,
    stats: {
      cacheSkipped: 0,
      upgradedSSL: 0,
      urlsDetected: 0,
      urlsScanned: 0,
    },
  };
  const cacheFilePath = ".linkrot-cache";
  await restoreCache([cacheFilePath], "linkrot");
  await getCache(ctx, cacheFilePath);
  await action(ctx);
  Fs.writeFileSync(cacheFilePath, JSON.stringify(ctx.cache));
  try {
    await saveCache([cacheFilePath], "linkrot");
  } catch (e) {
    ctx.message("ERROR: Failed to save cache!");
  }
})();
