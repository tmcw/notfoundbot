import { sniff } from "./src/check_links";

// Usage: ts-node cli.ts <URL>

(async function () {
  console.log(await sniff(process.argv[2]));
})();
