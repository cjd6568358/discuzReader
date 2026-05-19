### TODO
[x] navigation header需要重构

### lexbor调试指南

#### 每次对话调试都需要在 src\lib\lexbor\debug 目录下记录生成对话调试记录，同时需要标识该对话涉及到的bug是否已解决，以便于后续问题排查

#### lexbor文档参考
1. src\lib\lexbor\lexbor-native.js 是window端高性能的 HTML 解析引擎包装，提供 cheerio 兼容的 API，并且已经成功通过测试用例

2. src\lib\lexbor\lexbor.js 是android端类似lexbor-native.js实现，目前还未正常通过测试

3. src\lib\lexbor\bin\lexbor-android-arm64-v8a\lib\liblexbor.so 是 lexbor 的 C 库编译产物，针对 ARM64 (arm64-v8a) Android 设备的共享库，用于替换react-native-cheerio

4. src\lib\lexbor\docs 是lexbor的API文档，尤其关注src\lib\lexbor\docs\modules\selectors.md 选择器部分

5. android\app\src\main\cpp\lexbor_jni.cpp 是lexbor HTML 解析器的 Android JNI 层，编译后生成 liblexbor_jni.so，它依赖 liblexbor.so，对外导出 Java_com_discuzreader_LexborModule_nativeXxx 系列 JNI 函数，供 Kotlin 层 System.loadLibrary("lexbor_jni") 加载调用。

6. android\app\src\main\java\com\discuzreader\LexborModule.kt 是React Native 的 Native Module 桥接层，把 C++ JNI 方法暴露给 JS 端使用

#### 修改了 lexbor_jni.cpp ，需要重新编译 .so 文件。windows平台可以用以下命令：
```
$ndkBin = "D:\Program Files\Android\Sdk\ndk\27.1.12297006\toolchains\llvm\prebuilt\windows-x86_64\bin"
& "$ndkBin\aarch64-linux-android24-clang++.cmd" -shared -fPIC -o "android\app\src\main\jniLibs\arm64-v8a\liblexbor_jni.so" "android\app\src\main\cpp\lexbor_jni.cpp" "-Isrc\lib\lexbor\bin\lexbor-android-arm64-v8a\include" "-Landroid\app\src\main\jniLibs\arm64-v8a" -llexbor -llog -std=c++17 -fexceptions -O2
```
自行决定是否需要清除gradlew缓存
