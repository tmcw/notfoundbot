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
          reject();
        } else {
          resolve({
            url: res.headers.location || url,
            status: res.statusCode,
          });
        }

        req.destroy();
      }
    );

    req.on("error", reject);
  });
};
