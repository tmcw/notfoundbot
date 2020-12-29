import {LContext} from "../types"

/**
 * If an existing PR has the linkrot tag,
 * print and return true to exit.
 */
export async function checkForExisting(lcontext: LContext) {
  const {toolkit, context} = lcontext;
  const {data: existingLinkrotIssues} = await toolkit.issues.listForRepo({
    ...context.repo,
    labels: "linkrot",
  });
  const existingPr = existingLinkrotIssues.find((issue) => issue.pull_request);
  if (existingPr) {
    return `Skipping linkrot because a pull request already exists
${existingPr.pull_request.html_url}`;
  }
}
