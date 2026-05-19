package com.discuzreader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = LexborModule.NAME)
class LexborModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "LexborModule"

        init {
            System.loadLibrary("lexbor_jni")
        }
    }

    override fun getName(): String = NAME

    external fun nativeParse(html: String): Long
    external fun nativeDestroy(handle: Long)
    external fun nativeGetRoot(handle: Long): Long
    external fun nativeQuerySelectorAll(handle: Long, selector: String, rootHandle: Long): LongArray
    external fun nativeMatches(handle: Long, nodeHandle: Long, selector: String): Boolean
    external fun nativeGetNodeType(nodeHandle: Long): Int
    external fun nativeGetNodeName(nodeHandle: Long): String?
    external fun nativeGetAttribute(nodeHandle: Long, attrName: String): String?
    external fun nativeGetText(nodeHandle: Long): String
    external fun nativeGetInnerHtml(nodeHandle: Long): String
    external fun nativeGetParent(nodeHandle: Long): Long
    external fun nativeGetFirstChild(nodeHandle: Long): Long
    external fun nativeGetNextSibling(nodeHandle: Long): Long
    external fun nativeGetLocalNameId(nodeHandle: Long): Int
    external fun nativeFilterDescendants(handles: LongArray, rootHandle: Long): LongArray

    private fun parseHandle(handle: String): Long {
        return handle.toLongOrNull() ?: 0L
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun parseSync(html: String): String {
        return nativeParse(html).toString()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun destroy(handle: String) {
        nativeDestroy(parseHandle(handle))
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getRoot(handle: String): String {
        return nativeGetRoot(parseHandle(handle)).toString()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun querySelectorAll(handle: String, selector: String, rootHandle: String): WritableArray {
        val results = nativeQuerySelectorAll(parseHandle(handle), selector, parseHandle(rootHandle))
        val array = Arguments.createArray()
        for (r in results) {
            array.pushString(r.toString())
        }
        return array
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun matches(handle: String, nodeHandle: String, selector: String): Boolean {
        return nativeMatches(parseHandle(handle), parseHandle(nodeHandle), selector)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getNodeType(nodeHandle: String): Int {
        return nativeGetNodeType(parseHandle(nodeHandle))
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getNodeName(nodeHandle: String): String {
        return nativeGetNodeName(parseHandle(nodeHandle)) ?: ""
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getAttribute(nodeHandle: String, attrName: String): String? {
        return nativeGetAttribute(parseHandle(nodeHandle), attrName)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getText(nodeHandle: String): String {
        return nativeGetText(parseHandle(nodeHandle))
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getInnerHtml(nodeHandle: String): String {
        return nativeGetInnerHtml(parseHandle(nodeHandle))
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getParent(nodeHandle: String): String {
        return nativeGetParent(parseHandle(nodeHandle)).toString()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getFirstChild(nodeHandle: String): String {
        return nativeGetFirstChild(parseHandle(nodeHandle)).toString()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getNextSibling(nodeHandle: String): String {
        return nativeGetNextSibling(parseHandle(nodeHandle)).toString()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getLocalNameId(nodeHandle: String): String {
        return nativeGetLocalNameId(parseHandle(nodeHandle)).toString()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun filterDescendants(handles: ReadableArray, rootHandle: String): WritableArray {
        val longHandles = LongArray(handles.size()) { i -> parseHandle(handles.getString(i) ?: "0") }
        val results = nativeFilterDescendants(longHandles, parseHandle(rootHandle))
        val array = Arguments.createArray()
        for (r in results) {
            array.pushString(r.toString())
        }
        return array
    }
}
