#!/usr/bin/env node

import fs from "fs";
import pAll from "p-all";
import sniff from "./src/sniff";
import {FileChanges, LContext} from "./types";
import {replaceFile, gatherFiles} from "./src/util";
import {getCache} from "./src/get_cache";
import {suggestChanges} from "./src/suggest_changes";
import {checkForExisting} from "./src/check_existing";


function replace(
  a: string,
  b: string,
  urlReferences: Map<string, FileChanges[]>
) {
  let results = [];
  for (let file of urlReferences.get(a)!) {
    replaceFile(file, a, b);
    results.push(file);
  }
  return results;
}

export async function action(ctx: LContext) {
  const CACHE_FILE = ".linkrot-cache";

  const {cacheUtils} = ctx;


  const existingMessage = await checkForExisting(ctx);

  if (existingMessage) {
    console.log(existingMessage);
    return;
  }

  await cacheUtils.restoreCache([CACHE_FILE], "linkrot");

  const cache = getCache(CACHE_FILE);
  const files = gatherFiles();
  const urls = new Set<string>();
  const urlReferences = new Map<string, FileChanges[]>();
  let cacheSkipped = 0;

  for (let file of files) {
    for (let link of file.externalLinks) {
      if (link.url in cache) {
        cacheSkipped++;
        continue;
      }
      urls.add(link.url);
      urlReferences.set(
        link.url,
        (urlReferences.get(link.url) || []).concat(file)
      );
    }
  }

  const subset = Array.from(urls).reverse().slice(0, 100);
  console.log(`Checking ${subset.length} URLs`);

  let replacements = new Set<FileChanges>();
  let upgrades = 0;

  await pAll(
    subset.map((url) => {
      return async () => {
        console.log(`Checking ${url}`);
        const result = await sniff(url);
        cache[url] = Date.now();
        switch (result.status) {
          case "upgrade":
            upgrades++;
            for (let file of replace(url, result.to, urlReferences)) {
              replacements.add(file);
            }
            break;
          case "error":
            break;
        }
      };
    }),
    {concurrency: 10}
  );

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));

  try {
    await cacheUtils.saveCache([CACHE_FILE], "linkrot");
  } catch (e) {
    console.error("ERROR: Failed to save cache!");
  }

  if (replacements.size == 0) {
    return console.log("No changes to suggest");
  } else {
    console.log(`Creating PR with ${replacements.size} changes`);
  }

  await suggestChanges(ctx,
    Array.from(replacements),
    `- ${urls.size.toLocaleString()} URLs detected
- ${subset.length.toLocaleString()} checked in this run
- ${Object.keys(cache).length.toLocaleString()} URLs in cache
- ${cacheSkipped.toLocaleString()} skipped because of the cache
- ${upgrades.toLocaleString()} upgraded`
  );
}
