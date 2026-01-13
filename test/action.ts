import Nock from "nock";
import Fs from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "tap";
import { action } from "../index.js";
import { testContext } from "./helpers.js";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

test("action", async (t) => {
  Nock("https://api.github.com")
    .persist()
    .get("/repos/foo/bar/issues?labels=notfoundbot")
    .reply(200, []);

  Nock("https://api.github.com")
    .persist()
    .get("/repos/foo/bar")
    .reply(200, { default_branch: "main" });

  Nock("https://api.github.com")
    .persist()
    .get("/repos/foo/bar/git/ref/heads%2Fmain")
    .reply(200, { object: { sha: "deadbeef" } });

  Nock("https://api.github.com")
    .persist()
    .post("/repos/foo/bar/git/refs")
    .reply(200, {});

  Nock("https://api.github.com")
    .persist()
    .get(
      "/repos/foo/bar/contents/_posts%2F2020-01-01-example.md?ref=refs%2Fheads%2Ftest-branch"
    )
    .reply(200, { sha: "abcd" });

  Nock("https://api.github.com")
    .persist()
    .put("/repos/foo/bar/contents/_posts%2F2020-01-01-example.md")
    .reply(200, {});

  Nock("https://api.github.com")
    .persist()
    .post("/repos/foo/bar/pulls")
    .reply(200, {});

  Nock("https://api.github.com")
    .persist()
    .post("/repos/foo/bar/issues//labels")
    .reply(200, {});

  Nock("https://google.com").persist().get("/").reply(200, []);
  Nock("https://yahoo.com").persist().get("/").reply(200, []);
  Nock("https://foo.com").persist().get("/").reply(200, []);

  const ctx = testContext();

  const gitPath = "_posts/2020-01-01-example.md";
  const dest = Path.join(ctx.cwd, gitPath);
  Fs.copyFileSync(Path.join(__dirname, "./fixtures/example.md"), dest);

  const updatedFiles = await action(ctx);
  t.same(ctx.messages[0], "1 files detected");
  t.same(updatedFiles.length, 1);
});
