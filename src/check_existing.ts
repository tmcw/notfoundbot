import { LContext, LError } from "../types.js";

/**
 * If an existing PR has the notfoundbot tag,
 * print and return true to exit.
 */
export async function checkForExisting(ctx: LContext) {
  const { toolkit, context } = ctx;
  const { data: existingLinkrotIssues } = await toolkit.rest.issues.listForRepo({
    ...context.repo,
    labels: "notfoundbot",
  });
  const existingPr = existingLinkrotIssues.find((issue) => issue.pull_request);
  if (existingPr) {
    ctx.message(`Skipping notfoundbot because a pull request already exists
${existingPr.pull_request?.html_url}`);
    throw new LError();
  }
}
