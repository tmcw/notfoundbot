const fs = require("fs");
const Url = require("url");
const path = require("path");
const got = require("got");
const prompts = require("prompts");
const Remark = require("remark");
const { selectAll } = require("unist-util-select");
const frontmatter = require("remark-frontmatter");
const MagicString = require("magic-string");

// From https://github.com/sindresorhus/is-absolute-url
function isAbsoluteUrl(url) {
  if (/^[a-zA-Z]:\\/.test(url)) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
}

function shouldScan(url) {
  const parts = Url.parse(url);
  // Bloomberg redirects to a paywall
  if (parts.host === "www.bloomberg.com") {
    return false;
  }
  if (parts.scheme === "dat://") {
    return false;
  }
  return true;
}

function gatherFiles() {
  const BASE = "./_posts";
  const files = fs.readdirSync(BASE).filter((f) => f.endsWith(".md"));
  const list = [];
  for (let f of files) {
    const filename = path.join(BASE, f);
    const text = fs.readFileSync(filename, "utf8");
    const remark = Remark().use(frontmatter, "yaml");
    const ast = remark.parse(text);
    const links = selectAll("link", ast);
    const externalLinks = links.filter(
      (link) => isAbsoluteUrl(link.url) && shouldScan(link.url)
    );
    list.push({
      filename,
      ast,
      text,
      externalLinks,
    });
  }
  return list;
}

async function testUrl(url) {
  try {
    const resp = await got.head(url, { timeout: 2000 });
    if (resp.url !== url) {
      return [url, [Date.now(), "redirect", resp.url]];
    } else if (resp.status >= 400) {
      return [url, [Date.now(), "error", resp.status]];
    } else {
      return [url, [Date.now(), "ok"]];
    }
  } catch (e) {
    return [url, [Date.now(), "error"]];
  }
}

(async function () {
  const cache = fs.existsSync(".linkrot.json")
    ? new Map(JSON.parse(fs.readFileSync(".linkrot.json", "utf8")))
    : new Map();

  const files = gatherFiles();

  const urls = new Set();
  const urlReferences = new Map();
  for (let file of files) {
    for (let link of file.externalLinks) {
      urls.add(link.url);
      urlReferences.set(
        link.url,
        (urlReferences.get(link.url) || []).concat(file.filename)
      );
    }
  }

  const total_urls = urls.size;

  let cache_purges = 0;

  for (let [url, val] of cache) {
    const ttl = 1000 * 60 * 60 * 24 * 7;
    if (Date.now() - val[0] > ttl) {
      cache.delete(url);
      cache_purges++;
    }
  }

  for (let url of urls) {
    if (cache.has(url)) {
      urls.delete(url);
    }
  }

  console.log(
    `Checking ${urls.size} URLs (${
      total_urls - urls.size
    } cached, ${cache_purges} cache entries expired)`
  );

  function replace(a, b) {
    for (let f of urlReferences.get(a)) {
      const text = fs.readFileSync(f, "utf8");
      const s = new MagicString(text);
      const remark = Remark().use(frontmatter, "yaml");
      const ast = remark.parse(text);
      const links = selectAll("link", ast);
      for (let link of links) {
        if (link.url === a) {
          link.url = b;
          s.overwrite(
            link.position.start.offset,
            link.position.end.offset,
            remark.stringify(link)
          );
        }
      }
      fs.writeFileSync(f, s.toString());
    }
  }

  for (let url of [...urls].reverse()) {
    const result = await testUrl(url);
    switch (result[1][1]) {
      case "ok":
        process.stdout.write(".");
        cache.set(result[0], result[1]);
        fs.writeFileSync(".linkrot.json", JSON.stringify([...cache.entries()]));
        // ignore
        break;
      case "redirect":
        const orig = Url.parse(result[0]);
        orig.protocol = "https:";
        let value = false;
        const httpsized = Url.format(orig);
        if (httpsized !== result[1][2]) {
          value = (
            await prompts({
              type: "confirm",
              name: "value",
              message: `redirect ${result[0]} to ${result[1][2]}?`,
            })
          ).value;
        } else {
          value = true;
        }
        if (value) {
          replace(result[0], result[1][2]);
          cache.set(result[1][2], [Date.now(), "ok"]);
          fs.writeFileSync(
            ".linkrot.json",
            JSON.stringify([...cache.entries()])
          );
        }
        break;
      case "error":
        process.stdout.write("\n");
        if (result[1][2]) {
          // console.log(`error: ${url}, status ${result[1][2]}`);
        } else {
          // console.log(result[1]);
          console.log(`error: ${url}`);
        }
        break;
    }
  }

  fs.writeFileSync(".linkrot.json", JSON.stringify([...cache.entries()]));
})();
