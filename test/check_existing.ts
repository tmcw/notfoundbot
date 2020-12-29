import Path from "path";
import Nock from "nock"
import Fs from "fs"
import {test} from "tap";
import Tempy from "tempy"
import {checkForExisting} from "../src/check_existing";
import {getOctokit, context} from "@actions/github";

test('checkForExisting', async t => {
  t.beforeEach((done) => {
    const tmp = Tempy.directory();
    Fs.mkdirSync(Path.join(tmp, '_posts'))

    process.env['GITHUB_REPOSITORY'] = 'foo/bar';
    process.env['GITHUB_EVENT_PATH'] = Path.join(__dirname, 'payload.json');
    process.env['GITHUB_TOKEN'] = '0000000000000000000000000000000000000000';
    process.env['GITHUB_WORKSPACE'] = tmp;

    done();
  });

  await t.test("checkForExisting", async (t) => {
    const toolkit = getOctokit(process.env.GITHUB_TOKEN!);

    Nock('https://api.github.com')
      .get('/repos/foo/bar/issues?labels=linkrot')
      .reply(200, [])
    const ctx = {
      toolkit,
      context,
      cacheUtils: {
        restoreCache: () => {},
        saveCache: () => {}
      }
    };

    t.equal(await checkForExisting(ctx), undefined)
  });

  await t.test("checkForExisting - with existing", async (t) => {
    const tmp = Tempy.directory();
    Fs.mkdirSync(Path.join(tmp, '_posts'))

    const toolkit = getOctokit(process.env.GITHUB_TOKEN!);
    Nock('https://api.github.com')
      .get('/repos/foo/bar/issues?labels=linkrot')
      .reply(200, [{
        pull_request: {
          html_url: "http://foo.com"
        }
      }])
    const ctx = {
      toolkit,
      context,
      cacheUtils: {
        restoreCache: () => {},
        saveCache: () => {}
      }
    };

    t.equal(await checkForExisting(ctx), `Skipping linkrot because a pull request already exists
http://foo.com`)
  });
})
