# Debug: Android Lexbor 性能优化 & scopedFind 策略统一

**日期:** 2026-05-19
**状态:** 已完成

## 优化目标

对比 `lexbor-native.js`（Windows/FFI）和 `lexbor.js`（Android/JNI）的实现差异，将 Windows 端的性能优化经验应用到 Android 端，并统一 `scopedFind` 策略。

## 优化内容

### 1. 标签名查找：KNOWN_TAGS 查表

**问题:** Android 端每次获取标签名都需要 2 次 JNI 调用（`getNodeType` + `getNodeName`），而 Windows 端通过 `KNOWN_TAGS` 查表实现零序列化。

**方案:** 创建共享的 `tag-names.js`，包含 90 个常见 HTML 标签的 `local_name ID → name` 映射。新增 `nativeGetLocalNameId` JNI 方法，返回 `element->node.local_name` 整数 ID。JS 层先查表，只对未知 ID 才回退到 `getNodeName()` JNI 调用。

**涉及文件:**
- `src/lib/lexbor/tag-names.js` (新建，共享常量)
- `src/lib/lexbor/lexbor.js` - `getTagNameById()` 函数
- `android/app/src/main/cpp/lexbor_jni.cpp` - `nativeGetLocalNameId`
- `android/app/src/main/java/com/discuzreader/LexborModule.kt` - `getLocalNameId`

**收益:** Discuz 论坛页面 99% 的标签在 90 个常见标签内，标签名查询从 2 次 JNI 降为 1 次 JNI + 纯 JS 查表。

### 2. 子节点遍历缓存

**问题:** Android 端 `getChildren()` 每次调用都重新遍历子节点链表，每个子节点至少 2 次 JNI（`getFirstChild` + `getNextSibling`）。Windows 端在首次遍历时建立缓存，并同时建立 `next`/`prev` 双向关系。

**方案:** 在 `wrapNode` 中添加 `_cachedChildren` 闭包变量，首次调用后缓存结果。

**涉及文件:**
- `src/lib/lexbor/lexbor.js` - `wrapNode()` 中的 `getChildren()`

**收益:** 重复访问子节点时从 N 次 JNI 降为 0 次。

### 3. scopedFind 策略统一（核心变更）

**问题:** 两个平台对 `>` 直接子组合符的处理策略完全不同：
- Windows: 拼接父标签名 + 选择器，搜索后过滤后代
- Android: 按 `>` 拆分选择器，逐层查询 + 祖先链回溯验证

**方案:** Android 端采用与 Windows 相同的策略：
1. 获取当前节点的标签名（通过 `getTagNameById`）
2. 拼接：`">tbody>tr"` → `"table >tbody>tr"`
3. 在父节点上搜索
4. 通过 `nativeFilterDescendants` 批量过滤（C 层祖先遍历，单次 JNI）

**涉及文件:**
- `src/lib/lexbor/lexbor.js` - `scopedFind()` 函数
- `android/app/src/main/cpp/lexbor_jni.cpp` - `nativeFilterDescendants`
- `android/app/src/main/java/com/discuzreader/LexborModule.kt` - `filterDescendants`

**关键技术细节:**

`lxb_css_selectors_parse` 不接受以 `>` 开头的选择器字符串（非合法 CSS 语法）。两个平台的 lexbor C 库行为一致。Windows 端之所以能工作，是因为在 JS 层预先拼接了父标签名，将 `">tbody>tr"` 转换为合法的 `"table >tbody>tr"`。

之前 debug 文档中 "不能简单地把父节点标签名拼到选择器前面" 的说法有误。拼接后搜索范围虽扩大到祖父节点，但通过 `isDescendantOf` 过滤可保证正确性。

**与旧方案的对比:**

旧方案（按 `>` 拆分逐层查询）的问题：
- 每层都要调用 `querySelectorAll`（JNI），再对每个结果调用 `getParent` 遍历祖先链（多次 JNI）
- 选择器语义被拆分，`querySelectorAll` 在子树中搜索可能找到非直接子元素的结果

新方案（拼接父标签名）的优势：
- 只需 1 次 `querySelectorAll` + 1 次 `filterDescendants`
- `filterDescendants` 在 C 层完成祖先遍历，无需 JNI 跨界
- 与 Windows 端逻辑一致，便于维护

### 4. KNOWN_TAGS 去重

**问题:** `lexbor-native.js` 和 `lexbor.js` 各自定义了相同的 `KNOWN_TAGS` 查找表。

**方案:** 提取到共享的 `tag-names.js`，两个文件通过 import/require 引用。

**涉及文件:**
- `src/lib/lexbor/tag-names.js` (新建)
- `src/lib/lexbor/lexbor-native.js` - 删除内联定义，改为 require
- `src/lib/lexbor/lexbor.js` - 改为 import

## 新增 JNI 方法签名

```
// LexborModule.kt
external fun nativeGetLocalNameId(nodeHandle: Long): Int
external fun nativeFilterDescendants(handles: LongArray, rootHandle: Long): LongArray

// React Native 层
fun getLocalNameId(nodeHandle: String): String
fun filterDescendants(handles: ReadableArray, rootHandle: String): WritableArray
```

## 未实施的优化（风险/收益比不足）

1. **Windows 端 innerHtml 改用 `serialize_deep_cb`**: 当前用 `serializeTreeCb` + 正则剥离，虽有额外开销但正则操作很快，改动风险高于收益。
2. **属性批量获取 JNI**: 需要设计返回格式（key-value 数组或 JSON），增加复杂度，当前单属性访问已够用。
3. **`filterDescendants` 用 `JNI_ABORT`**: 已使用 `JNI_ABORT` 释放 handles 数组（不需要写回），这是正确的优化。
