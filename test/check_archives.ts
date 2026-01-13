import { test } from "tap";
import { checkArchives } from "../src/check_archives.js";
import { testContext, getTestFiles } from "./helpers.js";
import type { IAResults } from "../types.js";
import Nock from "nock";

test("checkArchives - found", async (t) => {
  const ctx = testContext();
  const groups = getTestFiles(ctx);

  groups[0].status = {
    status: "error",
  };

  const fakeResult: IAResults = {
    results: [
      {
        url: "http://google.com/",
        tag: "0",
        archived_snapshots: {
          closest: {
            url: "http://archive.org/http://google.com/",
            status: "ok",
            timestamp: "1",
            available: true,
          },
        },
      },
    ],
  };

  Nock("https://archive.org").post("/wayback/available").reply(200, fakeResult);
  await checkArchives(groups);
  t.same(groups[0].status, {
    status: "archive",
    to: "https://archive.org/http://google.com/",
  });
});

test("checkArchives - not found", async (t) => {
  const ctx = testContext();
  const groups = getTestFiles(ctx);

  groups[0].status = {
    status: "error",
  };

  const fakeResult: IAResults = {
    results: [
      {
        url: "http://google.com/",
        tag: "0",
        archived_snapshots: {
          closest: {
            url: "https://archived.com/google",
            status: "ok",
            timestamp: "1",
            available: false,
          },
        },
      },
    ],
  };

  Nock("https://archive.org").post("/wayback/available").reply(200, fakeResult);
  await checkArchives(groups);
  t.same(groups[0].status, {
    status: "error",
  });
});
