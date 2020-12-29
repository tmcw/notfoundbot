import { test } from "tap";
import { sniff, sniffHttp, sniffHttps, checkGroups } from "../src/check_groups";
import Path from "path";
import { toLFile, groupFiles } from "../src/util";
import { testContext } from "./helpers";
import Nock from "nock";

const lFile = toLFile(
  Path.join(__dirname, "./fixtures/example.md"),
  "fixtures/example.md"
);

test("sniffHttp - ok, no upgrade", async (t) => {
  Nock("http://a.com").get("/").reply(200, "ok");
  t.equal((await sniffHttp("http://a.com/")).status, "ok");
});

test("sniffHttp - ok, no upgrade", async (t) => {
  Nock("https://a.com").get("/").reply(200, "ok");
  t.equal((await sniffHttp("http://a.com/")).status, "upgrade");
});

test("sniffHttp - not found", async (t) => {
  Nock("http://a.com").get("/").reply(404, "ok");
  t.equal((await sniffHttp("http://a.com/")).status, "error");
});

test("sniffHttps - ok", async (t) => {
  Nock("https://a.com").get("/").reply(200, "ok");
  t.equal((await sniffHttps("https://a.com/")).status, "ok");
});

test("sniffHttps - not found", async (t) => {
  Nock("https://a.com").get("/").reply(400, "ok");
  t.equal((await sniffHttps("https://a.com/")).status, "error");
});

test("sniff - redirect to https", async (t) => {
  t.equal((await sniff("http://macwright.com")).status, "upgrade");
  t.equal((await sniff("http://jamesbridle.com")).status, "upgrade");
});

test("sniff - error", async (t) => {
  t.rejects(sniff("ht:tp://macwright.com"));
});

test("checkGroups", async (t) => {
  const ctx = testContext();
  const groups = groupFiles(ctx, [lFile]);
  await checkGroups(ctx, groups);
  t.same(Array.from(groups.values())[0].status?.status, "ok");
});
