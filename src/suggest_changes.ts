import { LFile, LContext } from "../types";
import { commitFile } from "./commit_file";

async function createBranch(
  { context, toolkit }: LContext,
  defaultBranch: string
) {
  const branch = `notfoundbot-${new Date()
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
  const { upgradedSSL, archived } = ctx.stats;
  return `🔗 Linkrot: ${(upgradedSSL + archived).toLocaleString()} fixes`;
}

export function getBody(ctx: LContext) {
  const {
    upgradedSSL,
    archived,
    urlsDetected,
    cacheSkipped,
    protocolSkipped,
    relativeSkipped,
    urlsScanned,
  } = ctx.stats;

  return `# Changes

- ${upgradedSSL.toLocaleString()} links upgraded from HTTP to HTTPS
- ${archived.toLocaleString()} dead links relinked to the Internet Archive

---

- ${urlsDetected.toLocaleString()} URLs total
- Skipped ${cacheSkipped.toLocaleString()} cached
- Skipped ${protocolSkipped.toLocaleString()} mailto or data links
- Skipped ${relativeSkipped.toLocaleString()} relative links
- ${urlsScanned.toLocaleString()} URLs scanned
`;
}

export async function suggestChanges(ctx: LContext, updatedFiles: LFile[]) {
  const { context, toolkit } = ctx;

  if (!updatedFiles.length) {
    ctx.message(`No changes detected!`);
    ctx.message(getBody(ctx));
    return;
  }

  ctx.message(`Suggesting changes`);
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
    labels: ["notfoundbot"],
  });
}
