import {FileChanges, LContext} from "../types";
import {createRedirectCommits} from "./create_commits"

export async function suggestChanges(lcontext: LContext, replacements: FileChanges[], body: string) {

  const {context, toolkit} = lcontext;


  const branch = `linkrot-${new Date()
    .toLocaleDateString()
    .replace(/\//g, "-")}`;

  const {
    data: {default_branch},
  } = await toolkit.repos.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });

  const {
    data: {
      object: {sha},
    },
  } = await toolkit.git.getRef({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: `heads/${default_branch}`,
  });

  try {
    await toolkit.repos.getBranch({
      ...context.repo,
      branch,
    });
  } catch (error) {
    if (error.name === "HttpError" && error.status === 404) {
      const branchRef = `refs/heads/${branch}`;

      await toolkit.git.createRef({
        ...context.repo,
        ref: branchRef,
        sha,
      });
    } else {
      throw Error(error);
    }
  }

  await createRedirectCommits(lcontext, branch, replacements);
  const title = `🔗 Linkrot: updating ${replacements.length} links`;

  const {
    data: {number},
  } = await toolkit.pulls.create({
    ...context.repo,
    title,
    body,
    head: branch,
    base: default_branch,
  });

  await toolkit.issues.addLabels({
    ...context.repo,
    issue_number: number,
    labels: ["linkrot"],
  });
}
