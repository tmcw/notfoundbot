const { test } = require("tap");
const sniff = require("./sniff");

test("sniff - correct https", async (t) => {
  const res = await sniff("https://macwright.com");
  t.equal(res.url, "https://macwright.com");
  t.equal(res.status, 200);
});

test("sniff - redirect to https", async (t) => {
  const res = await sniff("http://macwright.com");
  t.equal(res.url, "https://macwright.com/");
  t.equal(res.status, 301);
});
