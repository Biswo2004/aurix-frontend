/**
 * Citation marker helpers.
 * Some models (gpt-oss on Groq) write citations as 【4†L1-L5】 instead of [4].
 */

/** Turns 【4†L1-L5】 into [4] and hides a marker that is still being typed (an opening 【 with no closing 】). */
export function normalizeCitations(text: string): string {
  return text
    .replace(/【\s*(\d{1,2})(?:\s*[†:][^】]*)?】/g, "[$1]")
    .replace(/【[^】]*$/, "");
}

/** Removes citation markers completely, for one-line previews. */
export function stripCitations(text: string): string {
  return normalizeCitations(text).replace(/\[\d{1,2}\]/g, "").replace(/\s{2,}/g, " ");
}
