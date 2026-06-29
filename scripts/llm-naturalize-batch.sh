#!/bin/bash
# 병렬 LLM 자연화 batch — N=5 동시 processing
# 사용: bash scripts/llm-naturalize-batch.sh <target-file-list> [concurrency]
#
# 각 file 마다 별도 PowerShell process 호출 → 완전 격리 (같은-file-반복-처리 버그 방지)

set -u

LIST="${1:?need file list}"
CONCURRENCY="${2:-5}"
LOG_DIR="/e/healthpick-logs"
STAMP=$(date +%Y%m%d-%H%M%S)
BATCH_LOG="$LOG_DIR/llm-batch-$STAMP.log"

mkdir -p "$LOG_DIR"
exec >> "$BATCH_LOG" 2>&1
echo "=== batch start @ $(date) concurrency=$CONCURRENCY ==="

REPO_DIR="/c/Users/R/Dropbox/healthpick"
cd "$REPO_DIR" || exit 1

PS_SCRIPT='E:\healthpick\scripts\llm-naturalize.ps1'

total=$(wc -l < "$LIST")
i=0
ok=0
err=0
start_ts=$(date +%s)

# read list
while IFS= read -r relpath; do
  [ -z "$relpath" ] && continue
  i=$((i+1))
  # full path (Windows style for PowerShell)
  winpath=$(echo "$relpath" | sed 's|^src/|C:\\Users\\R\\Dropbox\\healthpick\\src\\|' | sed 's|/|\\|g')

  (
    out=$(powershell -NoProfile -ExecutionPolicy Bypass -File "$PS_SCRIPT" -Files "$winpath" 2>&1)
    rc=$?
    if [ $rc -eq 0 ]; then
      echo "[$i/$total] OK  $relpath"
    else
      echo "[$i/$total] ERR $relpath (rc=$rc)"
    fi
  ) &

  # 동시 N 제한
  while [ "$(jobs -r | wc -l)" -ge "$CONCURRENCY" ]; do
    sleep 1
  done
done < "$LIST"

# 남은 job 대기
wait

end_ts=$(date +%s)
elapsed=$((end_ts - start_ts))
echo "=== batch end @ $(date), elapsed=${elapsed}s ==="
