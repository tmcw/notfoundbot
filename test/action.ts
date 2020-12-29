import Path from "path";
import Nock from "nock"
import Fs from "fs"
import {test} from "tap";
import Tempy from "tempy"
import {action} from "../index";
import {getOctokit, context} from "@actions/github";

test("action", async (_t) => {
  const tmp = Tempy.directory();
  Fs.mkdirSync(Path.join(tmp, '_posts'))

  process.env['GITHUB_REPOSITORY'] = 'foo/bar';
  process.env['GITHUB_EVENT_PATH'] = Path.join(__dirname, 'payload.json');
  process.env['GITHUB_TOKEN'] = '0000000000000000000000000000000000000000';
  process.env['GITHUB_WORKSPACE'] = tmp;

  const toolkit = getOctokit(process.env.GITHUB_TOKEN!);

  Nock('https://api.github.com')
    .persist()
    .get('/repos/foo/bar/issues?labels=linkrot')
    .reply(200, [])

  await action({
    toolkit,
    context,
    cacheUtils: {
      restoreCache: () => {},
      saveCache: () => {}
    }
  })
});
