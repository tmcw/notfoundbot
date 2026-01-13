import { sniff } from "./src/check_links.js";

// Usage: tsx cli.ts <URL>

(async function () {
  const exceptions = process.env.EXCEPTIONS?.split(' ') ?? []
  console.log(await sniff(process.argv[2], exceptions));
})();
