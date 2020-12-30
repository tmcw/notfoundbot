import { test } from "tap";
import Fs from "fs";
import Path from "path";
import { getCache } from "../src/get_cache";
import { testContext } from "./helpers";

test("getCache", async (t) => {
  const ctx = testContext();
  await getCache(ctx, ".test");
  t.same(ctx.cache, {});
});

test("getCache with an entry", async (t) => {
  const ctx = testContext();
  const cachePath = Path.join(ctx.cwd, ".notfoundbot");
  const cacheData = {
    "http://google.com": Date.now(),
  };
  Fs.writeFileSync(cachePath, JSON.stringify(cacheData));
  await getCache(ctx, cachePath);
  t.same(ctx.cache, cacheData);
});

test("getCache with an expired entry", async (t) => {
  const ctx = testContext();
  const cachePath = Path.join(ctx.cwd, ".notfoundbot");
  const cacheData = {
    "http://expired.com": Date.now() - 10e10,
  };
  Fs.writeFileSync(cachePath, JSON.stringify(cacheData));
  await getCache(ctx, cachePath);
  t.same(ctx.cache, {});
});
