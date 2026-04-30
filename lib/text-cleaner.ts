// lib/text-cleaner.ts
// Shared text cleaning utilities for job descriptions.
// Handles mojibake, HTML stripping, spam removal, and formatting.

/**
 * Fix UTF-8 mojibake patterns (UTF-8 bytes misinterpreted as Latin-1/Windows-1252).
 */
export function fixMojibake(text: string): string {
  if (!text) return text;

  // Order matters: replace multi-char patterns before single-char ones
  const mojibakeMap: [string, string][] = [
    // Smart quotes and punctuation (3-byte UTF-8 → Latin-1)
    ['â\u0080\u0099', '\u2019'],  // '
    ['â\u0080\u0098', '\u2018'],  // '
    ['â\u0080\u009c', '\u201C'],  // "
    ['â\u0080\u009d', '\u201D'],  // "
    ['â\u0080\u0093', '\u2013'],  // –
    ['â\u0080\u0094', '\u2014'],  // —
    ['â\u0080\u00a6', '\u2026'],  // …
    // Text-level mojibake
    ['â€™', "'"],
    ['â€˜', "'"],
    ['â€œ', '"'],
    ['â€\u009d', '"'],
    ['â€"', '–'],
    ['â€"', '—'],
    ['â€¦', '...'],
    // Accented characters (2-byte UTF-8 → Latin-1): Ã + byte
    ['Ã¼', 'ü'],
    ['Ã¶', 'ö'],
    ['Ã¤', 'ä'],
    ['Ãœ', 'Ü'],
    ['Ã©', 'é'],
    ['Ã¨', 'è'],
    ['Ã ', 'à'],
    ['Ã¢', 'â'],
    ['Ã®', 'î'],
    ['Ã´', 'ô'],
    ['Ã»', 'û'],
    ['Ã§', 'ç'],
    ['Ã±', 'ñ'],
    ['Ã¡', 'á'],
    ['Ã­', 'í'],
    ['Ã³', 'ó'],
    ['Ãº', 'ú'],
    // Spacing artifacts
    ['Â ', ' '],
    ['Â', ''],
    // BOM and replacement chars
    ['ï»¿', ''],
  ];

  let result = text;
  for (const [pattern, replacement] of mojibakeMap) {
    result = result.split(pattern).join(replacement);
  }

  // Remove Unicode replacement character
  result = result.replace(/\uFFFD/g, '');

  return result;
}

/**
 * Remove broken emoji bytes.
 * ð (U+00F0) is the first byte of 4-byte UTF-8 emoji when misread as Latin-1.
 */
export function removeBrokenEmoji(text: string): string {
  // Remove ð followed by 0-3 Latin-1 continuation bytes (U+0080-U+00BF)
  text = text.replace(/ð[\x80-\xBF]{0,3}/g, '');
  // Remove standalone ð
  text = text.replace(/ð/g, '');
  // Remove actual Unicode emoji ranges
  text = text.replace(/[\u{1F300}-\u{1FFFF}]/gu, '');
  text = text.replace(/[\u{2600}-\u{27BF}]/gu, '');
  return text;
}

/**
 * Remove spam/tracking text injected by job boards.
 */
export function removeSpamText(text: string): string {
  // Remove "Please mention the word ... when applying..." block (and everything after it)
  text = text.replace(
    /Please mention the word\s+\*{0,2}\w+\*{0,2}\s+and tag\s+\S+\s+when applying[\s\S]*$/i,
    ''
  );
  // Remove standalone tag patterns
  text = text.replace(/\(#RM[A-Za-z0-9=+/]+\)/g, '');
  text = text.replace(/RMTIw[A-Za-z0-9=+/]+/g, '');
  // Remove "This is a beta feature..." lines
  text = text.replace(/This is a beta feature to avoid spam applicants\.[^\n]*/gi, '');
  return text;
}

/**
 * Normalize smart quotes and special Unicode characters to ASCII equivalents.
 */
export function normalizeUnicode(text: string): string {
  return text
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, ' - ')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u00AD/g, '')
    .replace(/\u200B/g, '');  // zero-width space
}

/**
 * Clean and normalize raw HTML job description text.
 * Strips HTML, fixes encoding, removes spam, preserves paragraph structure.
 */
export function cleanJobDescription(html: string): string {
  if (!html) return 'Job description available on source website.';

  // Preserve block-level element boundaries as newlines
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|tr|section|article|header|footer|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Fix mojibake
  text = fixMojibake(text);

  // Remove broken emoji
  text = removeBrokenEmoji(text);

  // Normalize Unicode
  text = normalizeUnicode(text);

  // Remove spam/tracking text
  text = removeSpamText(text);

  // Normalize whitespace: collapse spaces within lines, preserve line breaks
  text = text
    .replace(/[^\S\n]+/g, ' ')      // collapse horizontal whitespace
    .replace(/ ?\n ?/g, '\n')       // trim spaces around newlines
    .replace(/\n{3,}/g, '\n\n')     // max double newline
    .trim();

  if (text.length < 15) {
    return 'Job description available on source website.';
  }

  return text;
}

/**
 * Get a short plain-text preview suitable for job cards.
 * Collapses whitespace and truncates cleanly.
 */
export function getDescriptionPreview(description: string, maxLength = 250): string {
  if (!description || description === 'Job description available on source website.') {
    return description || 'Job description available on source website.';
  }

  // Collapse all whitespace to single spaces for a card preview
  let preview = description.replace(/\s+/g, ' ').trim();

  if (preview.length <= maxLength) return preview;

  // Truncate at a word boundary
  preview = preview.substring(0, maxLength);
  const lastSpace = preview.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    preview = preview.substring(0, lastSpace);
  }

  return preview + '...';
}

/**
 * Format a cleaned description into paragraphs for display in the modal.
 * Returns an array of non-empty paragraph strings.
 */
export function formatDescriptionParagraphs(description: string): string[] {
  if (!description || description === 'Job description available on source website.') {
    return [description || 'Job description available on source website.'];
  }

  return description
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}
