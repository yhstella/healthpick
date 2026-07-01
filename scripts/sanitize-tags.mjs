#!/usr/bin/env node
// 태그 sanitizer — frontmatter tags 항목의 슬래시(/) 제거.
// 이유: /tag/{tag}/ 라우트가 슬래시로 깨져 Astro/Vercel 빌드 실패.
// LLM 이 prompt 의 "tags 슬래시 금지" 를 가끔 위반하므로 커밋 전 결정적으로 정리한다.
// (2026-07-01 "노트북 A/S" 태그로 production 배포 실패 후 도입)
//
// 사용: node scripts/sanitize-tags.mjs   (전체 스캔·수정, 수정 개수 출력)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ART = join(ROOT, 'src', 'content', 'articles');
const CATS = ['health', 'living', 'finance', 'tech', 'auto', 'travel', 'study'];

let fixed = 0;
const changes = [];

for (const cat of CATS) {
  let files;
  try { files = readdirSync(join(ART, cat)); } catch { continue; }
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const p = join(ART, cat, f);
    const txt = readFileSync(p, 'utf-8');
    const nl = txt.includes('\r\n') ? '\r\n' : '\n';
    const norm = txt.replace(/\r\n/g, '\n');
    // frontmatter 의 tags 블록만 대상 (두 번째 --- 이전)
    const fmEnd = norm.indexOf('\n---\n', 3);
    if (fmEnd < 0) continue;
    const fm = norm.slice(0, fmEnd);
    const body = norm.slice(fmEnd);
    // tags: 블록 안의 "- ..." 라인에서 슬래시 제거
    const tagsMatch = fm.match(/^tags:\n((?:[ ]+-[ ]+.*\n?)+)/m);
    if (!tagsMatch) continue;
    let block = tagsMatch[1];
    if (!block.includes('/')) continue;
    const newBlock = block.replace(/^([ ]+-[ ]+.*)$/gm, (line) => {
      if (!line.includes('/')) return line;
      // 슬래시를 공백으로 (A/S → A S) 후 중복 공백 정리, 따옴표 보존
      const cleaned = line.replace(/\//g, ' ').replace(/  +/g, ' ');
      changes.push(`${cat}/${f}: ${line.trim()} → ${cleaned.trim()}`);
      return cleaned;
    });
    if (newBlock !== block) {
      const newFm = fm.replace(tagsMatch[1], newBlock);
      const out = (newFm + body).replace(/\n/g, nl);
      writeFileSync(p, out, 'utf-8');
      fixed++;
    }
  }
}

console.log(`[sanitize-tags] 슬래시 태그 수정: ${fixed}편`);
for (const c of changes) console.log(`  ${c}`);
