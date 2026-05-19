# Debug: lexbor CSS 选择器不支持 `>` 直接子组合器

**日期:** 2026-05-19
**状态:** 已解决

## 问题描述

temme 解析 forum 页面时，`categorys` 的 threads 全部为空，分类名回退到默认值 `"公告"`。`children` 的 `lastPost` 缺少 `href` 和 `name`。

cheerio 结果正确，lexbor 结果缺失。

## 根本原因

Lexbor 的 CSS 选择器引擎不支持以 `>` 开头的选择器。temme 选择器中大量使用 `>` 表示直接子元素关系：

```
.mainbox.threadlist table@categorys{
    > thead.separation td:nth-child(3){$name};
    > tbody > tr:not(.category)@threads{...}
}
.mainbox.forumlist tbody tr@children{
    td.lastpost@lastPost|pack{
        >a[href=$href]{$name}
    }
}
```

`querySelectorAll` 收到 `>tbody>tr:not(.category)` 这类选择器时无法解析，直接返回空结果。

## 修复方案

在 `scopedFind` 中处理 `>` 选择器：

1. 按 `>` 拆分选择器（尊重括号嵌套），逐层查找
2. 对每一层，提取第一个 CSS 组件（`>` 后面、空格前面的部分）作为直接子元素的匹配条件
3. 从 `querySelectorAll` 的结果往上遍历祖先链，找到真正是父节点直接子元素的那一层
4. 用 `matches()` 验证该祖先是否匹配第一个组件

```javascript
function scopedFind(mod, docHandle, sel, nodeHandle) {
  if (sel.charAt(0) !== '>') {
    return mod.querySelectorAll(docHandle, sel, nodeHandle);
  }
  // 按 '>' 拆分，逐层处理
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
    const spaceIdx = part.indexOf(' ');
    const firstComponent = spaceIdx >= 0 ? part.substring(0, spaceIdx) : part;

    for (const parentH of currentHandles) {
      const found = mod.querySelectorAll(docHandle, part, parentH);
      for (const h of found) {
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
```

**更正 (2026-05-19):** 拼接父标签名是可行的。例如 `table` 节点的选择器 `>thead.separation`，拼接为 `table >thead.separation`，在父节点（form）上搜索。搜索范围虽扩大到祖父节点的整个子树，但通过 `filterDescendants` 过滤可保证只返回当前节点（table）的直接子树结果。原方案（按 `>` 拆分逐层查询）效率较低，已弃用。

## 与 Windows 平台实现的差异（已统一）

两个平台的 lexbor C 库行为一致，`lxb_css_selectors_parse` 均不接受以 `>` 开头的选择器。Windows 端之所以能工作，是因为在 JS 层预先拼接了父标签名。Android 端现已采用相同策略，通过 `nativeGetLocalNameId` 获取标签名 ID（配合 KNOWN_TAGS 查表），以及 `nativeFilterDescendants` 在 C 层批量过滤后代节点。详见 `2026-05-19-android-performance-optimization.md`。

## 涉及文件

- `src/lib/lexbor/lexbor.js` - `scopedFind` 函数（已重写为拼接父标签名方案）
- `src/lib/lexbor/tag-names.js` - 共享 KNOWN_TAGS 查找表
- `src/lib/lexbor/lexbor-native.js` - Windows 端参考实现
- `android/app/src/main/cpp/lexbor_jni.cpp` - `nativeGetLocalNameId`, `nativeFilterDescendants`
- `android/app/src/main/java/com/discuzreader/LexborModule.kt` - Kotlin 层 JNI 桥接
