import { test } from "tap";
import { sniff, checkGroups } from "../src/check_groups";
import Path from "path";
import { toLFile, groupFiles } from "../src/util";
import { testContext } from "./helpers";

const lFile = toLFile(
  Path.join(__dirname, "./fixtures/example.md"),
  "fixtures/example.md"
);

test("sniff - redirect to https", async (t) => {
  t.equal((await sniff("http://macwright.com")).status, "upgrade");
  t.equal((await sniff("http://jamesbridle.com")).status, "upgrade");
});

test("sniff - error", async (t) => {
  const res = await sniff("ht:tp://macwright.com");
  t.equal(res.status, "error");
});

test("checkGroups", async (t) => {
  const ctx = testContext();
  const groups = groupFiles([lFile]);
  await checkGroups(ctx, groups);
  t.same(Array.from(groups.values())[0].status?.status, "ok");
});
