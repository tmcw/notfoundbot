const Url = require("url");
const Https = require("https");
const Http = require("http");

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
        url: httpsEquivalent,
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
        url: httpsEquivalent,
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
