import Url from "url";
import Https from "https";
import Http from "http";

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

type Result =
  | {
      status: "upgrade";
      to: string;
    }
  | {
      status: "error";
    }
  | { status: "ok" };

export default async function getRedirect(url: string): Promise<Result> {
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
