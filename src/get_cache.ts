import Fs from "fs";
import {Cache} from "../types";

export function getCache(path: string): Cache {
  try {
    const c = JSON.parse(Fs.readFileSync(path, "utf8"));
    let flushedEntries = 0;
    for (let entry of c) {
      if (c[entry] < Date.now() - 100 * 60 * 60 * 24 * 14) {
        delete c[entry];
        flushedEntries++;
      }
    }
    if (flushedEntries) {
      console.log(`Flushed ${flushedEntries.toLocaleString()}`);
    }
    return c;
  } catch (e) {
    return {};
  }
}
