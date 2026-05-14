package com.discuzreader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
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

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun parse(html: String): Double {
        return nativeParse(html).toDouble()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun destroy(handle: Double) {
        nativeDestroy(handle.toLong())
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getRoot(handle: Double): Double {
        return nativeGetRoot(handle.toLong()).toDouble()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun querySelectorAll(handle: Double, selector: String, rootHandle: Double): com.facebook.react.bridge.WritableArray {
        val results = nativeQuerySelectorAll(handle.toLong(), selector, rootHandle.toLong())
        val array = Arguments.createArray()
        for (r in results) {
            array.pushDouble(r.toDouble())
        }
        return array
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun matches(handle: Double, nodeHandle: Double, selector: String): Boolean {
        return nativeMatches(handle.toLong(), nodeHandle.toLong(), selector)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getNodeType(nodeHandle: Double): Int {
        return nativeGetNodeType(nodeHandle.toLong())
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getNodeName(nodeHandle: Double): String {
        return nativeGetNodeName(nodeHandle.toLong()) ?: ""
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getAttribute(nodeHandle: Double, attrName: String): String? {
        return nativeGetAttribute(nodeHandle.toLong(), attrName)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getText(nodeHandle: Double): String {
        return nativeGetText(nodeHandle.toLong())
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getInnerHtml(nodeHandle: Double): String {
        return nativeGetInnerHtml(nodeHandle.toLong())
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getParent(nodeHandle: Double): Double {
        return nativeGetParent(nodeHandle.toLong()).toDouble()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getFirstChild(nodeHandle: Double): Double {
        return nativeGetFirstChild(nodeHandle.toLong()).toDouble()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getNextSibling(nodeHandle: Double): Double {
        return nativeGetNextSibling(nodeHandle.toLong()).toDouble()
    }
}
