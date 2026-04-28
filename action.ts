import Fs from "node:fs";
import { action } from "./index.js";
import { getCache } from "./src/get_cache.js";
import { getOctokit, context } from "@actions/github";
import { restoreCache, saveCache } from "@actions/cache";
import { getInput } from "@actions/core";
import { LContext, LError } from "./types.js";

const toolkit = getOctokit(process.env.GITHUB_TOKEN!);
const cacheKey = `notfoundbot-v2-${Date.now()}`;

const messages: string[] = [];

function message(msg: string) {
  messages.push(msg);
  console.log(msg);
}

// Defensive guard: if anything ever does slip through as an unhandled
// rejection, log it and set a non-zero exit code instead of letting Node 24
// crash the whole run silently.
process.on("unhandledRejection", (reason) => {
  const detail = reason instanceof Error ? reason.stack || reason.message : String(reason);
  console.error(`ERROR: Unhandled promise rejection: ${detail}`);
  process.exitCode = 1;
});

(async function () {
  const ctx: LContext = {
    contentDir: getInput("content-folder"),
    cwd: process.env.GITHUB_WORKSPACE || import.meta.dirname || process.cwd(),
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
  try {
    await action(ctx);
  } catch (e) {
    if (e instanceof LError) {
      // checkForExisting throws LError to short-circuit when an open PR exists
      // already; that's a normal exit, not a failure.
      return;
    }
    const detail = e instanceof Error ? e.stack || e.message : String(e);
    ctx.message(`ERROR: Action failed: ${detail}`);
    process.exitCode = 1;
  }
  ctx.message(`Saving cache with ${Object.keys(ctx.cache).length} items`);
  Fs.writeFileSync(cacheFilePath, JSON.stringify(ctx.cache));
  try {
    await saveCache([cacheFilePath], cacheKey);
  } catch (e) {
    ctx.message(`WARNING: Failed to save cache: ${e instanceof Error ? e.message : String(e)}`);
  }
})();
