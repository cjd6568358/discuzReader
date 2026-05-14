### TODO
[x] navigation header需要重构

### 以后如果修改了 lexbor_jni.cpp ，需要重新编译 .so 文件。windows平台可以用以下命令：
```
$ndkBin = "D:\Program Files\Android\Sdk\ndk\27.1.12297006\toolchains\llvm\prebuilt\windows-x86_64\bin"
& "$ndkBin\aarch64-linux-android24-clang++.cmd" -shared -fPIC -o "android\app\src\main\jniLibs\arm64-v8a\liblexbor_jni.so" "android\app\src\main\cpp\lexbor_jni.cpp" "-Isrc\lib\lexbor\bin\lexbor-android-arm64-v8a\include" "-Landroid\app\src\main\jniLibs\arm64-v8a" -llexbor -llog -std=c++17 -fexceptions -O2
```