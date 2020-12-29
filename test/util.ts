import { test } from "tap";
import Fs from "fs";
import Path from "path";
import {
  shouldScan,
  gatherFiles,
  toLFile,
  replaceFile,
  groupFiles,
  updateFiles,
} from "../src/util";
import { testContext } from "./helpers";

test("shouldScan", async (t) => {
  t.equal(shouldScan("data://foo"), false);
  t.equal(shouldScan("https://macwright.com"), false);
  t.equal(shouldScan("http://macwright.com"), true);
});

const lFile = toLFile(
  Path.join(__dirname, "./fixtures/example.md"),
  "fixtures/example.md"
);

test("toLFile", async (t) => {
  t.same(lFile.replacements, []);
});

test("groupFiles", async (t) => {
  const ctx = testContext();
  const groups = groupFiles(ctx, [lFile]);
  t.same(groups.length, 3);
});

test("updateFiles", async (t) => {
  const ctx = testContext();
  const updates = updateFiles(ctx, groupFiles(ctx, [lFile]));
  t.same(updates.length, 0);
});

test("replaceFile", async (t) => {
  replaceFile(lFile, "http://google.com", "https://google.com");
  t.same(lFile.replacements, ["http://google.com → https://google.com"]);
});

test("gatherFiles", async (t) => {
  await t.test("empty case", async (t) => {
    const ctx = testContext();
    t.same(gatherFiles(ctx), []);
  });

  await t.test("single file", async (t) => {
    const ctx = testContext();
    Fs.copyFileSync(
      Path.join(__dirname, "./fixtures/example.md"),
      Path.join(ctx.cwd, "_posts", "example.md")
    );
    const result = gatherFiles(ctx);

    t.same(result.length, 1);
  });
});
