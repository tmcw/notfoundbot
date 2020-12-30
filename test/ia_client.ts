import { test } from "tap";
import { queryIA, dateFromFilename, formatDate } from "../src/query_ia";
import { testContext, getTestFiles } from "./helpers";

test("dateFromFilename", async (t) => {
  t.same(formatDate(dateFromFilename("2000-01-01-foo")), "20000101000000");
});

test("formatDate", async (t) => {
  t.same(formatDate(new Date(2000, 0, 2)), "20000102000000");
});

test("queryIA with no groups", async (t) => {
  const ctx = testContext();

  const groups = getTestFiles(ctx);
  t.same((await queryIA(groups)).results.length, 3);
});
