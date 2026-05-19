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

关键点：不能简单地把父节点标签名拼到选择器前面（如 `form>thead.separation`），因为父节点不一定是预期的元素（table 的父节点是 form，不是 table）。

## 与 Windows 平台实现的差异

Windows 平台 `lexbor-native.js` 的 `nativeSelectAll` 用类似思路处理 `>`：拼接父标签名 + 选择器，搜索后过滤后代。但 JNI 环境中父节点标签名拼接方式不可靠，改为按 `>` 拆分后逐层查找 + 直接子元素过滤。

## 涉及文件

- `src/lib/lexbor/lexbor.js` - `scopedFind` 函数（核心修复）
