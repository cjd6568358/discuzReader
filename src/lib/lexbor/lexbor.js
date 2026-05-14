import { NativeModules, Platform } from 'react-native';

const { LexborModule } = NativeModules;

function getLexborModule() {
  if (!LexborModule) {
    throw new Error('LexborModule is not available. Make sure the native module is linked correctly.');
  }
  return LexborModule;
}

function wrapNode(nodeHandle, docHandle) {
  const mod = getLexborModule();
  const node = {
    _handle: nodeHandle,
    _doc: docHandle,

    find(sel) {
      if (!nodeHandle) return wrapList([], docHandle);
      const handles = mod.querySelectorAll(docHandle, sel, nodeHandle);
      return wrapList(handles, docHandle);
    },

    is(sel) {
      if (!nodeHandle) return false;
      return mod.matches(docHandle, nodeHandle, sel);
    },

    attr(name) {
      if (!nodeHandle) return undefined;
      const val = mod.getAttribute(nodeHandle, name);
      return val !== null && val !== undefined ? val : undefined;
    },

    text() {
      if (!nodeHandle) return '';
      return mod.getText(nodeHandle);
    },

    html() {
      if (!nodeHandle) return '';
      return mod.getInnerHtml(nodeHandle);
    },

    get nodeName() {
      if (!nodeHandle) return null;
      const nodeType = mod.getNodeType(nodeHandle);
      if (nodeType === 1) {
        return mod.getNodeName(nodeHandle) || null;
      }
      return null;
    },

    get type() {
      if (!nodeHandle) return null;
      const nodeType = mod.getNodeType(nodeHandle);
      if (nodeType === 1) return 'tag';
      if (nodeType === 3) return 'text';
      if (nodeType === 8) return 'comment';
      return null;
    },

    get parent() {
      if (!nodeHandle) return null;
      const parentHandle = mod.getParent(nodeHandle);
      return parentHandle ? wrapNode(parentHandle, docHandle) : null;
    },

    get children() {
      if (!nodeHandle) return [];
      const result = [];
      let child = mod.getFirstChild(nodeHandle);
      while (child) {
        result.push(wrapNode(child, docHandle));
        child = mod.getNextSibling(child);
      }
      return result;
    },

    get length() {
      return nodeHandle ? 1 : 0;
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
  const arr = (handles || []).filter(h => h > 0);

  const list = {
    _handles: arr,
    _doc: docHandle,

    get length() {
      return arr.length;
    },

    find(sel) {
      const allResults = [];
      for (const h of arr) {
        const results = mod.querySelectorAll(docHandle, sel, h);
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

    get nodeName() {
      if (arr.length === 0) return null;
      const nodeType = mod.getNodeType(arr[0]);
      if (nodeType === 1) {
        return mod.getNodeName(arr[0]) || null;
      }
      return null;
    },

    get type() {
      if (arr.length === 0) return null;
      const nodeType = mod.getNodeType(arr[0]);
      if (nodeType === 1) return 'tag';
      if (nodeType === 3) return 'text';
      if (nodeType === 8) return 'comment';
      return null;
    },

    get parent() {
      if (arr.length === 0) return null;
      const parentHandle = mod.getParent(arr[0]);
      return parentHandle ? wrapNode(parentHandle, docHandle) : null;
    },

    get children() {
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

function load(html) {
  const mod = getLexborModule();
  const docHandle = mod.parse(html);

  if (!docHandle || docHandle <= 0) {
    throw new Error('Failed to parse HTML with lexbor');
  }

  const rootHandle = mod.getRoot(docHandle);

  function $(selectorOrHandle) {
    if (typeof selectorOrHandle === 'string') {
      const handles = mod.querySelectorAll(docHandle, selectorOrHandle, rootHandle);
      return wrapList(handles, docHandle);
    }
    if (typeof selectorOrHandle === 'number' && selectorOrHandle > 0) {
      return wrapNode(selectorOrHandle, docHandle);
    }
    if (selectorOrHandle && selectorOrHandle._handle) {
      return selectorOrHandle;
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
    if (handle && handle > 0) {
      return wrapNode(handle, docHandle);
    }
    return null;
  };

  $.destroy = () => {
    mod.destroy(docHandle);
  };

  Object.defineProperty($, 'cheerio', { value: '[lexbor]', writable: false, configurable: true });

  return $;
}

function isLexborInstance(obj) {
  return obj && typeof obj === 'function' && typeof obj.root === 'function';
}

module.exports = {
  load,
  isLexborInstance,
};
