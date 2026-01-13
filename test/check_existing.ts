import Nock from "nock";
import { test } from "tap";
import { checkForExisting } from "../src/check_existing.js";
import { testContext } from "./helpers.js";

test("checkForExisting", async (t) => {
  const ctx = testContext();
  Nock("https://api.github.com")
    .get("/repos/foo/bar/issues?labels=notfoundbot")
    .reply(200, []);
  t.equal(await checkForExisting(ctx), undefined);
});

test("checkForExisting - with existing", async (t) => {
  const ctx = testContext();
  Nock("https://api.github.com")
    .get("/repos/foo/bar/issues?labels=notfoundbot")
    .reply(200, [
      {
        pull_request: {
          html_url: "http://foo.com",
        },
      },
    ]);
  await t.rejects(checkForExisting(ctx));
  t.same(ctx.messages, [
    `Skipping notfoundbot because a pull request already exists
http://foo.com`,
  ]);
});
