import { test } from "tap";
import { replaceLinks, updateFiles } from "../src/util";
import { testContext, getTestFiles } from "./helpers";

test("groupFiles", async (t) => {
  const ctx = testContext();
  const groups = getTestFiles(ctx);
  t.same(groups.length, 3);
});

test("updateFiles", async (t) => {
  const ctx = testContext();
  const updates = updateFiles(ctx, getTestFiles(ctx));
  t.same(updates.length, 0);
});
