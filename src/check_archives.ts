import { queryIA } from "./ia_client";
import { LURLGroup } from "../types";

export async function checkArchives(groups: LURLGroup[]) {
  let errorGroups = groups.filter((group) => group.status?.status === "error");
  errorGroups = errorGroups.slice(0, 50);

  const archiveStatus = await queryIA(errorGroups.map((group) => group.url));

  for (let result of archiveStatus.results) {
    if (result.archived_snapshots?.closest?.available) {
      errorGroups.find((group) => group.url == result.url)!.status = {
        status: "archive",
        to: result.archived_snapshots!.closest.url,
      };
    }
  }
}
