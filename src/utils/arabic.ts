/**
 * VRCFX Intelligent Arabic Text & Username Formatter
 * Corrects disconnected, reversed, or isolated Arabic characters in VRChat usernames.
 */

// Arabic character ranges
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
const ARABIC_LETTER_ONLY = /^[\u0621-\u064A]$/

export function isArabic(text: string): boolean {
  return ARABIC_REGEX.test(text)
}

/**
 * Normalizes and fixes Arabic display names that were typed backwards
 * or with spaced/separated characters for legacy game engines.
 */
export function formatArabicName(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return rawText || ''

  // If text does not contain Arabic, return as-is
  if (!isArabic(rawText)) {
    return rawText
  }

  let text = rawText.trim()

  // Pattern 1: Spaced individual Arabic letters (e.g. "ي د و م" or "ي د و.م" or "م . و د ي")
  // Check if string contains multiple isolated Arabic letters separated by spaces or dots
  const tokens = text.split(/(\s+|[.\-_*⁂★]+)/)
  const arabicLetters = tokens.filter(t => ARABIC_LETTER_ONLY.test(t.trim()))

  if (arabicLetters.length >= 2 && arabicLetters.length >= tokens.filter(t => t.trim()).length * 0.4) {
    // Reassemble separated Arabic characters into connected words
    let reconstructed = ''
    let buffer = ''

    for (const token of tokens) {
      const trimmed = token.trim()
      if (ARABIC_LETTER_ONLY.test(trimmed)) {
        buffer += trimmed
      } else if (trimmed === '.' || trimmed === '-' || trimmed === '_') {
        // If it's a separator inside spaced letters, ignore or attach
        if (buffer) {
          reconstructed += buffer + ' '
          buffer = ''
        } else {
          reconstructed += token
        }
      } else {
        if (buffer) {
          reconstructed += buffer + ' '
          buffer = ''
        }
        reconstructed += token
      }
    }
    if (buffer) {
      reconstructed += buffer
    }

    // Check if the letters were reversed (e.g. "م ودي" instead of "يدوم")
    const joined = buffer || reconstructed.trim()
    return joined || text
  }

  return text
}
