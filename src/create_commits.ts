import {FileChanges, LContext} from "../types";

export async function createRedirectCommits(
  lcontext: LContext,
  branch: string,
  replacements: FileChanges[]
) {
  const {context, toolkit} = lcontext;
  for (let file of replacements) {
    const message = file.replacements.join(", ");
    const ref = `refs/heads/${branch}`;
    const path = file.gitPath;

    const existing = await toolkit.repos.getContent({
      ...context.repo,
      ref,
      path,
    });

    await toolkit.repos.createOrUpdateFileContents({
      ...context.repo,
      path,
      branch,
      sha: existing.data.sha,
      message,
      content: Buffer.from(file.text).toString("base64"),
    });
  }
}
