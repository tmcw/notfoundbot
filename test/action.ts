import nock from "nock";
import Fs from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "tap";
import { action } from "../index.js";
import { testContext } from "./helpers.js";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

test("action", async (t) => {
  t.teardown(() => nock.cleanAll());

  nock("https://api.github.com")
    .get("/repos/foo/bar/issues?labels=notfoundbot")
    .reply(200, []);

  nock("https://api.github.com")
    .get("/repos/foo/bar")
    .reply(200, { default_branch: "main" });

  nock("https://api.github.com")
    .get("/repos/foo/bar/git/ref/heads%2Fmain")
    .reply(200, { object: { sha: "deadbeef" } });

  nock("https://api.github.com")
    .post("/repos/foo/bar/git/refs")
    .reply(200, {});

  nock("https://api.github.com")
    .get("/repos/foo/bar/contents/_posts%2F2020-01-01-example.md?ref=refs%2Fheads%2Ftest-branch")
    .reply(200, { sha: "abcd" });

  nock("https://api.github.com")
    .put("/repos/foo/bar/contents/_posts%2F2020-01-01-example.md")
    .reply(200, {});

  nock("https://api.github.com")
    .post("/repos/foo/bar/pulls")
    .reply(200, { number: 1 });

  nock("https://api.github.com")
    .post("/repos/foo/bar/issues/1/labels")
    .reply(200, {});

  nock("https://google.com").get("/").reply(200, []);
  nock("https://yahoo.com").get("/").reply(200, []);
  nock("https://foo.com").get("/").reply(200, []);

  const ctx = testContext();

  const gitPath = "_posts/2020-01-01-example.md";
  const dest = Path.join(ctx.cwd, gitPath);
  Fs.copyFileSync(Path.join(__dirname, "./fixtures/example.md"), dest);

  const updatedFiles = await action(ctx);
  t.same(ctx.messages[0], "1 files detected");
  t.same(updatedFiles.length, 1);
});
