import { LContext, LError } from "../types";

/**
 * If an existing PR has the linkrot tag,
 * print and return true to exit.
 */
export async function checkForExisting(ctx: LContext) {
  const { toolkit, context } = ctx;
  const { data: existingLinkrotIssues } = await toolkit.issues.listForRepo({
    ...context.repo,
    labels: "linkrot",
  });
  const existingPr = existingLinkrotIssues.find((issue) => issue.pull_request);
  if (existingPr) {
    ctx.message(`Skipping linkrot because a pull request already exists
${existingPr.pull_request.html_url}`);
    throw new LError();
  }
}
