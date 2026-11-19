export const ACCEPTED_EXT = ["pdf", "docx", "txt", "md", "csv", "xlsx", "jpg", "jpeg", "png", "webp"];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES_PER_MESSAGE = 5;
export const ACCEPT_ATTR = ACCEPTED_EXT.map((e) => "." + e).join(",");

/** Returns an error message for a file, or null if it may be attached. */
export function validateFile(file: { name: string; size: number }, currentCount: number): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_EXT.includes(ext)) return `${file.name}: this file type isn't supported`;
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 20 MB`;
  if (currentCount >= MAX_FILES_PER_MESSAGE) return `You can attach up to ${MAX_FILES_PER_MESSAGE} files per message`;
  return null;
}
