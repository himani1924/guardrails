/**
 * Very small, deterministic chunker. Splits on paragraph boundaries and
 * greedily packs paragraphs into ~`targetChars`-sized chunks so retrieval
 * hits coherent pieces of text.
 */
export function chunkMarkdown(md: string, targetChars = 800): string[] {
  const paragraphs = md
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if (current.length === 0) {
      current = p;
      continue;
    }
    if (current.length + p.length + 2 <= targetChars) {
      current = `${current}\n\n${p}`;
    } else {
      chunks.push(current);
      current = p;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
