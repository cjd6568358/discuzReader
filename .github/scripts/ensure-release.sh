#!/usr/bin/env bash
#
# 确保 Release <tag> 存在，并把产物传上去。两个 workflow 共用。
#
# 用法：
#   ensure-release.sh <tag> <title> <notes> <asset> [<asset>...]
#
# 为什么要重试：创建 Release 是这条链路里最容易失败的一步 —— GitHub 偶发
# 返回 500（`HTTP 500 (https://api.github.com/repos/<repo>/releases)`）。
# 构建本身已经跑完、artifact 也传了，就因为一次 5xx 让整个 run 判失败、
# 拿不到 Release 直链，代价太大。这里对 5xx / 网络错误做退避重试。
#
# 注意只重试「可重试」的失败：4xx（权限不足、名字非法等）重试多少次都一样，
# 直接报错退出，避免把真正的配置问题拖成 60 秒的等待。
#
# 需要调用方注入 GH_TOKEN 与 GH_REPO（gh 会自动读取后者）。

set -euo pipefail

MAX_ATTEMPTS=4

tag="${1:?用法: ensure-release.sh <tag> <title> <notes> <asset>...}"
title="${2:?缺少 title}"
notes="${3:?缺少 notes}"
shift 3

if [ "$#" -eq 0 ]; then
  echo "::error::至少要给一个待上传的产物路径"
  exit 1
fi

# 重试跑一个命令：只对 5xx / 网络类错误重试。
# 判定方式是把 gh 的输出看一遍 —— 出现 5xx 或常见网络错误字样才算可重试。
# 拿不到确切状态码时（gh 的输出格式不保证稳定）宁可重试：
# 多等几十秒远比漏掉一个真实故障便宜。
retry() {
  local desc="$1"; shift
  local attempt=1 out

  while :; do
    if out="$("$@" 2>&1)"; then
      printf '%s\n' "$out"
      return 0
    fi

    # 4xx 是确定性问题，重试无意义。
    if printf '%s' "$out" | grep -qE '\bHTTP 4[0-9][0-9]\b'; then
      printf '%s\n' "$out" >&2
      echo "::error::${desc} 失败（4xx，重试无用）" >&2
      return 1
    fi

    if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
      printf '%s\n' "$out" >&2
      echo "::error::${desc} 失败：已重试 ${MAX_ATTEMPTS} 次仍不成功" >&2
      return 1
    fi

    local wait=$((attempt * 10))
    echo "::warning::${desc} 第 ${attempt} 次失败，${wait}s 后重试：$(printf '%s' "$out" | head -1)"
    sleep "$wait"
    attempt=$((attempt + 1))
  done
}

# 已存在就跳过创建：同 commit 重跑时不该报错（gh release create 对已存在的
# tag 会以 422 失败），顺带也天然容错「别的 job 抢先建好了」的竞态。
if gh release view "$tag" >/dev/null 2>&1; then
  echo "release ${tag} 已存在，直接补传 asset"
else
  # --target 必须显式指定：不指定的话 gh 会把 tag 打在仓库默认分支的最新提交上，
  # 而不是本次构建的 commit —— 那样 Release 与产物就对不上了。
  # 由 GITHUB_SHA 提供（runner 自带，指向本次触发的那次提交）。
  retry "创建 release ${tag}" \
    gh release create "$tag" \
      --title "$title" \
      --prerelease \
      --target "${GITHUB_SHA:?缺少 GITHUB_SHA，无法确定 tag 该指向哪个提交}" \
      --notes "$notes"
  echo "::notice::release ${tag} 已创建"
fi

# 逐个上传。--clobber 让重传幂等，配合上面的重试可以安全地重复执行。
for asset in "$@"; do
  if [ ! -f "$asset" ]; then
    echo "::error::找不到待上传产物 ${asset}"
    ls -la dist/ 2>/dev/null || true
    exit 1
  fi
  retry "上传 ${asset}" gh release upload "$tag" "$asset" --clobber
  echo "::notice::release ${tag} 已更新：${asset}"
done
