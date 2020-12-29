import { test } from "tap";
import { getBody, getTitle } from "../src/suggest_changes";
import { testContext } from "./helpers";

test("getTitle", async (t) => {
  const ctx = testContext();
  t.equal(getTitle(ctx), `🔗 Linkrot updates with 0 SSL Upgrades`);
});

test("getBody", async (t) => {
  const ctx = testContext();
  t.equal(
    getBody(ctx),
    `#### Stats

- 0 URLs detected
- 0 URLs skipped because of the cache
- 0 URLs scanned
`
  );
});
