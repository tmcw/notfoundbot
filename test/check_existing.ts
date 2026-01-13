import { test } from "tap";
import { checkForExisting } from "../src/check_existing.js";
import { testContext, createMockFetch } from "./helpers.js";

test("checkForExisting", async (t) => {
  const mock = createMockFetch();
  mock.get("https://api.github.com/repos/foo/bar/issues?labels=notfoundbot", []);
  t.teardown(() => mock.hardReset());

  const ctx = testContext("_posts", mock);
  t.equal(await checkForExisting(ctx), undefined);
});

test("checkForExisting - with existing", async (t) => {
  const mock = createMockFetch();
  mock.get("https://api.github.com/repos/foo/bar/issues?labels=notfoundbot", [
    {
      pull_request: {
        html_url: "http://foo.com",
      },
    },
  ]);
  t.teardown(() => mock.hardReset());

  const ctx = testContext("_posts", mock);
  await t.rejects(checkForExisting(ctx));
  t.same(ctx.messages, [
    `Skipping notfoundbot because a pull request already exists
http://foo.com`,
  ]);
});
