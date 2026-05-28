/**
 * HTML → Simplified JSON Node Converter
 *
 * Converts Discuz forum HTML into a flat list of block nodes,
 * each containing inline children. Designed for fast rendering
 * with React Native <Text> + inline <Image>.
 *
 * Node types:
 *   { type: 'text', content: '...' }
 *   { type: 'img', src: '...', width: N, height: N, href?: '...' }
 *   { type: 'br' }
 *   { type: 'styled', tag: 'b', children: [...] }
 *   { type: 'link', href: '...', children: [...] }
 *   { type: 'paragraph', children: [...] }
 *   { type: 'blockquote', children: [...] }
 *   { type: 'pre', children: [...] }
 *   { type: 'list', tag: 'ul'|'ol', children: [...] }
 *   { type: 'listItem', children: [...] }
 *   { type: 'table', html: '...' }
 *   { type: 'hr' }
 */

const BLOCK_TAGS_RE = /^(p|div|h[1-6]|blockquote|pre|ul|ol|li|table|thead|tbody|tr|td|th|fieldset|section|article|hr|dl|dt|dd|figure|figcaption)$/i;
const INLINE_TAGS = new Set([
  'a', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
  'font', 'span', 'sup', 'sub', 'code', 'mark', 'small', 'big',
  'abbr', 'cite', 'q', 'var', 'kbd', 'samp', 'tt', 'label',
]);
const SELF_CLOSING_RE = /\/\s*>$/;
const SMILIES_RE = /\/images\/(smilies|green|attachicons)\//;
const ATTR_RE = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*?)"|'([^']*?)'|(\S+))/g;

function isSelfClosing(tagOpen) {
  return SELF_CLOSING_RE.test(tagOpen);
}

function extractTagName(tagContent) {
  const m = tagContent.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  return m ? m[1].toLowerCase() : null;
}

function parseAttributes(attrStr) {
  const attrs = {};
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(attrStr)) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

function parseImgTag(tagContent) {
  const attrs = parseAttributes(tagContent);
  const src = attrs.src || attrs['data-src'] || '';
  if (!src || SMILIES_RE.test(src)) return null;

  const width = parseInt(attrs.width, 10);
  const height = parseInt(attrs.height, 10);
  return {
    type: 'img',
    src,
    width: isNaN(width) ? 200 : width,
    height: isNaN(height) ? 150 : height,
  };
}

function getStyledTagStyle(tag) {
  switch (tag) {
    case 'b':
    case 'strong':
      return { fontWeight: 'bold' };
    case 'i':
    case 'em':
    case 'cite':
    case 'abbr':
    case 'dfn':
      return { fontStyle: 'italic' };
    case 'u':
      return { textDecorationLine: 'underline' };
    case 's':
    case 'strike':
    case 'del':
      return { textDecorationLine: 'line-through' };
    case 'sup':
      return { fontSize: 10, textAlignVertical: 'top' };
    case 'sub':
      return { fontSize: 10, textAlignVertical: 'bottom' };
    case 'code':
      return { fontFamily: 'monospace', backgroundColor: '#F3F4F6', fontSize: 14 };
    default:
      return null;
  }
}

function getFontStyle(attrStr) {
  const attrs = parseAttributes(attrStr);
  const style = {};
  if (attrs.color) style.color = attrs.color;
  if (attrs.size) {
    const sizeMap = { 1: 10, 2: 13, 3: 16, 4: 18, 5: 24, 6: 32, 7: 48 };
    style.fontSize = sizeMap[parseInt(attrs.size, 10)] || 16;
  }
  if (attrs.face) style.fontFamily = attrs.face;
  return Object.keys(style).length > 0 ? style : null;
}

// ── Inline parser ──────────────────────────────────────────────

function extractInline(html) {
  const nodes = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      // ── Closing tag → end of current inline scope ──
      if (html[i + 1] === '/') {
        const closeEnd = html.indexOf('>', i);
        if (closeEnd === -1) { i++; continue; }
        const tag = extractTagName(html.slice(i + 2, closeEnd));
        if (tag && (INLINE_TAGS.has(tag) || tag === 'a')) return nodes;
        // Unmatched closing tag → treat as text
        nodes.push({ type: 'text', content: html.slice(i, closeEnd + 1) });
        i = closeEnd + 1;
        continue;
      }

      // ── Opening tag ──
      const openEnd = html.indexOf('>', i);
      if (openEnd === -1) { i++; continue; }
      const tagContent = html.slice(i + 1, openEnd);
      const tag = extractTagName(tagContent);

      if (tag === 'img') {
        const imgNode = parseImgTag(tagContent);
        if (imgNode) nodes.push(imgNode);
        i = openEnd + 1;
      } else if (tag === 'br') {
        nodes.push({ type: 'br' });
        i = openEnd + 1;
      } else if (tag === 'a') {
        const attrs = parseAttributes(tagContent);
        const href = attrs.href || '';
        i = openEnd + 1;
        const children = extractInline(html.slice(i));
        // Skip past closing </a>
        const closeA = html.indexOf('</a', i);
        if (closeA !== -1) {
          const closeEnd2 = html.indexOf('>', closeA);
          i = closeEnd2 !== -1 ? closeEnd2 + 1 : closeA + 3;
        }
        if (children.length > 0) {
          // <a> wrapping single <img> → linked image
          if (children.length === 1 && children[0].type === 'img') {
            const imgNode = { ...children[0], href };
            nodes.push(imgNode);
          } else {
            nodes.push({ type: 'link', href, children });
          }
        }
      } else if (INLINE_TAGS.has(tag)) {
        if (isSelfClosing(html.slice(i, openEnd + 1))) {
          i = openEnd + 1;
          continue;
        }
        i = openEnd + 1;
        const children = extractInline(html.slice(i));
        // Skip past closing tag
        const closeTag = '</' + tag;
        const closeIdx = html.indexOf(closeTag, i);
        if (closeIdx !== -1) {
          const ce = html.indexOf('>', closeIdx);
          i = ce !== -1 ? ce + 1 : closeIdx + closeTag.length;
        } else {
          // Unclosed tag — position after all parsed children
          const lastChild = children[children.length - 1];
          if (lastChild && lastChild._endPos) i = lastChild._endPos;
        }
        if (children.length > 0) {
          if (tag === 'font') {
            const fontStyle = getFontStyle(tagContent);
            if (fontStyle) {
              nodes.push({ type: 'styled', tag: 'font', style: fontStyle, children });
            } else {
              nodes.push(...children);
            }
          } else {
            const style = getStyledTagStyle(tag);
            if (style) {
              nodes.push({ type: 'styled', tag, style, children });
            } else {
              nodes.push(...children);
            }
          }
        }
      } else {
        // Unknown tag → treat as text
        nodes.push({ type: 'text', content: html.slice(i, openEnd + 1) });
        i = openEnd + 1;
      }
    } else {
      // ── Plain text ──
      const nextTag = html.indexOf('<', i);
      const end = nextTag === -1 ? html.length : nextTag;
      const text = html.slice(i, end);
      if (text) nodes.push({ type: 'text', content: text });
      i = end;
    }
  }
  return nodes;
}

// ── Block parser (recursive, handles nesting) ──────────────────

function parseBlocksRecursive(html, endTag) {
  const blocks = [];
  let pendingInline = '';
  let i = 0;

  const flushInline = () => {
    const trimmed = pendingInline.trim();
    if (trimmed) {
      const children = extractInline(pendingInline);
      if (children.length > 0) {
        blocks.push({ type: 'paragraph', children });
      }
    }
    pendingInline = '';
  };

  while (i < html.length) {
    // ── Closing tag matching our scope → stop ──
    if (html[i] === '<' && html[i + 1] === '/') {
      const closeEnd = html.indexOf('>', i);
      if (closeEnd === -1) break;
      const tag = extractTagName(html.slice(i + 2, closeEnd));
      if (tag === endTag) {
        flushInline();
        return { blocks, endPos: closeEnd + 1 };
      }
      // Other closing tag → might be inline or unmatched
      if (INLINE_TAGS.has(tag) || tag === 'a') {
        pendingInline += html.slice(i, closeEnd + 1);
        i = closeEnd + 1;
      } else {
        // Unmatched block closing → skip
        i = closeEnd + 1;
      }
      continue;
    }

    if (html[i] !== '<') {
      // ── Plain text ──
      const nextTag = html.indexOf('<', i);
      const end = nextTag === -1 ? html.length : nextTag;
      pendingInline += html.slice(i, end);
      i = end;
      continue;
    }

    // ── Opening tag ──
    const openEnd = html.indexOf('>', i);
    if (openEnd === -1) break;
    const tagContent = html.slice(i + 1, openEnd);
    const tag = extractTagName(tagContent);

    if (!tag) {
      pendingInline += html.slice(i, openEnd + 1);
      i = openEnd + 1;
      continue;
    }

    // Self-closing tag
    if (isSelfClosing(html.slice(i, openEnd + 1))) {
      if (tag === 'br') {
        pendingInline += '<br>';
      } else if (tag === 'hr') {
        flushInline();
        blocks.push({ type: 'hr' });
      } else if (tag === 'img') {
        pendingInline += html.slice(i, openEnd + 1);
      } else {
        pendingInline += html.slice(i, openEnd + 1);
      }
      i = openEnd + 1;
      continue;
    }

    if (BLOCK_TAGS_RE.test(tag)) {
      // ── Block element → flush inline, recurse ──
      flushInline();
      i = openEnd + 1;

      // Table → preserve as raw HTML (too complex for simple JSON)
      if (tag === 'table') {
        let depth = 1;
        let tableEnd = i;
        while (tableEnd < html.length && depth > 0) {
          if (html[tableEnd] === '<') {
            const next = html.indexOf('>', tableEnd);
            if (next === -1) break;
            const t = extractTagName(html.slice(tableEnd + 1, next));
            if (t === 'table') {
              if (html[tableEnd + 1] === '/') depth--;
              else depth++;
            }
            tableEnd = next + 1;
          } else {
            tableEnd++;
          }
        }
        blocks.push({ type: 'table', html: html.slice(i - (openEnd - i + 1), tableEnd) });
        i = tableEnd;
        continue;
      }

      const result = parseBlocksRecursive(html.slice(i), tag);
      const children = result.blocks;
      i += result.endPos;

      const flattenParagraphs = (items) => {
        const out = [];
        for (const item of items) {
          if (item.type === 'paragraph') {
            out.push(...item.children);
          } else {
            out.push(item);
          }
        }
        return out.length > 0 ? out : [{ type: 'text', content: '' }];
      };

      if (tag === 'blockquote') {
        blocks.push({ type: 'blockquote', children: flattenParagraphs(children) });
      } else if (tag === 'pre') {
        blocks.push({ type: 'pre', children: flattenParagraphs(children) });
      } else if (tag === 'ul' || tag === 'ol') {
        blocks.push({ type: 'list', tag, children });
      } else if (tag === 'li') {
        blocks.push({ type: 'listItem', children: flattenParagraphs(children) });
      } else if (tag === 'fieldset') {
        blocks.push({ type: 'blockquote', children: flattenParagraphs(children) });
      } else {
        // p, div, h1-h6, dt, dd, etc. → paragraph
        blocks.push({ type: 'paragraph', children: flattenParagraphs(children) });
      }
    } else {
      // ── Inline tag → accumulate ──
      pendingInline += html.slice(i, openEnd + 1);
      i = openEnd + 1;
    }
  }

  flushInline();
  return { blocks, endPos: html.length };
}

// ── Public API ─────────────────────────────────────────────────

export function htmlToNodes(html) {
  if (!html) return [];
  const cleaned = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '');
  const { blocks } = parseBlocksRecursive(cleaned, null);
  return blocks;
}
