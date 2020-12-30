import { LContext } from "./types";

import { updateFiles } from "./src/util";
import { getFiles } from "./src/get_files";
import { checkForExisting } from "./src/check_existing";
import { checkLinks } from "./src/check_links";
import { checkArchives } from "./src/check_archives";
import { suggestChanges } from "./src/suggest_changes";

export async function action(ctx: LContext) {
  await checkForExisting(ctx);
  const urlGroups = getFiles(ctx);
  await checkLinks(ctx, urlGroups);
  await checkArchives(urlGroups);
  const updatedFiles = updateFiles(ctx, urlGroups);
  await suggestChanges(ctx, updatedFiles);
}
