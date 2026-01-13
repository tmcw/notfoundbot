import Fs from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "tap";
import { toLFile } from "../src/to_lfile.js";
import { testContext } from "./helpers.js";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

test("toLFile - jekyll-style date", async (t) => {
  const ctx = testContext();
  const gitPath = "_posts/2020-01-01-example.md";
  const dest = Path.join(ctx.cwd, gitPath);
  Fs.copyFileSync(Path.join(__dirname, "./fixtures/example.md"), dest);
  const lfile = toLFile(dest, gitPath);

  t.ok(lfile);
  t.equal(lfile.date?.toISOString(), "2020-01-01T00:00:00.000Z");
});

test("toLFile - frontmatter date", async (t) => {
  const ctx = testContext();
  const gitPath = "_posts/2020-01-01-example.md";
  const dest = Path.join(ctx.cwd, gitPath);
  Fs.copyFileSync(
    Path.join(__dirname, "./fixtures/example-frontmatter-date.md"),
    dest
  );
  const lfile = toLFile(dest, gitPath);

  t.ok(lfile);
  t.equal(lfile.date?.toISOString(), "2012-04-06T00:00:00.000Z");
});

test("toLFile - frontmatter date in toml", async (t) => {
  const ctx = testContext();
  const gitPath = "_posts/2020-01-01-example.md";
  const dest = Path.join(ctx.cwd, gitPath);
  Fs.copyFileSync(
    Path.join(__dirname, "./fixtures/example-frontmatter-date-toml.md"),
    dest
  );
  const lfile = toLFile(dest, gitPath);

  t.ok(lfile);
  t.equal(lfile.date?.toISOString(), "2012-04-06T00:00:00.000Z");
});
