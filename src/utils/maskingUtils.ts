/**
 * Masks credit card numbers in a text string.
 * Keeps only the last 4 digits visible.
 * Pattern: 9376-1114-4113-1234 -> ****-****-****-1234
 */
export function maskCreditCards(text: string): string {
  // Regex matches 4 groups of 4 digits separated by hyphens or spaces
  // It captures the last group to keep it visible.
  const ccRegex = /\b\d{4}[- ]\d{4}[- ]\d{4}-(\d{4})\b/g;
  return text.replace(ccRegex, '****-****-****-$1');
}
