import { test } from "tap";
import { getBody, getTitle } from "../src/suggest_changes";
import { testContext } from "./helpers";

test("getTitle", async (t) => {
  const ctx = testContext();
  t.equal(getTitle(ctx), `🔗 Linkrot: 0 fixes`);
});

test("getBody", async (t) => {
  const ctx = testContext();
  t.equal(
    getBody(ctx),
    `# Changes

- 0 links upgraded from HTTP to HTTPS
- 0 dead links relinked to the Internet Archive

---

- 0 URLs total
- Skipped 0 cached
- Skipped 0 mailto or data links
- Skipped 0 relative links
- 0 URLs scanned
`
  );
});
