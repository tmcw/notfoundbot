import { LContext } from "./types.js";

import { updateFiles } from "./src/util.js";
import { getFiles } from "./src/get_files.js";
import { checkForExisting } from "./src/check_existing.js";
import { checkLinks } from "./src/check_links.js";
import { checkArchives } from "./src/check_archives.js";
import { suggestChanges } from "./src/suggest_changes.js";

export async function action(ctx: LContext) {
  await checkForExisting(ctx);
  const urlGroups = getFiles(ctx);
  await checkLinks(ctx, urlGroups);
  await checkArchives(urlGroups);
  const updatedFiles = updateFiles(ctx, urlGroups);
  await suggestChanges(ctx, updatedFiles);
  return updatedFiles;
}
