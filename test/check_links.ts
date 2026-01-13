import { test } from "tap";
import nock from "nock";
import { sniff, checkLinks } from "../src/check_links.js";
import { testContext, getTestFiles } from "./helpers.js";

test("sniff - ok, no upgrade", async (t) => {
  t.teardown(() => nock.cleanAll());
  nock("http://a.com").get("/").reply(200, "ok");
  t.equal((await sniff("http://a.com/", [])).status, "ok");
});

test("sniff - upgrade to https", async (t) => {
  t.teardown(() => nock.cleanAll());
  nock("https://a.com").get("/").reply(200, "ok");
  t.equal((await sniff("http://a.com/", [])).status, "upgrade");
});

test("sniff - not found", async (t) => {
  t.teardown(() => nock.cleanAll());
  nock("https://a.com").get("/").reply(404, "not found");
  nock("http://a.com").get("/").reply(404, "not found");
  t.equal((await sniff("http://a.com/", [])).status, "error");
});

test("sniff - ok https", async (t) => {
  t.teardown(() => nock.cleanAll());
  nock("https://a.com").get("/").reply(200, "ok");
  t.equal((await sniff("https://a.com/", [])).status, "ok");
});

test("sniff - leaf cert failed ignored and ok", async (t) => {
  t.teardown(() => nock.cleanAll());
  nock("https://a.com")
    .get("/")
    .replyWithError({ code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" });
  t.equal((await sniff("https://a.com/", [])).status, "ok");
});

test("sniff - https not found", async (t) => {
  t.teardown(() => nock.cleanAll());
  nock("https://a.com").get("/").reply(400, "bad request");
  t.equal((await sniff("https://a.com/", [])).status, "error");
});

test("sniff - redirect to https", async (t) => {
  t.teardown(() => nock.cleanAll());
  nock("https://macwright.com").get("/").reply(200, []);
  t.equal((await sniff("http://macwright.com", [])).status, "upgrade");
});

test("sniff - error on invalid protocol", async (t) => {
  t.rejects(sniff("ht:tp://macwright.com", []));
});

test("checkLinks", async (t) => {
  t.teardown(() => nock.cleanAll());
  nock("http://google.com").get("/").reply(200, []);
  nock("https://yahoo.com").get("/").reply(200, []);
  nock("http://foo.com").get("/").reply(200, []);
  const ctx = testContext();
  const groups = getTestFiles(ctx);
  await checkLinks(ctx, groups);
  t.same(Array.from(groups.values())[0].status?.status, "ok");
});
