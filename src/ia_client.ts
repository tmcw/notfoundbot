import Http from "http";
import { IAResults } from "../types";

// https://github.com/internetarchive/internetarchivebot/blob/master/app/src/Core/APII.php#L2429

const ENDPOINT = `http://archive.org/wayback/available`;
const HEADERS = {
  "Wayback-Api-Version": 2,
};

function encodeURLs(urls: string[]) {
  return urls
    .map(
      (url, i) =>
        `url=${url}&closest=before&statuscodes=200&statuscodes=203&statuscodes=206&tag=${i}`
    )
    .join("\n");
}

export function queryIA(urls: string[]): Promise<IAResults> {
  return new Promise((resolve, reject) => {
    function handleResponse(res: Http.IncomingMessage) {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve(JSON.parse(body));
      });
    }

    const req = Http.request(
      ENDPOINT,
      {
        method: "POST",
        headers: HEADERS,
      },
      handleResponse
    );
    req.on("error", (e) => {
      reject(e);
    });
    req.write(encodeURLs(urls));
    req.end();
  });
}
