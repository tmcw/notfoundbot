#!/usr/bin/env node
module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 441:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

const fs = __webpack_require__(747);
const Url = __webpack_require__(835);
const Path = __webpack_require__(622);
const isAbsoluteUrl = __webpack_require__(807);
const Remark = __webpack_require__(470);
const pAll = __webpack_require__(862);
const { selectAll } = __webpack_require__(420);
const frontmatter = __webpack_require__(822);
const MagicString = __webpack_require__(46);
const { getOctokit, context } = __webpack_require__(647);
const sniff = __webpack_require__(514);

const dry = process.env.DRY_RUN;
const toolkit = getOctokit(process.env.GITHUB_TOKEN);

function replace(a, b, urlReferences) {
  let results = [];
  for (let file of urlReferences.get(a)) {
    let text = file.text;
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
    file.text = s.toString();
    file.replacements.push(`${a} → ${b}`);
    results.push(file);
  }
  return results;
}

async function suggestChanges(replacements) {
  const branch = `linkrot-${new Date()
    .toLocaleDateString()
    .replace(/\//g, "-")}`;

  const {
    data: { default_branch },
  } = await toolkit.repos.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });

  const {
    data: {
      object: { sha },
    },
  } = await toolkit.git.getRef({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: `heads/${default_branch}`,
  });

  // throws HttpError if branch already exists.
  try {
    await toolkit.repos.getBranch({
      ...context.repo,
      branch,
    });
  } catch (error) {
    if (error.name === "HttpError" && error.status === 404) {
      const branchRef = `refs/heads/${branch}`;
      if (dry) {
        console.log(`DRY: creating ref: ${branchRef}`);
      } else {
        await toolkit.git.createRef({
          ...context.repo,
          ref: branchRef,
          sha,
        });
      }
    } else {
      throw Error(error);
    }
  }

  await createRedirectCommits(toolkit, branch, replacements);
  const title = `🔗 Linkrot: updating ${replacements.length} links`;

  if (dry) {
    console.log(`DRY: creating pull: ${title}`);
  } else {
    const {
      data: { number },
    } = await toolkit.pulls.create({
      ...context.repo,
      title,
      head: branch,
      base: default_branch,
    });

    await toolkit.issues.addLabels({
      ...context.repo,
      issue_number: number,
      labels: ["linkrot"],
    });
  }
}

async function createRedirectCommits(toolkit, branch, replacements) {
  for (let file of replacements) {
    const message = file.replacements.join(", ");
    const ref = `refs/heads/${branch}`;
    const path = file.gitPath;

    if (dry) {
      console.log(`DRY: updating ${file.filename} with message: ${message}`);
    } else {
      console.log("Finding existing file", {
        ...context.repo,
        ref,
        path,
      });
      const existing = await toolkit.repos.getContent({
        ...context.repo,
        ref,
        path,
      });

      await toolkit.repos.createOrUpdateFileContents({
        ...context.repo,
        path,
        branch,
        sha: existing.data.sha,
        message,
        content: Buffer.from(file.text).toString("base64"),
      });
    }
  }
}

function shouldScan(url) {
  const parts = Url.parse(url);
  return parts.protocol === "http:";
}

function gatherFiles() {
  const BASE = Path.join(process.env.GITHUB_WORKSPACE || __dirname, "_posts");
  const files = fs.readdirSync(BASE).filter((f) => f.endsWith(".md"));
  const list = [];
  for (let f of files) {
    // console.log(`Scanning, ${f}`);
    const filename = Path.join(BASE, f);
    const text = fs.readFileSync(filename, "utf8");
    const remark = Remark().use(frontmatter, "yaml");
    const ast = remark.parse(text);
    const links = selectAll("link", ast);
    const externalLinks = links.filter((link) => {
      return isAbsoluteUrl(link.url) && shouldScan(link.url);
    });
    list.push({
      filename,
      gitPath: Path.join("_posts", f),
      ast,
      text,
      externalLinks,
      replacements: [],
    });
  }
  return list;
}

(async function () {
  // const { data: pulls } = await toolkit.pulls.list({
  //   owner: context.repo.owner,
  //   repo: context.repo.repo,
  // });

  const files = gatherFiles();

  const urls = new Set();
  const urlReferences = new Map();
  for (let file of files) {
    for (let link of file.externalLinks) {
      urls.add(link.url);
      urlReferences.set(
        link.url,
        (urlReferences.get(link.url) || []).concat(file)
      );
    }
  }

  const subset = [...urls].reverse().slice(0, 100);
  console.log(`Checking ${subset.length} URLs`);

  let replacements = new Set();

  await pAll(
    subset.map((url) => {
      return async () => {
        console.log(`Checking ${url}`);
        const { status, to } = await sniff(url);
        switch (status) {
          case "upgrade":
            for (let file of replace(url, to, urlReferences)) {
              replacements.add(file);
            }
            break;
          case "error":
            break;
        }
      };
    }),
    { concurrency: 10 }
  );

  if (replacements.size == 0) {
    return console.log("No changes to suggest");
  } else {
    console.log(`Creating PR with ${replacements.size} changes`);
  }

  await suggestChanges([...replacements]);
})();


/***/ }),

/***/ 514:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Url = __webpack_require__(835);
const Https = __webpack_require__(211);
const Http = __webpack_require__(605);

const timeout = {
  timeout: 2000,
};

function cancelGet(url, lib) {
  return new Promise((resolve, reject) => {
    const req = lib.get(url, timeout, (res) => {
      resolve(res);
      req.destroy();
    });

    req.on("error", reject);
  });
}

module.exports = async function getRedirect(url) {
  const httpsEquivalent = Url.format({
    ...Url.parse(url),
    protocol: "https:",
  });
  try {
    const [httpRes, httpsRes] = await Promise.all([
      cancelGet(url, Http),
      cancelGet(httpsEquivalent, Https),
    ]);

    if (httpRes.headers.location === httpsEquivalent) {
      return {
        status: "upgrade",
        to: httpsEquivalent,
      };
    }

    if (
      httpsRes.statusCode < 300 &&
      httpRes.statusCode < 300 &&
      httpRes.headers.etag &&
      httpRes.headers.etag === httpsRes.headers.etag
    ) {
      return {
        status: "upgrade",
        to: httpsEquivalent,
      };
    }

    return {
      status: "ok",
    };
  } catch (err) {
    return {
      status: "error",
    };
  }
};


/***/ }),

/***/ 647:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 807:
/***/ ((module) => {

module.exports = eval("require")("is-absolute-url");


/***/ }),

/***/ 46:
/***/ ((module) => {

module.exports = eval("require")("magic-string");


/***/ }),

/***/ 862:
/***/ ((module) => {

module.exports = eval("require")("p-all");


/***/ }),

/***/ 470:
/***/ ((module) => {

module.exports = eval("require")("remark");


/***/ }),

/***/ 822:
/***/ ((module) => {

module.exports = eval("require")("remark-frontmatter");


/***/ }),

/***/ 420:
/***/ ((module) => {

module.exports = eval("require")("unist-util-select");


/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");;

/***/ }),

/***/ 605:
/***/ ((module) => {

"use strict";
module.exports = require("http");;

/***/ }),

/***/ 211:
/***/ ((module) => {

"use strict";
module.exports = require("https");;

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = require("path");;

/***/ }),

/***/ 835:
/***/ ((module) => {

"use strict";
module.exports = require("url");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__webpack_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(441);
/******/ })()
;