import { queryIA } from "./query_ia.js";
import { LContext, LURLGroup } from "../types.js";

export async function checkArchives(ctx: LContext, groups: LURLGroup[]) {
  let errorGroups = groups.filter((group) => group.status?.status === "error");
  errorGroups = errorGroups.slice(0, 50);
  if (!errorGroups.length) return;

  let archiveStatus;
  try {
    archiveStatus = await queryIA(errorGroups);
  } catch (e) {
    ctx.message(
      `WARNING: Wayback Machine lookup failed, skipping archive replacements this run: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
    return;
  }

  for (let result of archiveStatus.results) {
    if (result.archived_snapshots?.closest?.available) {
      errorGroups.find((group) => group.url == result.url)!.status = {
        status: "archive",
        to: result.archived_snapshots!.closest.url.replace(/^http:/, "https:"),
      };
    }
  }
}
