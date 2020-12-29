import { LFile, LContext } from "../types";
import { commitFile } from "./commit_file";

async function createBranch(
  { context, toolkit }: LContext,
  defaultBranch: string
) {
  const branch = `linkrot-${new Date()
    .toLocaleDateString()
    .replace(/\//g, "-")}`;
  const ref = `refs/heads/${branch}`;

  const {
    data: {
      object: { sha },
    },
  } = await toolkit.git.getRef({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: `heads/${defaultBranch}`,
  });

  await toolkit.git.createRef({
    ...context.repo,
    ref,
    sha,
  });

  return branch;
}

export async function getDefaultBranch({ toolkit, context }: LContext) {
  const {
    data: { default_branch },
  } = await toolkit.repos.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });
  return default_branch;
}

export function getTitle(ctx: LContext) {
  return `🔗 Linkrot updates with ${ctx.stats.upgradedSSL} SSL Upgrades`;
}

export function getBody(ctx: LContext) {
  return `#### Stats

- ${ctx.stats.urlsDetected.toLocaleString()} URLs detected
- ${ctx.stats.cacheSkipped.toLocaleString()} URLs skipped because of the cache
- ${ctx.stats.urlsScanned.toLocaleString()} URLs scanned
`;
}

export async function suggestChanges(ctx: LContext, updatedFiles: LFile[]) {
  const { context, toolkit } = ctx;

  const base = await getDefaultBranch(ctx);
  const branch = await createBranch(ctx, base);

  for (let file of updatedFiles) {
    await commitFile(ctx, branch, file);
  }

  const {
    data: { number },
  } = await toolkit.pulls.create({
    ...context.repo,
    title: getTitle(ctx),
    body: getBody(ctx),
    head: branch,
    base,
  });

  await toolkit.issues.addLabels({
    ...context.repo,
    issue_number: number,
    labels: ["linkrot"],
  });
}
