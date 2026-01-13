import { LFile, LContext } from "../types.js";

export async function commitFile(
  lcontext: LContext,
  branch: string,
  file: LFile
) {
  const { context, toolkit } = lcontext;
  const message = file.replacements.join(", ");
  const ref = `refs/heads/${branch}`;
  const path = file.gitPath;

  const { data } = await toolkit.rest.repos.getContent({
    ...context.repo,
    ref,
    path,
  });

  // getContent returns an array for directories, single object for files
  const sha = Array.isArray(data) ? undefined : data.sha;

  await toolkit.rest.repos.createOrUpdateFileContents({
    ...context.repo,
    path,
    branch,
    sha: sha as string,
    message,
    content: Buffer.from(file.magicString.toString()).toString("base64"),
  });
}
