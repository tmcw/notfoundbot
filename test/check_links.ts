import { test } from "tap";
import { sniff, checkLinks } from "../src/check_links";
import { testContext, getTestFiles } from "./helpers";
import Nock from "nock";

test("sniff - ok, no upgrade", async (t) => {
  Nock("http://a.com").get("/").reply(200, "ok");
  t.equal((await sniff("http://a.com/")).status, "ok");
});

test("sniff - ok, no upgrade", async (t) => {
  Nock("https://a.com").get("/").reply(200, "ok");
  t.equal((await sniff("http://a.com/")).status, "upgrade");
});

test("sniff - not found", async (t) => {
  Nock("http://a.com").get("/").reply(404, "ok");
  t.equal((await sniff("http://a.com/")).status, "error");
});

test("sniff - ok", async (t) => {
  Nock("https://a.com").get("/").reply(200, "ok");
  t.equal((await sniff("https://a.com/")).status, "ok");
});

test("sniff - not found", async (t) => {
  Nock("https://a.com").get("/").reply(400, "ok");
  t.equal((await sniff("https://a.com/")).status, "error");
});

test("sniff - redirect to https", async (t) => {
  t.equal((await sniff("http://macwright.com")).status, "upgrade");
  t.equal((await sniff("http://jamesbridle.com")).status, "upgrade");
});

test("sniff - error", async (t) => {
  t.rejects(sniff("ht:tp://macwright.com"));
});

test("checkLinks", async (t) => {
  const ctx = testContext();
  const groups = getTestFiles(ctx);
  await checkLinks(ctx, groups);
  t.same(Array.from(groups.values())[0].status?.status, "ok");
});
