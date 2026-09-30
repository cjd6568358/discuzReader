# patches/

本目录存放 [patch-package](https://github.com/ds300/patch-package) 补丁。
`package.json` 的 `postinstall` 会在每次 `yarn install` 后自动应用，
CI 无需任何额外配置。

补丁文件本身必须是**纯标准 diff**（`diff --git` + `---`/`+++` + hunk），
不要在里面加注释 —— patch-package 对格式敏感，注释会被当成内容导致解析失败。
说明一律写在本文件里。

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

## 相关背景：为什么需要 Gradle 9

RN 0.84 的模板把 Gradle wrapper 从 `8.13` 升到了 `9.0.0`
（见 `android/gradle/wrapper/gradle-wrapper.properties`）。
注意 RN 0.84 用的仍是 **AGP 8.12.0**，不是 AGP 9 —— 后者要到 RN 0.87 才引入。
