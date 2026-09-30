#!/usr/bin/env bash
#
# 生成「代理加速下载地址」txt，按代理域名分组。
#
# 用法：
#   gen-proxy-txt.sh <tag> <repo> <out-file>
#     <tag>       Release tag，如 ci-e73bac6
#     <repo>      owner/repo，如 cjd6568358/discuzReader
#     <out-file>  输出路径，如 proxy_<sha>.txt
#
# 产物清单直接问 GitHub 要（gh release view）。好处是产物增删之后
# 这里无需同步修改；失败的构建根本没进 Release，也就不会出现在 txt 里。
#
# 需要调用方注入 GH_TOKEN。
#
# release 不存在或没有任何产物时：打 notice 并成功退出，不生成文件。

set -euo pipefail

tag="${1:?用法: gen-proxy-txt.sh <tag> <repo> <out-file>}"
repo="${2:?缺少 repo}"
out="${3:?缺少 out-file}"

# 代理列表：增删改这一行即可。
PROXIES="ghfast.top v6.gh-proxy.org hk.gh-proxy.org cdn.gh-proxy.org edgeone.gh-proxy.org"

# release 可能不存在（例如 build job 失败在创建 release 之前），
# 此时 gh 会非零退出，用 || true 压掉以免 set -e 中断。
#
# 产物不做打包，Release 上就是裸文件，所以不过滤扩展名：凡是本 workflow
# 传上去的 asset 都是要列出的产物。仅排除两类关联文件：
#   1. 源码包 —— 由 GitHub 自动生成，不是本次构建产物。注意它的名字是
#      "Source code (zip)" / "Source code (tar.gz)"，**以右括号结尾**，
#      所以按 '\.zip$' 之类匹配是匹不上的，必须按前缀匹配；
#      （实践中 GitHub 的 assets 接口并不返回这两个条目，这里是兜底。）
#   2. proxy_*.txt —— 清单自己。上游那份把 txt 传去 WebDAV 所以碰不到这种情况，
#      本项目把清单也放进同一个 Release，重跑时它会出现在 asset 列表里，
#      不排除的话清单就会把自己列成一项可下载内容（读者已经在看它了）。
assets="$(gh release view "$tag" --repo "$repo" --json assets --jq '.assets[].name' 2>/dev/null \
  | grep -v -e '^Source code ' -e '\.tar\.gz$' -e '\.zip$' -e '^proxy_.*\.txt$' | sort || true)"

if [ -z "$assets" ]; then
  echo "::notice::release $tag 没有产物，跳过生成代理链接 txt"
  exit 0
fi
scope_desc="全部 $(printf '%s\n' "$assets" | wc -l | tr -d ' ') 个产物"

{
  echo "# discuzReader CI 构建产物：代理加速下载地址"
  echo "# release : ${tag}  (${repo})"
  echo "# 范围    : ${scope_desc}"
  echo "# 产物命名：discuzReader_<sha>_arm64-v8a_release.apk / liblexbor_jni_<sha>_arm64-v8a.so"
  echo "# 下面按代理域名分组，每组列出的都是全部产物，取需要的那个即可。"
  echo

  # 只列代理入口，不给 GitHub 直链：这份文件的用途就是走加速，
  # 直链混在里面反而让人在多个域名间多犹豫一次。
  #
  # 用 while read 而不是 `for a in $assets`：后者会把含空格的文件名
  # 按空白拆成好几个不存在的地址（"Source code (zip)" 就会变成三条）。
  # PROXIES 是空格分隔的单行，先拆进数组再遍历，避免同样的问题。
  read -r -a proxy_list <<< "$PROXIES"
  for p in "${proxy_list[@]}"; do
    echo "=== ${p} ==="
    while IFS= read -r a; do
      [ -n "$a" ] || continue
      echo "https://${p}/https://github.com/${repo}/releases/download/${tag}/${a}"
    done <<< "$assets"
    echo
  done

  echo "# 链接形式为 https://<代理域名>/https://github.com/... 的裸串直拼。"
  echo "# 若某个域名下全部 404，说明该代理不认这种拼接形式，换其它域名即可。"
} > "$out"

groups="$(printf '%s' "$PROXIES" | wc -w | tr -d ' ')"
echo "已生成 ${out}：${scope_desc} × ${groups} 个代理域名"
