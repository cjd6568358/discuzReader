# Debug: temme 执行时 APP 卡死

**日期:** 2026-05-18
**状态:** 已解决

## 问题描述

执行 temme 解析 HTML 时，APP 完全卡死。`querySelectorAll` 原生方法从未被调用。

## 根本原因

`getLexborModule()` 使用 `{...LexborModule}` spread 创建包装对象，导致原生方法的 `this` 上下文丢失。React Native 的 Native Module 方法需要正确的 `this` 上下文才能通过 bridge 调用原生代码。

spread 操作复制了方法引用但丢失了绑定上下文，使得 `mod.querySelectorAll(...)` 调用静默失败（不报错也不执行）。

## 修复方案

将 spread 替换为显式方法绑定：

```javascript
// 修改前
return {
  ...LexborModule,
  parseAsync: (html) => LexborModule.parseAsync(html),
  getRootAsync: (handle) => LexborModule.getRootAsync(handle),
};

// 修改后
return {
  parseAsync: (html) => LexborModule.parseAsync(html),
  destroy: (handle) => LexborModule.destroy(handle),
  getRootAsync: (handle) => LexborModule.getRootAsync(handle),
  querySelectorAll: (handle, selector, rootHandle) => LexborModule.querySelectorAll(handle, selector, rootHandle),
  matches: (handle, nodeHandle, selector) => LexborModule.matches(handle, nodeHandle, selector),
  getNodeType: (nodeHandle) => LexborModule.getNodeType(nodeHandle),
  getNodeName: (nodeHandle) => LexborModule.getNodeName(nodeHandle),
  getAttribute: (nodeHandle, attrName) => LexborModule.getAttribute(nodeHandle, attrName),
  getText: (nodeHandle) => LexborModule.getText(nodeHandle),
  getInnerHtml: (nodeHandle) => LexborModule.getInnerHtml(nodeHandle),
  getParent: (nodeHandle) => LexborModule.getParent(nodeHandle),
  getFirstChild: (nodeHandle) => LexborModule.getFirstChild(nodeHandle),
  getNextSibling: (nodeHandle) => LexborModule.getNextSibling(nodeHandle),
};
```

## 附带修复: nativeMatches 始终返回 true

`matchCallback` 没有设置匹配标志，导致 `is()` 对所有选择器返回 `true`。

## 涉及文件

- `src/lib/lexbor/lexbor.js` - 显式方法绑定（核心修复）
- `android/app/src/main/cpp/lexbor_jni.cpp` - matchCallback 修复
