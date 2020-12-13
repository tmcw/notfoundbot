import { test } from "tap";
import sniff from "./sniff";

test("sniff - redirect to https", async (t) => {
  const res = await sniff("http://macwright.com");
  t.equal(res.status, "upgrade");
});

test("sniff - error", async (t) => {
  const res = await sniff("ht:tp://macwright.com");
  t.equal(res.status, "error");
});
