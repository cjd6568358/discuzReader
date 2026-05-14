#include <jni.h>
#include <android/log.h>
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <cstring>
#include <mutex>

#include "lexbor/html/html.h"
#include "lexbor/dom/dom.h"
#include "lexbor/css/css.h"
#include "lexbor/selectors/selectors.h"

#define TAG "LexborJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

struct DocContext {
    lxb_html_document_t* doc;
    lxb_css_parser_t* cssParser;
    lxb_selectors_t* selectors;
    std::unordered_map<std::string, lxb_css_selector_list_t*> selectorCache;
};

static std::unordered_map<jlong, DocContext*> g_contexts;
static jlong g_nextHandle = 1;
static std::mutex g_mutex;

struct SerializeBuffer {
    std::string data;
};

static lxb_status_t serializeCallback(const lxb_char_t* data, size_t len, void* ctx) {
    if (data && len > 0) {
        auto* buf = static_cast<SerializeBuffer*>(ctx);
        buf->data.append(reinterpret_cast<const char*>(data), len);
    }
    return LXB_STATUS_OK;
}

static lxb_status_t matchCallback(lxb_dom_node_t* node, lxb_css_selector_specificity_t spec, void* ctx) {
    return LXB_STATUS_OK;
}

static DocContext* getContext(jlong handle) {
    auto it = g_contexts.find(handle);
    return (it != g_contexts.end()) ? it->second : nullptr;
}

static lxb_css_selector_list_t* getSelectorList(DocContext* ctx, const char* selector) {
    std::string key(selector);
    auto it = ctx->selectorCache.find(key);
    if (it != ctx->selectorCache.end()) {
        return it->second;
    }

    lxb_css_selector_list_t* list = lxb_css_selectors_parse(
        ctx->cssParser,
        reinterpret_cast<const lxb_char_t*>(selector),
        strlen(selector)
    );

    if (list == nullptr || ctx->cssParser->status != LXB_STATUS_OK) {
        LOGE("Failed to parse CSS selector: %s", selector);
        return nullptr;
    }

    ctx->selectorCache[key] = list;
    return list;
}

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_discuzreader_LexborModule_nativeParse(JNIEnv* env, jobject thiz, jstring html) {
    const char* htmlStr = env->GetStringUTFChars(html, nullptr);
    if (!htmlStr) return 0;

    lxb_html_document_t* doc = lxb_html_document_create();
    if (!doc) {
        LOGE("Failed to create HTML document");
        env->ReleaseStringUTFChars(html, htmlStr);
        return 0;
    }

    lxb_status_t status = lxb_html_document_parse(
        doc,
        reinterpret_cast<const lxb_char_t*>(htmlStr),
        strlen(htmlStr)
    );
    env->ReleaseStringUTFChars(html, htmlStr);

    if (status != LXB_STATUS_OK) {
        LOGE("Failed to parse HTML, status: %d", status);
        lxb_html_document_destroy(doc);
        return 0;
    }

    lxb_css_parser_t* cssParser = lxb_css_parser_create();
    status = lxb_css_parser_init(cssParser, nullptr);
    if (status != LXB_STATUS_OK) {
        LOGE("Failed to init CSS parser");
        lxb_html_document_destroy(doc);
        lxb_css_parser_destroy(cssParser, true);
        return 0;
    }

    lxb_selectors_t* selectors = lxb_selectors_create();
    status = lxb_selectors_init(selectors);
    if (status != LXB_STATUS_OK) {
        LOGE("Failed to init selectors");
        lxb_html_document_destroy(doc);
        lxb_css_parser_destroy(cssParser, true);
        lxb_selectors_destroy(selectors, true);
        return 0;
    }

    DocContext* ctx = new DocContext();
    ctx->doc = doc;
    ctx->cssParser = cssParser;
    ctx->selectors = selectors;

    std::lock_guard<std::mutex> lock(g_mutex);
    jlong handle = g_nextHandle++;
    g_contexts[handle] = ctx;
    return handle;
}

JNIEXPORT void JNICALL
Java_com_discuzreader_LexborModule_nativeDestroy(JNIEnv* env, jobject thiz, jlong handle) {
    std::lock_guard<std::mutex> lock(g_mutex);
    auto it = g_contexts.find(handle);
    if (it == g_contexts.end()) return;

    DocContext* ctx = it->second;
    for (auto& pair : ctx->selectorCache) {
        lxb_css_selector_list_destroy_memory(pair.second);
    }
    ctx->selectorCache.clear();
    lxb_selectors_destroy(ctx->selectors, true);
    lxb_css_parser_destroy(ctx->cssParser, true);
    lxb_html_document_destroy(ctx->doc);
    delete ctx;
    g_contexts.erase(it);
}

JNIEXPORT jlong JNICALL
Java_com_discuzreader_LexborModule_nativeGetRoot(JNIEnv* env, jobject thiz, jlong handle) {
    std::lock_guard<std::mutex> lock(g_mutex);
    DocContext* ctx = getContext(handle);
    if (!ctx || !ctx->doc) return 0;

    lxb_dom_node_t* root = lxb_dom_interface_node(ctx->doc);
    return reinterpret_cast<jlong>(root);
}

JNIEXPORT jlongArray JNICALL
Java_com_discuzreader_LexborModule_nativeQuerySelectorAll(
    JNIEnv* env, jobject thiz, jlong handle, jstring selector, jlong rootHandle) {

    DocContext* ctx;
    {
        std::lock_guard<std::mutex> lock(g_mutex);
        ctx = getContext(handle);
    }
    if (!ctx) {
        return env->NewLongArray(0);
    }

    const char* selStr = env->GetStringUTFChars(selector, nullptr);
    if (!selStr) return env->NewLongArray(0);

    lxb_css_selector_list_t* list = getSelectorList(ctx, selStr);
    env->ReleaseStringUTFChars(selector, selStr);

    if (!list) {
        return env->NewLongArray(0);
    }

    lxb_dom_node_t* root = reinterpret_cast<lxb_dom_node_t*>(rootHandle);
    if (!root) return env->NewLongArray(0);

    std::vector<lxb_dom_node_t*> results;
    auto collectCallback = [](lxb_dom_node_t* node, lxb_css_selector_specificity_t spec, void* userData) -> lxb_status_t {
        if (node) {
            auto* vec = static_cast<std::vector<lxb_dom_node_t*>*>(userData);
            vec->push_back(node);
        }
        return LXB_STATUS_OK;
    };

    lxb_selectors_opt_set(ctx->selectors, LXB_SELECTORS_OPT_DEFAULT);
    lxb_status_t status = lxb_selectors_find(
        ctx->selectors, root, list, collectCallback, &results
    );

    if (status != LXB_STATUS_OK) {
        LOGE("querySelectorAll failed, status: %d", status);
        return env->NewLongArray(0);
    }

    jsize count = static_cast<jsize>(results.size());
    jlongArray result = env->NewLongArray(count);
    if (count > 0) {
        std::vector<jlong> handles(count);
        for (jsize i = 0; i < count; i++) {
            handles[i] = reinterpret_cast<jlong>(results[i]);
        }
        env->SetLongArrayRegion(result, 0, count, handles.data());
    }
    return result;
}

JNIEXPORT jboolean JNICALL
Java_com_discuzreader_LexborModule_nativeMatches(
    JNIEnv* env, jobject thiz, jlong handle, jlong nodeHandle, jstring selector) {

    DocContext* ctx;
    {
        std::lock_guard<std::mutex> lock(g_mutex);
        ctx = getContext(handle);
    }
    if (!ctx) return JNI_FALSE;

    const char* selStr = env->GetStringUTFChars(selector, nullptr);
    if (!selStr) return JNI_FALSE;

    lxb_css_selector_list_t* list = getSelectorList(ctx, selStr);
    env->ReleaseStringUTFChars(selector, selStr);

    if (!list) return JNI_FALSE;

    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node) return JNI_FALSE;

    jboolean matched = JNI_FALSE;
    lxb_selectors_opt_set(ctx->selectors, LXB_SELECTORS_OPT_DEFAULT);
    lxb_status_t status = lxb_selectors_match_node(
        ctx->selectors, node, list, matchCallback, nullptr
    );

    if (status == LXB_STATUS_OK) {
        matched = JNI_TRUE;
    }

    return matched;
}

JNIEXPORT jint JNICALL
Java_com_discuzreader_LexborModule_nativeGetNodeType(JNIEnv* env, jobject thiz, jlong nodeHandle) {
    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node) return 0;
    return static_cast<jint>(node->type);
}

JNIEXPORT jstring JNICALL
Java_com_discuzreader_LexborModule_nativeGetNodeName(JNIEnv* env, jobject thiz, jlong nodeHandle) {
    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node) return nullptr;

    lxb_dom_element_t* element = lxb_dom_interface_element(node);
    if (!element) return nullptr;

    size_t nameLen = 0;
    const lxb_char_t* name = lxb_dom_element_local_name(element, &nameLen);
    if (!name || nameLen == 0) return nullptr;

    return env->NewStringUTF(std::string(reinterpret_cast<const char*>(name), nameLen).c_str());
}

JNIEXPORT jstring JNICALL
Java_com_discuzreader_LexborModule_nativeGetAttribute(
    JNIEnv* env, jobject thiz, jlong nodeHandle, jstring attrName) {

    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node) return nullptr;

    lxb_dom_element_t* element = lxb_dom_interface_element(node);
    if (!element) return nullptr;

    const char* nameStr = env->GetStringUTFChars(attrName, nullptr);
    if (!nameStr) return nullptr;

    size_t valueLen = 0;
    const lxb_char_t* value = lxb_dom_element_get_attribute(
        element,
        reinterpret_cast<const lxb_char_t*>(nameStr),
        strlen(nameStr),
        &valueLen
    );
    env->ReleaseStringUTFChars(attrName, nameStr);

    if (!value || valueLen == 0) return nullptr;

    return env->NewStringUTF(std::string(reinterpret_cast<const char*>(value), valueLen).c_str());
}

JNIEXPORT jstring JNICALL
Java_com_discuzreader_LexborModule_nativeGetText(JNIEnv* env, jobject thiz, jlong nodeHandle) {
    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node) return env->NewStringUTF("");

    if (node->type == LXB_DOM_NODE_TYPE_TEXT) {
        lxb_dom_character_data_t* charData = lxb_dom_interface_character_data(node);
        if (charData && charData->data.data && charData->data.length > 0) {
            return env->NewStringUTF(
                std::string(reinterpret_cast<const char*>(charData->data.data), charData->data.length).c_str()
            );
        }
        return env->NewStringUTF("");
    }

    size_t textLen = 0;
    lxb_char_t* text = lxb_dom_node_text_content(node, &textLen);
    if (!text || textLen == 0) return env->NewStringUTF("");

    jstring result = env->NewStringUTF(std::string(reinterpret_cast<const char*>(text), textLen).c_str());
    lxb_dom_document_destroy_text(node->owner_document, text);
    return result;
}

JNIEXPORT jstring JNICALL
Java_com_discuzreader_LexborModule_nativeGetInnerHtml(JNIEnv* env, jobject thiz, jlong nodeHandle) {
    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node) return env->NewStringUTF("");

    SerializeBuffer buf;
    lxb_status_t status = lxb_html_serialize_deep_cb(node, serializeCallback, &buf);

    if (status != LXB_STATUS_OK || buf.data.empty()) {
        return env->NewStringUTF("");
    }

    return env->NewStringUTF(buf.data.c_str());
}

JNIEXPORT jlong JNICALL
Java_com_discuzreader_LexborModule_nativeGetParent(JNIEnv* env, jobject thiz, jlong nodeHandle) {
    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node || !node->parent) return 0;
    return reinterpret_cast<jlong>(node->parent);
}

JNIEXPORT jlong JNICALL
Java_com_discuzreader_LexborModule_nativeGetFirstChild(JNIEnv* env, jobject thiz, jlong nodeHandle) {
    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node || !node->first_child) return 0;
    return reinterpret_cast<jlong>(node->first_child);
}

JNIEXPORT jlong JNICALL
Java_com_discuzreader_LexborModule_nativeGetNextSibling(JNIEnv* env, jobject thiz, jlong nodeHandle) {
    lxb_dom_node_t* node = reinterpret_cast<lxb_dom_node_t*>(nodeHandle);
    if (!node || !node->next) return 0;
    return reinterpret_cast<jlong>(node->next);
}

}
