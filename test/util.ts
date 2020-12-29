import {test} from "tap";
import {shouldScan} from "../src/util";

test("shouldScan", async (t) => {
  t.equal(shouldScan("data://foo"), false);
  t.equal(shouldScan("https://macwright.com"), false);
  t.equal(shouldScan("http://macwright.com"), true);
});
