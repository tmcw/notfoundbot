import {test} from "tap";
import sniff from "../src/sniff";

test("sniff - redirect to https", async (t) => {
  t.equal((await sniff("http://macwright.com")).status, "upgrade");
  t.equal((await sniff("http://jamesbridle.com")).status, "upgrade");
});

test("sniff - error", async (t) => {
  const res = await sniff("ht:tp://macwright.com");
  t.equal(res.status, "error");
});
