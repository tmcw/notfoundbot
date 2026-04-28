import { test } from "tap";
import nock from "nock";
import { checkArchives } from "../src/check_archives.js";
import { testContext, getTestFiles } from "./helpers.js";
import type { IAResults } from "../types.js";

test("checkArchives - found", async (t) => {
  t.teardown(() => nock.cleanAll());

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

  nock("https://archive.org").post("/wayback/available").reply(200, fakeResult);
  await checkArchives(ctx, groups);
  t.same(groups[0].status, {
    status: "archive",
    to: "https://archive.org/http://google.com/",
  });
});

test("checkArchives - not found", async (t) => {
  t.teardown(() => nock.cleanAll());

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

  nock("https://archive.org").post("/wayback/available").reply(200, fakeResult);
  await checkArchives(ctx, groups);
  t.same(groups[0].status, {
    status: "error",
  });
});

test("checkArchives - 503 from Wayback Machine is logged, not thrown", async (t) => {
  t.teardown(() => nock.cleanAll());

  const ctx = testContext();
  const groups = getTestFiles(ctx);

  groups[0].status = {
    status: "error",
  };

  nock("https://archive.org")
    .post("/wayback/available")
    .reply(503, "<html><body><h1>503 Service Unavailable</h1></body></html>");

  await checkArchives(ctx, groups);
  t.same(groups[0].status, { status: "error" }, "status is unchanged");
  t.ok(
    ctx.messages.some((m) => m.startsWith("WARNING: Wayback Machine lookup failed")),
    "warning was logged"
  );
});
