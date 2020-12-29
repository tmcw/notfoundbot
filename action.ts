import {action} from "./"
import {getOctokit, context} from "@actions/github";
import * as cacheUtils from "@actions/cache";

const toolkit = getOctokit(process.env.GITHUB_TOKEN!);

action({
  toolkit,
  context,
  cacheUtils
})
