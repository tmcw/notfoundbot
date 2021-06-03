import { test } from "tap";
import { replaceLinks, updateFiles } from "../src/util";
import { testContext, getTestFiles } from "./helpers";

test("groupFiles", async (t) => {
  const ctx = testContext();
  const groups = getTestFiles(ctx);
  t.same(groups.length, 3);
});

test("custom directory", async (t) => {
  const ctx = testContext("custom-content-folder");
  const groups = getTestFiles(ctx);
  t.same(groups.length, 3);
});

test("updateFiles", async (t) => {
  const ctx = testContext();
  const updates = updateFiles(ctx, getTestFiles(ctx));
  t.same(updates.length, 0);
});

test("replaceLinks", async (t) => {
  const ctx = testContext();
  const groups = getTestFiles(ctx);
  const file = Array.from(groups[0].files)[0];
  replaceLinks(file, "http://google.com/", "http://test.com/");
  t.same(
    file.magicString.toString(),
    `---
title: Test
x: 2
x: 3
---

- [link](http://test.com/)
- [other link](http://foo.com/)
- [https link](https://yahoo.com/)
`
  );
});
