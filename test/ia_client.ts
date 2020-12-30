import { test } from "tap";
import { queryIA, dateFromFilename, formatDate } from "../src/ia_client";
import { toLFile, groupFiles } from "../src/util";
import { testContext } from "./helpers";
import Path from "path";

test("dateFromFilename", async (t) => {
  t.same(formatDate(dateFromFilename("2000-01-01-foo")), "20000101000000");
});

test("formatDate", async (t) => {
  t.same(formatDate(new Date(2000, 0, 2)), "20000102000000");
});

test("queryIA with no groups", async (t) => {
  const ctx = testContext();

  const lFile = toLFile(
    Path.join(__dirname, "./fixtures/example.md"),
    "fixtures/example.md"
  );

  const groups = groupFiles(ctx, [lFile]);
  t.same((await queryIA(groups)).results.length, 3);
});
