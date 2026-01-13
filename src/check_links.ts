import Url from "node:url";
import Https from "node:https";
import Http from "node:http";
import pAll from "p-all";
import { LStatus, LContext, LURLGroup } from "../types.js";

const ua =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.16; rv:84.0) Gecko/20100101 Firefox/84.0";

const getOptions = {
  timeout: 2000,
  headers: {
    "User-Agent": ua,
  },
};

// In an ideal world, we would use HEAD requests, but
// many sites don't handle them well or at all, so instead
// we issue GET requests but avoid reading their responses,
// and only harvesting the status code.
function cancelGet(
  url: string,
  lib: typeof Http | typeof Https
): Promise<Http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = lib.get(url, getOptions, (res) => {
      resolve(res);
      req.destroy();
    });

    req.on("error", reject);
  });
}

function predictedHttps(url: string) {
  return Url.format({
    ...Url.parse(url),
    protocol: "https:",
  });
}

async function sniffHttp(url: string): Promise<LStatus> {
  const httpsEquivalent = predictedHttps(url);
  try {
    const httpsRes = await cancelGet(httpsEquivalent, Https);

    if (httpsRes.statusCode! < 300) {
      return {
        status: "upgrade",
        to: httpsEquivalent,
      };
    }
  } catch (e) {}

  try {
    const httpRes = await cancelGet(url, Http);
    if (httpRes.statusCode! <= 400) {
      return {
        status: "ok",
      };
    }
    return {
      status: "error",
    };
  } catch (err) {
    return {
      status: "error",
    };
  }
}

async function sniffHttps(url: string): Promise<LStatus> {
  try {
    const httpsRes = await cancelGet(url, Https);

    if (httpsRes.statusCode! >= 400) {
      throw new Error(`Status code >= 400`);
    }

    return {
      status: "ok",
    };
  } catch (err) {
    const errorCode = (err as NodeJS.ErrnoException)?.code;
    if (errorCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      return {
        status: "ok",
      };
    }
    return {
      status: "error",
    };
  }
}

export async function checkLinks(ctx: LContext, groups: LURLGroup[]) {
  const exceptions = process.env.EXCEPTIONS?.split(' ') ?? [];

  return await pAll(
    groups.map((group) => {
      return async () => {
        group.status = await sniff(group.url, exceptions);
        ctx.cache[group.url] = Date.now();
        ctx.message(
          `Added ${group.url} to cache, now ${
            Object.keys(ctx.cache).length
          } items in cache`
        );
      };
    }),
    { concurrency: 10 }
  );
}

export async function sniff(url: string, exceptions: string[]): Promise<LStatus> {
  const parsed = Url.parse(url);

  const { protocol, host } = parsed;

  if (host && exceptions.includes(host)) {
    return {
      status: "ok",
    };
  }

  if (protocol === "http:") {
    return await sniffHttp(url);
  } else if (protocol === "https:") {
    return await sniffHttps(url);
  }

  throw new Error("Unsupported protcol");
}
