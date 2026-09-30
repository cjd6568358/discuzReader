### TODO

[x] navigation header需要重构
[x] Thread View 性能太差，需要优化
[x] Item样式优化，Forum/Thread
[x] Forum 支持屏蔽,改为加载更多

### 环境搭建（新机器从零到出 APK）

#### 0. ABI 范围：只做 arm64-v8a

**本项目只针对 `arm64-v8a`（64 位 ARM 真机）构建，不产出也不支持其他 ABI。** 相关影响：

- **模拟器装不上。** Android 模拟器通常是 `x86_64`，而本项目不包含该架构的原生库，安装后会因找不到 `.so` 直接崩溃。**必须用 arm64 真机验证。**
- **不生成分架构 APK。** 项目没有配置 `splits`，所以 release 只产出一个包含 arm64 库的通用 APK，文件名是 `app-release.apk`（**不是** `app-arm64-v8a-release.apk`）。
- **不要**把 `android/gradle.properties` 里的 `reactNativeArchitectures` 改成多值。改了它，`reanimated`/`screens`/`mmkv` 等原生依赖会为多个 ABI 编译，构建时间和体积显著膨胀，而 `abiFilters 'arm64-v8a'` 最终仍只打包 arm64，属于白做功。

arm64 这一范围由**三处配置共同保证**，改动时需保持一致：

| 位置 | 作用 |
| --- | --- |
| `android/app/build.gradle` 的 `ndk.abiFilters 'arm64-v8a'` | 决定 APK **打包**哪些 ABI |
| `android/gradle.properties` 的 `reactNativeArchitectures=arm64-v8a` | 决定原生依赖**编译**哪些 ABI |
| `package.json` 的 `yarn android` 带 `--active-arch-only` | 仅影响 `run-android` 调试部署 |

#### 1. 必需的外部环境

以下三项都**不在仓库里**，必须自行安装。版本要与 `android/build.gradle` 保持一致，否则会构建失败或产生难以定位的原生错误。

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| JDK | **17** | Gradle 8.13 / AGP 8.8.2 不支持 JDK 21+ |
| Android SDK | compileSdk **35**、buildTools **35.0.0** | 需接受 licenses |
| Android NDK | **27.1.12297006** | **必需，不是可选项**，见下方说明 |

NDK 必需的原因：`react-native-reanimated`、`react-native-screens`、`react-native-mmkv` 三个依赖都自带 `CMakeLists.txt`，会被 autolink 后**从源码编译**原生代码。缺 NDK 或 CMake 会在构建这些库时报错。

CMake 通常**无需手动安装**：`android/app/build.gradle` 没有显式指定 `externalNativeBuild.cmake.version`，AGP 会使用它自带的默认版本。若该版本缺失，AGP 一般会通过 sdkmanager 自动拉取（前提是 licenses 已接受）。为减少不确定性，CI 里显式预装了 `cmake;3.22.1`。若本地构建报 CMake 相关错误，执行 `sdkmanager --install "cmake;3.22.1"` 即可。

> 注意：lexbor 的 `.so` 是**预编译产物且已提交进仓库**（`android/app/src/main/jniLibs/arm64-v8a/`），构建时直接打包，不参与编译。只有在你修改了 `lexbor_jni.cpp` 时才需要手动重编，见文末。

#### 2. 配置 SDK 路径

`android/local.properties` **被 .gitignore 排除**，全新 clone 后不存在，必须手动创建。否则 Gradle 会报 `SDK location not found`——这是新机器上最常见的第一个失败点。

两种方式任选其一：

方式一，创建 `android/local.properties`（推荐，不污染全局环境）：
```properties
sdk.dir=C\:\\Users\\<你的用户名>\\AppData\\Local\\Android\\Sdk
```

方式二，设置环境变量 `ANDROID_HOME` 指向 SDK 根目录。

#### 3. 安装依赖并构建

```bash
yarn install                 # 或 npm install
cd android && ./gradlew assembleRelease   # Windows: gradlew.bat assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`（已内嵌 arm64-v8a 原生库）

调试运行用 `yarn android`（`package.json` 里已带 `--active-arch-only`，只构建 arm64，需连接 arm64 真机）。

#### 4. 签名说明

本项目仅供个人使用、不对外分发，**debug 与 release 统一使用仓库内的 `android/app/debug.keystore`**（别名 `androiddebugkey`，密码 `android`）。因此本地和 CI 的构建行为完全一致，**无需配置任何密钥或 `-P` 参数**。

该文件本就随 React Native 模板提交入库，公开可知，仅适用于不分发的场景。

**iOS 不在本项目范围内**：`ios/` 目录为 RN 模板残留，未做任何适配，项目也不产出 iOS 产物。

### lexbor调试指南

#### 每次对话调试都需要在 src\lib\lexbor\debug 目录下记录生成对话调试记录，同时需要标识该对话涉及到的bug是否已解决，以便于后续问题排查

#### lexbor 的两层结构与文件说明

lexbor 相关产物分**两层**，理解这一点能避免改错文件：

| | `liblexbor.so` | `liblexbor_jni.so` |
| --- | --- | --- |
| 是什么 | **lexbor 本体**（第三方 C 语言 HTML 解析库） | **本项目的 JNI 胶水层** |
| 作者 | lexbor 上游项目 | 本项目，源码为 `android/app/src/main/cpp/lexbor_jni.cpp` |
| 体积 | 3.44 MB | 0.07 MB |
| 导出符号 | 2085 个 `lxb_*`（如 `lxb_html_document_create`） | 恰好 15 个 `Java_com_discuzreader_LexborModule_*` |
| 仓库内有源码吗 | **没有**（只有 250 个 `.h` 头文件） | **有**，即上述 `.cpp` |
| 能在 CI 重建吗 | **不能**，丢失后只能从上游恢复 | **能** |

调用链：`JS` → `LexborModule.kt` → `liblexbor_jni.so`（转字符串、管句柄表、UTF-8 边界） → `liblexbor.so`（真正的解析与 CSS 选择器引擎）。`_jni.so` 在运行时依赖 `liblexbor.so`（`readelf -d` 可见 `NEEDED: liblexbor.so`）。

**因此：改 `lexbor_jni.cpp` 只需重编 `liblexbor_jni.so`（71 KB），`liblexbor.so` 完全不用动。**

#### lexbor文档参考

1. `src\lib\lexbor\lexbor-window.js` 是window端高性能的 HTML 解析引擎包装，提供 cheerio 兼容的 API，并且已经成功通过测试用例
2. `src\lib\lexbor\lexbor-android.js` 是android端类似lexbor-window.js实现
3. **`android\app\src\main\jniLibs\arm64-v8a\liblexbor.so` 是 lexbor 的 C 库编译产物**，针对 ARM64 (arm64-v8a) Android 设备的共享库，用于替换 react-native-cheerio。这是**真正参与链接与打包的那一份**，体积 3.44 MB。
   `src\lib\lexbor\arm64-v8a\lib\` 下的 `liblexbor.so` 与 `liblexbor_static.a` **只是 lexbor 上游仓库的备份**（静态库仅供将来改为静态链接时备用）。该目录**不参与构建**，保留是为了日后排查/升级 lexbor，请勿删除，也不要让构建去引用它。该路径下真正在用的是 `include\`（编译 `liblexbor_jni.so` 时的 `-I` 指向它）。
4. `src\lib\lexbor\docs` 是lexbor的API文档，尤其关注`src\lib\lexbor\docs\modules\selectors.md` 选择器部分
5. `android\app\src\main\cpp\lexbor_jni.cpp` 是lexbor HTML 解析器的 Android JNI 层，编译后生成 `liblexbor_jni.so`，它依赖 `liblexbor.so`，对外导出 `Java_com_discuzreader_LexborModule_nativeXxx` 系列 JNI 函数，供 Kotlin 层 `System.loadLibrary("lexbor_jni")` 加载调用。
6. `android\app\src\main\java\com\discuzreader\LexborModule.kt` 是React Native 的 Native Module 桥接层，把 C++ JNI 方法暴露给 JS 端使用
7. `android\app\src\main\cpp\CMakeLists.txt` 是 lexbor_jni 的 CMake 构建脚本，但**当前没有被任何 build.gradle 的 externalNativeBuild 引用**，属于备用配置。修改 `lexbor_jni.cpp` 后必须按下方命令手动重编 `.so`，否则改动不会生效

#### 关于 .so 的位置：`jniLibs` 是 Gradle 约定目录

`android\app\src\main\jniLibs\<ABI>\` 是 **Gradle 约定的原生库目录**，只有放在这里的 `.so` 才会被打包进 APK。当前：

- `jniLibs\arm64-v8a\` 存放 `liblexbor.so` 与 `liblexbor_jni.so`，**两者都会进 APK**；
- `src\lib\lexbor\arm64-v8a\lib\` 不在约定目录内，**不参与打包**（该目录下约 16 MB 的二进制仅作为上游备份留在仓库里）。

这一点也决定了合并方向：`.so` **必须**留在 `jniLibs`，不能反向把 `jniLibs` 指到 `src\lib` 去。

#### 修改了 lexbor_jni.cpp ，需要重新编译 .so 文件

**推荐：交给 CI 构建，本地无需安装 NDK。**

改动 `android/app/src/main/cpp/` 下的文件后，推送到 GitHub 会自动触发 `.github/workflows/build-lexbor-jni.yml`；也可以到 Actions 页面手动 `workflow_dispatch` 触发。

构建完成后在对应 run 的 **Artifacts** 里下载 `liblexbor_jni-arm64-v8a`（即 `liblexbor_jni.so`），覆盖到本仓库的 `android/app/src/main/jniLibs/arm64-v8a/` 即可。

该 workflow 除了编译，还会：
1. 用 `readelf -d` 打印链接依赖（应含 `liblexbor.so` 与 `liblog.so`）；
2. **自动校验符号**——从 `LexborModule.kt` 的 `external fun` 声明反推期望的 JNI 符号，与 `.so` 实际导出的符号比对，不一致直接让构建失败。这样不会出现「改了 cpp 却忘了重编」或符号名拼错却静默通过的情况。

**备选：本地编译（需自行安装 NDK 27.1.12297006）。** Windows 平台可用以下命令：

```
$ndkBin = "D:\Program Files\Android\Sdk\ndk\27.1.12297006\toolchains\llvm\prebuilt\windows-x86_64\bin"
& "$ndkBin\aarch64-linux-android24-clang++.cmd" -shared -fPIC -o "android\app\src\main\jniLibs\arm64-v8a\liblexbor_jni.so" "android\app\src\main\cpp\lexbor_jni.cpp" "-Isrc\lib\lexbor\arm64-v8a\include" "-Landroid\app\src\main\jniLibs\arm64-v8a" -llexbor -llog -std=c++17 -fexceptions -O2
```

由Agent自行决定是否需要清除gradlew缓存
