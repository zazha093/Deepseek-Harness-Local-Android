#!/usr/bin/env bash
# scripts/apply-fork-ports.sh
# 将 3080→13080, 3083→13083 等端口号替换为 fork 版本
# 使用 word-boundary 匹配，避免误替换 version/id 等数字
# 用法: ./scripts/apply-fork-ports.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

# 项目根目录
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 要替换的文件类型
FILE_PATTERNS=(
    "app/src/main/java/**/*.kt"
    "app/src/main/assets/**/*.mjs"
    "app/src/main/assets/**/*.sh"
    "app/src/main/assets/**/*.js"
    "app/src/main/res/**/*.xml"
    "app/src/main/AndroidManifest.xml"
    "app/build.gradle.kts"
)

# 端口映射：旧端口 -> 新端口
declare -A PORT_MAP=(
    ["3080"]="13080"
    ["3083"]="13083"
    ["3090"]="13090"  # LAN proxy 端口也要 +10000
    ["3082"]="13082"  # Shizuku bridge
    ["3085"]="13085"  # FastPicker/llama-server
)

# 临时文件存储将要修改的行
CHANGES_FILE="${TMPDIR:-~/backups}/fork-port-changes-$(date +%s).txt"
> "$CHANGES_FILE"

echo "=== Fork Port Replacement ==="
echo "Root: $ROOT_DIR"
echo "Dry-run: $DRY_RUN"
echo ""

# 扫描并记录将要修改的行
echo "Scanning for port references..."
for pattern in "${FILE_PATTERNS[@]}"; do
    find . -path "./.git" -prune -o -path "./build" -prune -o -path "./app/build" -prune -o -path "./app/.cxx" -prune -o -type f -name "*" | while IFS= read -r file; do
        # 检查文件是否匹配模式
        matched=false
        for pat in "${FILE_PATTERNS[@]}"; do
            # 简化的模式匹配
            case "$pat" in
                *.kt) [[ "$file" == *.kt ]] && matched=true ;;
                *.mjs) [[ "$file" == *.mjs ]] && matched=true ;;
                *.sh) [[ "$file" == *.sh ]] && matched=true ;;
                *.js) [[ "$file" == *.js ]] && matched=true ;;
                *.xml) [[ "$file" == *.xml ]] && matched=true ;;
                AndroidManifest.xml) [[ "$file" == *AndroidManifest.xml ]] && matched=true ;;
                build.gradle.kts) [[ "$file" == *build.gradle.kts ]] && matched=true ;;
            esac
        done
        [[ "$matched" == true ]] || continue

        # 检查文件中是否包含旧端口号（作为独立单词）
        for old_port in "${!PORT_MAP[@]}"; do
            new_port="${PORT_MAP[$old_port]}"
            # 使用 word boundary (\b) 匹配，避免匹配 version code 等
            if grep -nE "\b$old_port\b" "$file" >/dev/null 2>&1; then
                while IFS= read -r line; do
                    echo "$file:$line" >> "$CHANGES_FILE"
                done < <(grep -nE "\b$old_port\b" "$file")
            fi
        done
    done
done

# 去重并显示将要修改的行
if [[ -s "$CHANGES_FILE" ]]; then
    sort -u "$CHANGES_FILE" > "${CHANGES_FILE}.uniq"
    mv "${CHANGES_FILE}.uniq" "$CHANGES_FILE"

    echo "Found the following lines to change:"
    echo "----------------------------------------"
    cat "$CHANGES_FILE"
    echo "----------------------------------------"
    echo ""

    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY-RUN] No files modified. Run without --dry-run to apply changes."
        rm -f "$CHANGES_FILE"
        exit 0
    fi

    # 执行替换
    echo "Applying changes..."
    for old_port in "${!PORT_MAP[@]}"; do
        new_port="${PORT_MAP[$old_port]}"
        echo "  $old_port → $new_port"

        # 找到所有包含该端口的文件并替换
        find . -path "./.git" -prune -o -path "./build" -prune -o -path "./app/build" -prune -o -path "./app/.cxx" -prune -o -type f \( \
            -name "*.kt" -o -name "*.mjs" -o -name "*.sh" -o -name "*.js" -o -name "*.xml" -o -name "AndroidManifest.xml" -o -name "build.gradle.kts" \
        \) -print0 2>/dev/null | while IFS= read -r -d '' file; do
            if grep -qE "\b$old_port\b" "$file" 2>/dev/null; then
                # 备份
                cp "$file" "$file.bak-port"
                # 使用 sed 进行 word-boundary 替换
                sed -i "s/\b$old_port\b/$new_port/g" "$file"
            fi
        done
    done

    echo ""
    echo "Changes applied. Backups saved as *.bak-port"
    echo "Run 'git diff' to review changes."
else
    echo "No old port references found in tracked files."
fi

rm -f "$CHANGES_FILE"

# 验证：检查是否还有旧端口残留
echo ""
echo "=== Verification ==="
REMAINING=0
for old_port in "${!PORT_MAP[@]}"; do
    count=$(find . -path "./.git" -prune -o -path "./build" -prune -o -path "./app/build" -prune -o -path "./app/.cxx" -prune -o -type f \( \
        -name "*.kt" -o -name "*.mjs" -o -name "*.sh" -o -name "*.js" -o -name "*.xml" -o -name "AndroidManifest.xml" -o -name "build.gradle.kts" \
    \) -exec grep -lE "\b$old_port\b" {} \; 2>/dev/null | wc -l)
    if [[ $count -gt 0 ]]; then
        echo "WARNING: $count file(s) still contain port $old_port"
        REMAINING=$((REMAINING + 1))
    fi
done

if [[ $REMAINING -eq 0 ]]; then
    echo "All old port references have been replaced."
else
    echo "Some old port references remain. Check manually."
fi