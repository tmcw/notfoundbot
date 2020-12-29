import Nock from "nock"
import {test} from "tap";
import {action} from "../index";
import {testContext} from "./helpers";

test("action", async (_t) => {
  Nock('https://api.github.com')
    .persist()
    .get('/repos/foo/bar/issues?labels=linkrot')
    .reply(200, [])

  await action(testContext())
});
