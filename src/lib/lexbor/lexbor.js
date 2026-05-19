import { NativeModules } from 'react-native';

const { LexborModule } = NativeModules;

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

function scopedFind(mod, docHandle, sel, nodeHandle) {
  if (sel.charAt(0) !== '>') {
    return mod.querySelectorAll(docHandle, sel, nodeHandle);
  }
  // Split by '>' (respecting parentheses) to handle direct-child combinators.
  // Each part may contain descendant spaces — those work as normal descendant selectors.
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel.charAt(i);
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '>' && depth === 0) {
      const part = sel.substring(start, i).trim();
      if (part) parts.push(part);
      start = i + 1;
    }
  }
  const last = sel.substring(start).trim();
  if (last) parts.push(last);

  let currentHandles = [nodeHandle];
  for (const part of parts) {
    const nextHandles = [];
    // Extract the first CSS component (before any descendant space) for direct-child check.
    // e.g. "thead.separation td:nth-child(3)" → first component = "thead.separation"
    const spaceIdx = part.indexOf(' ');
    const firstComponent = spaceIdx >= 0 ? part.substring(0, spaceIdx) : part;

    for (const parentH of currentHandles) {
      const found = mod.querySelectorAll(docHandle, part, parentH);
      for (const h of found) {
        // Walk up from h to find the ancestor that is a direct child of parentH,
        // then verify that ancestor matches the first component.
        let cur = h;
        while (cur) {
          const p = mod.getParent(cur);
          if (p === parentH) {
            if (mod.matches(docHandle, cur, firstComponent)) {
              nextHandles.push(h);
            }
            break;
          }
          cur = p;
        }
      }
    }
    currentHandles = nextHandles;
    if (currentHandles.length === 0) break;
  }
  return currentHandles;
}

function wrapNode(nodeHandle, docHandle) {
  const mod = getLexborModule();
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
        return mod.getNodeName(nodeHandle) || null;
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
      const result = [];
      let child = mod.getFirstChild(nodeHandle);
      while (child) {
        result.push(wrapNode(child, docHandle));
        child = mod.getNextSibling(child);
      }
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
        return mod.getNodeName(arr[0]) || null;
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
