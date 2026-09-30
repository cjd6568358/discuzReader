# patches/

本目录存放 [patch-package](https://github.com/ds300/patch-package) 补丁。
`package.json` 的 `postinstall` 会在每次 `yarn install` 后自动应用，
CI 无需任何额外配置。

补丁文件本身必须是**纯标准 diff**（`diff --git` + `---`/`+++` + hunk），
不要在里面加注释 —— patch-package 对格式敏感，注释会被当成内容导致解析失败。
说明一律写在本文件里。

## 命名规则：一个补丁文件只能对应一个包

文件名必须严格是 `<包名>+<版本>.patch`，scope 包写成
`@scope+name+1.2.3.patch`（`@` 保留、`/` 换成 `+`）——这正是
`npx patch-package <pkg>` 自动生成的名字，手写时不要自创格式。

多包合并写是**不行的**。patch-package 解析文件名时会先用 `++` 切分：
单个 `+` 是「包名内分隔符」（`@scope` / `name` / `序列号`），
只有 `++` 才表示「同时给多个包打补丁」（即 `--multiple`）。

我们踩过的坑：曾把 picker 和 screens 的改动合成一个文件命名为
`@react-native-picker+picker+2.11.1+react-native-screens+4.11.1.patch`
（把本该是 `++` 的地方写成了 `+`）。patch-package 把整串当成**一个**包名解析，
版本段取到最后一个 `4.11.1`，于是去找 `node_modules/@react-native-picker/picker/node_modules/react-native-screens`
—— 目录当然不存在。但报出来的**不是**「找不到包」，而是一句很误导的：

```
Unrecognized patch file in patches directory <文件名>
```

原因是 `parseNameAndVersion()` 末尾对「版本号后面的段数」做了限制，
段数超过 2 就返回 `null`，被当成无法识别的文件名**直接跳过**（只 warning，不报错）。
所以真正致命的是**下一步**：`postinstall` 里 patch-package 的退出码仍是 0，
CI 的 `Install dependencies` 步骤显示成功，到 C++ 编译时才以
`-Wdeprecated-declarations` + `-Werror` 的形式炸出来 —— 排查时很容易被
带到「RN 0.84 废弃 API」的方向上去，而真正原因只是补丁压根没应用。

教训：**新增补丁后必须看 `npx patch-package` 的输出**，
每个包都要有一行 `pkg@ver ✔`。只出现 cookies 一行、或者出现
`Unrecognized patch file`，就是文件名写错了。

---

## @react-native-cookies+cookies+6.2.1.patch

**问题**：Gradle 9 把 `jcenter()` 这个 API **整体移除了**（不是废弃，是删掉）。
而 `@react-native-cookies/cookies@6.2.1` 的 `android/build.gradle` 里还在调用它，
导致构建在 evaluate 该 module 时抛异常：

```
A problem occurred evaluating project ':react-native-cookies_cookies'.
> Could not find method jcenter() for arguments [] on repository container
```

**改动**：删掉两处 `jcenter()`：

1. `buildscript {}` 块内（原第 34 行）—— 仅在把 `android/` 当独立工程打开时生效
   （`if (project == rootProject)`），作为 module 被 include 进本项目时本就不执行。
2. 顶层 `repositories {}` 块内（原第 70 行）—— **CI 报错的就是这处**。

**为什么删掉是安全的**：

- jcenter() 早已只读并停止服务，本身已无可下载内容。
- 该项目真正需要的依赖（AGP、`react-android`、Kotlin 等）都在
  `google()` / `mavenCentral()` 里。

**没有一起改、但看着可疑的地方**（都是确认过无需改动的）：

- 该文件写死的默认版本 `compileSdkVersion 29` / `buildToolsVersion '29.0.3'` ——
  两处都走 `safeExtGet()`，优先取根项目的 `ext`
  （本项目为 `36` / `36.0.0`），所以不生效、不用改。
- 依赖行 `implementation 'com.facebook.react:react-native:+'` ——
  看着像老式写法（`node_modules/react-native/android` 这个目录在 RN 0.84 里
  也确实已不存在），但 **React Gradle 插件会自动把它替换成
  `com.facebook.react:react-android:$version`**。
  `react-native-mmkv`、`react-native-webview` 等库都用同样的写法在 RN 0.84 下正常工作，
  **不要改这一行**。

**上游状态**：该库最后版本就是 6.2.1，没有修复此问题的更新版本，
所以在升级 RN 之前这个补丁需要一直保留。

**验证方式**：改完后本地应能通过
`cd android && ./gradlew assembleRelease`；
CI 的 `Build APK` 步骤同样是这个判据。

---

## @react-native-picker+picker+2.11.1.patch

**问题**：RN 0.84 在 `ContextContainer.h` / `ShadowNode.h` 里把
`using Shared = std::shared_ptr<...>` 标记成了 `[[deprecated]]`。
而 picker 的 C++ 代码仍在用 `ContextContainer::Shared`，
RN 自身的 CMake 又开了 `-Wdeprecated-declarations` + `-Werror`，
于是编译直接失败：

```
RNCAndroidDialogPickerMeasurementsManager.h:15:31: error: 'Shared' is deprecated:
  Use std::shared_ptr<const ContextContainer> instead. [-Werror,-Wdeprecated-declarations]
```

**改动**：把两处 `ContextContainer::Shared` 换成等价的新写法
`std::shared_ptr<const ContextContainer>`：

- `RNCAndroidDialogPickerMeasurementsManager.h`（第 15、25 行）
- `RNCAndroidDropdownPickerMeasurementsManager.h`（第 15、25 行）

**为什么等价**：`Shared` 的定义就是 `std::shared_ptr<const ContextContainer>`
（见 `react/utils/ContextContainer.h:28`），这是纯粹的别名替换，
不改变任何语义或 ABI。

**上游状态**：CI 构建时用的是 `^2.11.0` 解析出来的 **2.11.1**。
升级 picker 时先去掉本补丁试构建，上游修了就不用保留。

**注意**：RN 0.84 里 `prefab` 头文件路径会变，
补丁 hunk 的行号依赖 2.11.1 这个具体版本；改版本要重新生成补丁。

---

## react-native-screens+4.11.1.patch

**问题**：与上面同源 —— RN 0.84 给 `ShadowNode::Shared` 加了 `[[deprecated]]`，
screens 的 `RNSScreenShadowNode.h` 仍在用它：

```
RNSScreenShadowNode.h:31:38: error: 'Shared' is deprecated:
  Use std::shared_ptr<const ShadowNode> instead [-Werror,-Wdeprecated-declarations]
```

**改动**：`common/cpp/.../RNSScreenShadowNode.h` 第 31 行
`const ShadowNode::Shared &child` → `const std::shared_ptr<const ShadowNode> &child`。

**为什么等价**：同样是纯别名替换，`ShadowNode::Shared` 就是
`std::shared_ptr<const ShadowNode>`。

**注意**：`package.json` 里写的是 `^4.10.0`，CI 解析到 **4.11.1**。
文件名里的版本必须和实际装到的版本一致，否则 patch-package 会报
「Patch file found for package ... which is not present」，升级依赖后记得同步改名。

**只改了这一处**：screens 其余用到 `Shared` 的地方（如果有）
会以 warning 而非 error 出现，日志里可见的 error 只有这一行。

---

## 相关背景：为什么需要 Gradle 9

RN 0.84 的模板把 Gradle wrapper 从 `8.13` 升到了 `9.0.0`
（见 `android/gradle/wrapper/gradle-wrapper.properties`）。
注意 RN 0.84 用的仍是 **AGP 8.12.0**，不是 AGP 9 —— 后者要到 RN 0.87 才引入。
