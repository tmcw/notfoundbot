import Fs from "fs";
import { LContext } from "../types";

export async function getCache(ctx: LContext, cacheFilePath: string) {
  try {
    const c = JSON.parse(Fs.readFileSync(cacheFilePath, "utf8"));
    let flushedEntries = 0;
    for (let entry of Object.keys(c)) {
      if (c[entry] < Date.now() - 100 * 60 * 60 * 24 * 14) {
        delete c[entry];
        flushedEntries++;
      }
    }
    if (flushedEntries) {
      ctx.messages.push(`Flushed ${flushedEntries.toLocaleString()}`);
    }
    ctx.cache = c;
  } catch (e) {}
}
