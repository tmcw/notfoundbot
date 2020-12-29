import { LFile, LContext } from "../types";

export async function commitFile(
  lcontext: LContext,
  branch: string,
  file: LFile
) {
  const { context, toolkit } = lcontext;
  const message = file.replacements.join(", ");
  const ref = `refs/heads/${branch}`;
  const path = file.gitPath;

  const {
    data: { sha },
  } = await toolkit.repos.getContent({
    ...context.repo,
    ref,
    path,
  });

  await toolkit.repos.createOrUpdateFileContents({
    ...context.repo,
    path,
    branch,
    sha,
    message,
    content: Buffer.from(file.magicString.toString()).toString("base64"),
  });
}
