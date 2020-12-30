import Https from "https";
import Http from "http";
import Querystring from "querystring";
import { IAResults, LURLGroup } from "../types";

// https://github.com/internetarchive/internetarchivebot/blob/master/app/src/Core/APII.php#L2429

const ENDPOINT = `https://archive.org/wayback/available`;
const HEADERS = {
  "Wayback-Api-Version": 2,
};

function dateForGroup(group: LURLGroup) {
  const dates = Array.from(group.files)
    .map((file) => file.date)
    .filter(Boolean) as Date[];
  dates.sort((a, b) => +b - +a);
  if (dates.length) return dates[0];
}

export function formatDate(date: Date | undefined) {
  if (!date) return;
  // date( 'YmdHis', $time )
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}${m}${d}000000`;
}

function encodeURLs(groups: LURLGroup[]) {
  return Array.from(groups)
    .map((group, i) => {
      const firstDate = dateForGroup(group);
      return Querystring.stringify({
        url: group.url,
        timestamp: formatDate(firstDate),
        closest: "before",
        statuscodes: [200, 203, 206],
        tag: i,
      });
    })
    .join("\n");
}

export function queryIA(groups: LURLGroup[]): Promise<IAResults> {
  return new Promise((resolve, reject) => {
    function handleResponse(res: Http.IncomingMessage) {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(body);
        }
      });
    }

    const req = Https.request(
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
    req.write(encodeURLs(groups));
    req.end();
  });
}
