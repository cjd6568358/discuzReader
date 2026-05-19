# lexbor >table[id=$pid] 选择器 pid 缺失

日期：2026-05-19 ~ 2026-05-20

## 问题现象

lexbor temme 解析 thread 页面时，`posts.0.pid` 缺失。cheerio 结果正确，lexbor 结果缺失。

```
cheerio vs lexbor: [{ path: "posts.0.pid", type: "missing", value1: "219764471" }]
```

## 根本原因

**`KNOWN_TAGS` 表的 ID 与 lexbor C 库的实际枚举值不匹配。**

`tag-names.js` 中的 `KNOWN_TAGS` 表是手写的，使用顺序编号（1,2,3...），但 lexbor C 库的 `lxb_tag_id_enum_t` 按字母序排列（A=6, DIV=51, FORM=87, SCRIPT=161）。

手写的表：
```javascript
// 错误的
const KNOWN_TAGS = {
  1: 'html', 2: 'head', 3: 'title', 4: 'body', 5: 'div', ...
  25: 'form', 51: 'script', ...
};
```

lexbor C 库的真实枚举（来自 `tag/const.h`）：
```c
LXB_TAG_A      = 0x0006,  // 6
LXB_TAG_DIV    = 0x0033,  // 51
LXB_TAG_FORM   = 0x0057,  // 87
LXB_TAG_SCRIPT = 0x00a1,  // 161
LXB_TAG_TABLE  = 0x00b2,  // 178
LXB_TAG_TD     = 0x00b4,  // 180
```

### Bug 链路

1. `getTagNameById(mod, nodeHandle)` 用 `localNameId` 做缓存 key
2. `localNameId=87`（form）在 `KNOWN_TAGS` 中不存在 → 走 fallback 调 `getNodeName`
3. fallback 返回正确值 `'form'`，缓存到 `tagNameCache.set(87, 'form')`
4. 但如果 fallback 对某个节点返回了错误值，就会污染缓存
5. `scopedFind` 构造 `"script >table"` 而非 `"td >table"`，`querySelectorAll` 搜索失败
6. `>table[id=$pid]` 选择器找不到 table 节点，pid 捕获失败

### 为什么 Windows 没问题

Windows 的 `lexbor-window.js` 使用相同的 `KNOWN_TAGS` 表，同样会 miss 缓存。但 Windows 的 fallback 是序列化 HTML 提取 tag 名（`serializeTreeFn`），碰巧返回了正确值。Android 的 fallback 是 `getNodeName` JNI 调用，在某些情况下返回了错误值。

## 解决方案

从 lexbor C 头文件 `tag/const.h` 自动生成正确的 `KNOWN_TAGS` 表。

修改文件：`src/lib/lexbor/tag-names.js`

关键映射对比：
| 标签 | 旧 ID（错误） | 新 ID（正确） |
|------|-------------|-------------|
| html | 1 | 101 |
| head | 2 | 97 |
| div | 5 | 51 |
| form | 25 | 87 |
| script | 51 | 161 |
| table | 12 | 178 |
| td | 14 | 180 |
| a | 8 | 6 |
| p | 7 | 145 |
| span | 6 | 170 |

## 调试过程中排除的假设

### 假设 1: querySelectorAll 返回错误句柄

通过 JNI C 层日志验证：`lxb_selectors_find` 返回的节点句柄完全正确（都是 div，不是 script）。问题不在 C 层。

### 假设 2: C → JS 句柄传递有精度损失

通过对比 C 层和 JS 层的句柄值验证：`-5476376659771681312`（JS）的无符号值 = `0xB40000715E9978A0`（C），完全匹配。句柄传递无损。

### 假设 3: JS 层看到 script 节点是 querySelectorAll 的 bug

实际上是 `getTagNameById` 返回了错误的 tag 名。用 `mod.getNodeName`（直接 JNI 调用）验证：节点确实是 div，不是 script。是缓存表的 ID 错误导致查到了错误的 tag 名。

## 相关文件

- `src/lib/lexbor/tag-names.js` — **修复文件**，KNOWN_TAGS 表 ID 从 lexbor `tag/const.h` 重新生成
- `src/lib/lexbor/lexbor-android.js` — `scopedFind` 使用 `getTagNameById` 构造 `>` 选择器
- `src/lib/lexbor/bin/lexbor-android-arm64-v8a/include/lexbor/tag/const.h` — lexbor tag 枚举定义（权威来源）
- `src/utils/selectors.js` — thread 选择器第 163 行：`>table[id=$pid|...]`
- `src/lib/lexbor/debug/2026-05-19-scoped-find-direct-child.md` — 之前关于 `scopedFind` 的调试记录
