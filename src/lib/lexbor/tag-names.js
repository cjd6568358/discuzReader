/**
 * Shared KNOWN_TAGS lookup table for lexbor local_name ID -> tag name mapping.
 * IDs are stable within a lexbor build (based on the HTML spec tag enumeration).
 * Used by both lexbor-native.js (Windows/FFI) and lexbor.js (Android/JNI).
 */
const KNOWN_TAGS = {
  1: 'html', 2: 'head', 3: 'title', 4: 'body', 5: 'div', 6: 'span',
  7: 'p', 8: 'a', 9: 'img', 10: 'br', 11: 'hr', 12: 'table',
  13: 'tr', 14: 'td', 15: 'th', 16: 'tbody', 17: 'thead', 18: 'tfoot',
  19: 'ul', 20: 'ol', 21: 'li', 22: 'dl', 23: 'dt', 24: 'dd',
  25: 'form', 26: 'input', 27: 'button', 28: 'select', 29: 'option',
  30: 'textarea', 31: 'label', 32: 'h1', 33: 'h2', 34: 'h3',
  35: 'h4', 36: 'h5', 37: 'h6', 38: 'em', 39: 'strong', 40: 'b',
  41: 'i', 42: 'u', 43: 's', 44: 'small', 45: 'sub', 46: 'sup',
  47: 'pre', 48: 'code', 49: 'blockquote', 50: 'cite', 51: 'script',
  52: 'style', 53: 'link', 54: 'meta', 55: 'base', 56: 'area',
  57: 'map', 58: 'object', 59: 'embed', 60: 'param', 61: 'video',
  62: 'audio', 63: 'source', 64: 'canvas', 65: 'iframe', 66: 'nav',
  67: 'header', 68: 'footer', 69: 'main', 70: 'section', 71: 'article',
  72: 'aside', 73: 'figure', 74: 'figcaption', 75: 'details', 76: 'summary',
  77: 'fieldset', 78: 'legend', 79: 'colgroup', 80: 'col',
  81: 'caption', 82: 'address', 83: 'abbr', 84: 'bdo', 85: 'ins',
  86: 'del', 87: 'q', 88: 'kbd', 89: 'var', 90: 'samp',
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KNOWN_TAGS };
}
if (typeof exports !== 'undefined') {
  exports.KNOWN_TAGS = KNOWN_TAGS;
}
