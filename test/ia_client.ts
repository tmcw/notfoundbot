import { test } from "tap";
import { queryIA } from "../src/ia_client";

test("queryIA", async (t) => {
  const url = "http://thiswebsiteneverexisted.com";
  t.same(await queryIA([url]), {
    results: [
      {
        archived_snapshots: {},
        tag: "0",
        url,
      },
    ],
  });
});
