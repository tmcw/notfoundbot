const test = require("ava");
const sniff = require("./sniff");

test("sniff - correct https", async (t) => {
  const res = await sniff("https://macwright.com");
  t.is(res.url, "https://macwright.com");
  t.is(res.status, 200);
  t.pass();
});

test("sniff - redirect to https", async (t) => {
  const res = await sniff("http://macwright.com");
  t.is(res.url, "https://macwright.com/");
  t.is(res.status, 301);
  t.pass();
});
