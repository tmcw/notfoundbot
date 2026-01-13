import Nock from "nock";
import { test } from "tap";
import { queryIA, formatDate } from "../src/query_ia.js";
import { testContext, getTestFiles } from "./helpers.js";

test("formatDate", async (t) => {
  t.same(formatDate(new Date(2000, 0, 2)), "20000102000000");
});

test("queryIA with no groups", async (t) => {
  const ctx = testContext();

  Nock("https://archive.org")
    .post("/wayback/available")
    .reply(200, { results: [1, 2, 3] });

  const groups = getTestFiles(ctx);
  t.same((await queryIA(groups)).results.length, 3);
});
