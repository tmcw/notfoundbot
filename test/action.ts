import Fs from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "tap";
import nock from "nock";
import { action } from "../index.js";
import { testContext, createMockFetch } from "./helpers.js";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

test("action", async (t) => {
  const mock = createMockFetch();

  // GitHub API mocks (uses fetch via octokit)
  mock.get("https://api.github.com/repos/foo/bar/issues?labels=notfoundbot", []);
  mock.get("https://api.github.com/repos/foo/bar", { default_branch: "main" });
  mock.get("https://api.github.com/repos/foo/bar/git/ref/heads%2Fmain", { object: { sha: "deadbeef" } });
  mock.post("https://api.github.com/repos/foo/bar/git/refs", {});
  mock.get("glob:https://api.github.com/repos/foo/bar/contents/*", { sha: "abcd" });
  mock.put("glob:https://api.github.com/repos/foo/bar/contents/*", {});
  mock.post("https://api.github.com/repos/foo/bar/pulls", { number: 1 });
  mock.post("https://api.github.com/repos/foo/bar/issues/1/labels", {});

  // Link checking mocks (uses Node http/https modules)
  nock("https://google.com").get("/").reply(200, []);
  nock("https://yahoo.com").get("/").reply(200, []);
  nock("https://foo.com").get("/").reply(200, []);

  t.teardown(() => {
    mock.hardReset();
    nock.cleanAll();
  });

  const ctx = testContext("_posts", mock);

  const gitPath = "_posts/2020-01-01-example.md";
  const dest = Path.join(ctx.cwd, gitPath);
  Fs.copyFileSync(Path.join(__dirname, "./fixtures/example.md"), dest);

  const updatedFiles = await action(ctx);
  t.same(ctx.messages[0], "1 files detected");
  t.same(updatedFiles.length, 1);
});
