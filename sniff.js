const Url = require("url");
const Https = require("https");
const Http = require("http");

module.exports = function getRedirect(url) {
  return new Promise((resolve, reject) => {
    const lib = Url.parse(url).protocol === "http:" ? Http : Https;
    const req = lib.get(
      url,
      {
        timeout: 2000,
      },
      (res) => {
        if (res.statusCode >= 400) {
          resolve({
            status: "error",
          });
        } else if (res.headers.location && res.headers.location !== url) {
          resolve({
            status: "redirect",
            url: res.headers.location,
          });
        } else {
          resolve({
            status: "ok",
          });
        }

        req.destroy();
      }
    );

    req.on("error", reject);
  }).catch(() => {
    return { status: "error" };
  });
};
