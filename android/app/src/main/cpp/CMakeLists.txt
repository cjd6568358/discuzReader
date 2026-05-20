cmake_minimum_required(VERSION 3.10)
project(lexbor_jni)

set(LEXBOR_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../src/lib/lexbor/arm64-v8a/include")

add_library(lexbor SHARED IMPORTED)
set_target_properties(lexbor PROPERTIES
    IMPORTED_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/liblexbor.so"
)

add_library(lexbor_jni SHARED lexbor_jni.cpp)
target_include_directories(lexbor_jni PRIVATE ${LEXBOR_INCLUDE_DIR})
target_link_libraries(lexbor_jni lexbor log)
