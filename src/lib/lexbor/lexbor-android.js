import { NativeModules } from 'react-native';
const { LexborModule } = NativeModules;

/**
 * KNOWN_TAGS lookup table for lexbor local_name ID -> tag name mapping.
 * IDs differ between x64 and ARM64 builds (different lexbor versions).
 * Platform-specific mapping is selected at runtime.
 */

// ARM64 (Android) - from lexbor/arm64-v8a/bin/include/lexbor/tag/const.h
const KNOWN_TAGS = {
  6: 'a', 7: 'abbr', 8: 'acronym', 9: 'address',
  10: 'altglyph', 11: 'altglyphdef', 12: 'altglyphitem', 13: 'animatecolor',
  14: 'animatemotion', 15: 'animatetransform', 16: 'annotation-xml', 17: 'applet',
  18: 'area', 19: 'article', 20: 'aside', 21: 'audio',
  22: 'b', 23: 'base', 24: 'basefont', 25: 'bdi',
  26: 'bdo', 27: 'bgsound', 28: 'big', 29: 'blink',
  30: 'blockquote', 31: 'body', 32: 'br', 33: 'button',
  34: 'canvas', 35: 'caption', 36: 'center', 37: 'cite',
  38: 'clippath', 39: 'code', 40: 'col', 41: 'colgroup',
  42: 'data', 43: 'datalist', 44: 'dd', 45: 'del',
  46: 'desc', 47: 'details', 48: 'dfn', 49: 'dialog',
  50: 'dir', 51: 'div', 52: 'dl', 53: 'dt',
  54: 'em', 55: 'embed', 56: 'feblend', 57: 'fecolormatrix',
  58: 'fecomponenttransfer', 59: 'fecomposite', 60: 'feconvolvematrix', 61: 'fediffuselighting',
  62: 'fedisplacementmap', 63: 'fedistantlight', 64: 'fedropshadow', 65: 'feflood',
  66: 'fefunca', 67: 'fefuncb', 68: 'fefuncg', 69: 'fefuncr',
  70: 'fegaussianblur', 71: 'feimage', 72: 'femerge', 73: 'femergenode',
  74: 'femorphology', 75: 'feoffset', 76: 'fepointlight', 77: 'fespecularlighting',
  78: 'fespotlight', 79: 'fetile', 80: 'feturbulence', 81: 'fieldset',
  82: 'figcaption', 83: 'figure', 84: 'font', 85: 'footer',
  86: 'foreignobject', 87: 'form', 88: 'frame', 89: 'frameset',
  90: 'glyphref', 91: 'h1', 92: 'h2', 93: 'h3',
  94: 'h4', 95: 'h5', 96: 'h6', 97: 'head',
  98: 'header', 99: 'hgroup', 100: 'hr', 101: 'html',
  102: 'i', 103: 'iframe', 104: 'image', 105: 'img',
  106: 'input', 107: 'ins', 108: 'isindex', 109: 'kbd',
  110: 'keygen', 111: 'label', 112: 'legend', 113: 'li',
  114: 'lineargradient', 115: 'link', 116: 'listing', 117: 'main',
  118: 'malignmark', 119: 'map', 120: 'mark', 121: 'marquee',
  122: 'math', 123: 'menu', 124: 'meta', 125: 'meter',
  126: 'mfenced', 127: 'mglyph', 128: 'mi', 129: 'mn',
  130: 'mo', 131: 'ms', 132: 'mtext', 133: 'multicol',
  134: 'nav', 135: 'nextid', 136: 'nobr', 137: 'noembed',
  138: 'noframes', 139: 'noscript', 140: 'object', 141: 'ol',
  142: 'optgroup', 143: 'option', 144: 'output', 145: 'p',
  146: 'param', 147: 'path', 148: 'picture', 149: 'plaintext',
  150: 'pre', 151: 'progress', 152: 'q', 153: 'radialgradient',
  154: 'rb', 155: 'rp', 156: 'rt', 157: 'rtc',
  158: 'ruby', 159: 's', 160: 'samp', 161: 'script',
  162: 'search', 163: 'section', 164: 'select', 165: 'selectedcontent',
  166: 'slot', 167: 'small', 168: 'source', 169: 'spacer',
  170: 'span', 171: 'strike', 172: 'strong', 173: 'style',
  174: 'sub', 175: 'summary', 176: 'sup', 177: 'svg',
  178: 'table', 179: 'tbody', 180: 'td', 181: 'template',
  182: 'textarea', 183: 'textpath', 184: 'tfoot', 185: 'th',
  186: 'thead', 187: 'time', 188: 'title', 189: 'tr',
  190: 'track', 191: 'tt', 192: 'u', 193: 'ul',
  194: 'var', 195: 'video', 196: 'wbr', 197: 'xmp',
};

function getLexborModule() {
  if (!LexborModule) {
    throw new Error('LexborModule is not available. Make sure the native module is linked correctly.');
  }
  return LexborModule;
}

function isHandle(handle) {
  return (
    typeof handle === 'string' &&
    /^-?[0-9]+$/.test(handle) &&
    handle !== '0' &&
    handle !== '-0'
  );
}

const tagNameCache = new Map(); // local_name_id -> tag name string

function getTagNameById(mod, nodeHandle) {
  const id = parseInt(mod.getLocalNameId(nodeHandle), 10);
  let cached = tagNameCache.get(id);
  if (cached !== undefined) return cached;
  cached = KNOWN_TAGS[id];
  if (cached) {
    tagNameCache.set(id, cached);
    return cached;
  }
  // Fallback: JNI call for unknown tags
  cached = mod.getNodeName(nodeHandle) || 'unknown';
  tagNameCache.set(id, cached);
  return cached;
}

function scopedFind(mod, docHandle, sel, nodeHandle) {
  if (sel.charAt(0) !== '>') {
    return mod.querySelectorAll(docHandle, sel, nodeHandle);
  }
  // Prepend parent tag name to make a valid CSS selector, search from parent,
  // then filter results to only include descendants of nodeHandle.
  const tagName = getTagNameById(mod, nodeHandle);
  if (!tagName) return [];
  const parentHandle = mod.getParent(nodeHandle);
  if (!parentHandle) return [];
  const effectiveSel = tagName + ' ' + sel;
  const found = mod.querySelectorAll(docHandle, effectiveSel, parentHandle);
  if (found.length === 0) return [];
  return mod.filterDescendants(found, nodeHandle);
}

function wrapNode(nodeHandle, docHandle) {
  const mod = getLexborModule();
  let _cachedChildren = null;
  const node = {
    _handle: nodeHandle,
    _doc: docHandle,

    find(sel) {
      if (!isHandle(nodeHandle)) return wrapList([], docHandle);
      const handles = scopedFind(mod, docHandle, sel, nodeHandle);
      return wrapList(handles, docHandle);
    },

    is(sel) {
      if (!isHandle(nodeHandle)) return false;
      return mod.matches(docHandle, nodeHandle, sel);
    },

    attr(name) {
      if (!isHandle(nodeHandle)) return undefined;
      const val = mod.getAttribute(nodeHandle, name);
      return val !== null && val !== undefined ? val : undefined;
    },

    text() {
      if (!isHandle(nodeHandle)) return '';
      return mod.getText(nodeHandle);
    },

    html() {
      if (!isHandle(nodeHandle)) return '';
      return mod.getInnerHtml(nodeHandle);
    },

    getNodeName() {
      if (!isHandle(nodeHandle)) return null;
      const nodeType = mod.getNodeType(nodeHandle);
      if (nodeType === 1) {
        return getTagNameById(mod, nodeHandle);
      }
      return null;
    },

    getType() {
      if (!isHandle(nodeHandle)) return null;
      const nodeType = mod.getNodeType(nodeHandle);
      if (nodeType === 1) return 'tag';
      if (nodeType === 3) return 'text';
      if (nodeType === 8) return 'comment';
      return null;
    },

    getParent() {
      if (!isHandle(nodeHandle)) return null;
      const parentHandle = mod.getParent(nodeHandle);
      return parentHandle ? wrapNode(parentHandle, docHandle) : null;
    },

    getChildren() {
      if (!isHandle(nodeHandle)) return [];
      if (_cachedChildren) return _cachedChildren;
      const result = [];
      let child = mod.getFirstChild(nodeHandle);
      while (child) {
        result.push(wrapNode(child, docHandle));
        child = mod.getNextSibling(child);
      }
      _cachedChildren = result;
      return result;
    },

    get length() {
      return isHandle(nodeHandle) ? 1 : 0;
    },

    first() {
      return node;
    },

    each(fn) {
      if (nodeHandle) {
        fn(0, node);
      }
      return node;
    },

    eq() {
      return node;
    },

    data() {
      return '';
    },
  };

  Object.defineProperty(node, 'cheerio', { value: '[lexbor]', writable: false, configurable: true });

  // Getter properties for Windows API compatibility
  Object.defineProperty(node, 'type', {
    get() { return node.getType(); },
    configurable: true,
  });
  Object.defineProperty(node, 'name', {
    get() { return node.getNodeName(); },
    configurable: true,
  });

  return node;
}

function wrapList(handles, docHandle) {
  const mod = getLexborModule();
  const arr = (handles || []).filter(h => isHandle(h));

  const list = {
    _handles: arr,
    _doc: docHandle,

    get length() {
      return arr.length;
    },

    find(sel) {
      const allResults = [];
      for (const h of arr) {
        const results = scopedFind(mod, docHandle, sel, h);
        allResults.push(...results);
      }
      return wrapList(allResults, docHandle);
    },

    is(sel) {
      for (const h of arr) {
        if (mod.matches(docHandle, h, sel)) return true;
      }
      return false;
    },

    attr(name) {
      if (arr.length === 0) return undefined;
      const val = mod.getAttribute(arr[0], name);
      return val !== null && val !== undefined ? val : undefined;
    },

    text() {
      const parts = [];
      for (const h of arr) {
        parts.push(mod.getText(h));
      }
      return parts.join('');
    },

    html() {
      if (arr.length === 0) return '';
      return mod.getInnerHtml(arr[0]);
    },

    getNodeName() {
      if (arr.length === 0) return null;
      const nodeType = mod.getNodeType(arr[0]);
      if (nodeType === 1) {
        return getTagNameById(mod, arr[0]);
      }
      return null;
    },

    getType() {
      if (arr.length === 0) return null;
      const nodeType = mod.getNodeType(arr[0]);
      if (nodeType === 1) return 'tag';
      if (nodeType === 3) return 'text';
      if (nodeType === 8) return 'comment';
      return null;
    },

    getParent() {
      if (arr.length === 0) return null;
      const parentHandle = mod.getParent(arr[0]);
      return parentHandle ? wrapNode(parentHandle, docHandle) : null;
    },

    getChildren() {
      if (arr.length === 0) return [];
      const result = [];
      let child = mod.getFirstChild(arr[0]);
      while (child) {
        result.push(wrapNode(child, docHandle));
        child = mod.getNextSibling(child);
      }
      return result;
    },

    first() {
      if (arr.length === 0) return wrapList([], docHandle);
      return wrapNode(arr[0], docHandle);
    },

    last() {
      if (arr.length === 0) return wrapList([], docHandle);
      return wrapNode(arr[arr.length - 1], docHandle);
    },

    eq(index) {
      if (index < 0) index += arr.length;
      if (index < 0 || index >= arr.length) return wrapList([], docHandle);
      return wrapNode(arr[index], docHandle);
    },

    each(fn) {
      for (let i = 0; i < arr.length; i++) {
        fn(i, wrapNode(arr[i], docHandle));
      }
      return list;
    },

    map(fn) {
      const result = [];
      for (let i = 0; i < arr.length; i++) {
        result.push(fn(i, wrapNode(arr[i], docHandle)));
      }
      return result;
    },

    toArray() {
      return arr.map(h => wrapNode(h, docHandle));
    },

    data() {
      return '';
    },
  };

  Object.defineProperty(list, 'cheerio', { value: '[lexbor]', writable: false, configurable: true });

  return list;
}

export function load(html) {
  const mod = getLexborModule();
  const docHandle = mod.parseSync(html);

  if (!isHandle(docHandle)) {
    throw new Error('Failed to parse HTML with lexbor');
  }

  const rootHandle = mod.getRoot(docHandle);
  if (!isHandle(rootHandle)) {
    throw new Error('Failed to get lexbor root handle');
  }

  function $(selectorOrHandle) {
    if (selectorOrHandle && selectorOrHandle._handle) {
      return selectorOrHandle;
    }
    if (typeof selectorOrHandle === 'number' && selectorOrHandle > 0) {
      return wrapNode(String(selectorOrHandle), docHandle);
    }
    if (typeof selectorOrHandle === 'string' && isHandle(selectorOrHandle)) {
      return wrapNode(selectorOrHandle, docHandle);
    }
    if (typeof selectorOrHandle === 'string') {
      const handles = mod.querySelectorAll(docHandle, selectorOrHandle, rootHandle);
      return wrapList(handles, docHandle);
    }
    return wrapList([], docHandle);
  }

  $.root = () => ({
    _handle: rootHandle,
    _doc: docHandle,

    find(sel) {
      const handles = mod.querySelectorAll(docHandle, sel, rootHandle);
      return wrapList(handles, docHandle);
    },

    is() {
      return false;
    },

    text() {
      return '';
    },

    html() {
      return '';
    },

    attr() {
      return undefined;
    },

    get length() {
      return 1;
    },

    first() {
      return this;
    },

    each(fn) {
      fn(0, this);
      return this;
    },

    eq() {
      return this;
    },

    data() {
      return '';
    },
  });

  $.find = (sel) => {
    const handles = mod.querySelectorAll(docHandle, sel, rootHandle);
    return wrapList(handles, docHandle);
  };

  $.node = (handle) => {
    if (isHandle(handle)) {
      return wrapNode(handle, docHandle);
    }
    if (typeof handle === 'number' && handle > 0) {
      return wrapNode(String(handle), docHandle);
    }
    return null;
  };

  $.destroy = () => {
    mod.destroy(docHandle);
  };

  Object.defineProperty($, 'cheerio', { value: '[lexbor]', writable: false, configurable: true });

  return $;
}

export function isLexborInstance(obj) {
  return obj && typeof obj === 'function' && typeof obj.root === 'function';
}

export default {
  load,
  isLexborInstance,
};
