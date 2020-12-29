import Url from "url";
import Https from "https";
import Http from "http";
import pAll from "p-all";
import { LStatus, LContext, LURLGroup } from "../types";

const timeout = {
  timeout: 2000,
};

function cancelGet(
  url: string,
  lib: typeof Http | typeof Https
): Promise<Http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = lib.get(url, timeout, (res) => {
      resolve(res);
      req.destroy();
    });

    req.on("error", reject);
  });
}

export async function checkGroups(ctx: LContext, groups: LURLGroup[]) {
  return await pAll(
    groups.map((group) => {
      return async () => {
        group.status = await sniff(group.url);
        ctx.cache[group.url] = Date.now();
      };
    }),
    { concurrency: 10 }
  );
}

export async function sniff(url: string): Promise<LStatus> {
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

    if (httpsRes.statusCode! < 300 && httpRes.statusCode! < 300) {
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
}
