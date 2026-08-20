<template>
  <Teleport to="body">
    <div v-if="ui.importModalOpen" class="overlay" @click.self="close">
      <div class="modal import-modal">
        <div class="modal-head">
          <h3>📥 导入 Markdown 日报</h3>
          <button class="modal-close" @click="close">✕</button>
        </div>

        <div class="modal-body">
          <!-- 导入配置：项目 / 标签 / 非日期文件处理 -->
          <div class="import-opts">
            <div class="opt-row">
              <label>项目</label>
              <input v-model="opts.project" type="text" placeholder="如 ai-recruit / geminix（可选）" />
            </div>
            <div class="opt-row">
              <label>标签</label>
              <input v-model="opts.tagsText" type="text" placeholder="逗号分隔，默认「导入」" />
            </div>
            <div class="opt-row">
              <label>非日期文件</label>
              <select v-model="opts.nonDateMode" class="opt-select">
                <option value="skip">跳过</option>
                <option value="issue">导入为问题</option>
              </select>
            </div>
          </div>

          <!-- 阶段一：选择文件 -->
          <div v-if="!files.length" class="pick-area">
            <label class="pick-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              选择 .md 文件
              <input
                type="file"
                multiple
                accept=".md,.markdown,.txt,text/markdown"
                hidden
                @change="onPick"
              />
            </label>
            <p class="pick-hint">
              支持多选，可直接全选 <code>项目/.workbuddy/memory</code> 或 Obsidian 库目录下的 Markdown 文件。<br />
              文件名含 <code>YYYY-MM-DD</code> 将按日期生成日报，其余自动跳过。
            </p>
          </div>

          <!-- 阶段二：预览待导入清单 -->
          <template v-else>
            <div class="preview-head">
              <span>已选 <b>{{ files.length }}</b> 个文件</span>
              <button class="link-btn" @click="resetPick">重新选择</button>
            </div>
            <div class="file-list">
              <div v-for="(f, i) in files" :key="i" class="file-row" :class="{ dim: f.nonDate || f.duplicate, dup: f.duplicate }">
                <span class="fr-date">{{ f.date || '—' }}</span>
                <span class="fr-name" :title="f.name">{{ f.name }}</span>
                <span class="fr-title">{{ f.title }}</span>
                <span v-if="f.duplicate" class="fr-badge dup">已存在</span>
                <span v-else-if="f.nonDate" class="fr-badge skip">{{ opts.nonDateMode === 'issue' ? '→ 问题' : '跳过' }}</span>
                <span v-else class="fr-badge ok">待导入</span>
              </div>
            </div>

            <!-- 阶段三：导入结果 -->
            <div v-if="result" class="result-box">
              <div class="result-sum">
                ✅ 导入 <b>{{ result.imported }}</b> 条
                <span v-if="result.skipped"> · ⏭ 跳过 <b>{{ result.skipped }}</b> 条</span>
              </div>
              <div class="result-list">
                <div v-for="(r, i) in result.rows" :key="i" class="file-row">
                  <span class="fr-date">{{ r.date || '—' }}</span>
                  <span class="fr-name" :title="r.fileName">{{ r.fileName }}</span>
                  <span class="fr-title">{{ r.reason }}</span>
                  <span class="fr-badge" :class="statusClass(r.status)">{{ statusText(r.status) }}</span>
                </div>
              </div>
            </div>

            <div class="modal-foot">
              <button class="btn btn-ghost" @click="close">关闭</button>
              <button
                v-if="!result"
                class="btn btn-primary"
                :disabled="importing"
                @click="onImport"
              >
                {{ importing ? '导入中…' : `导入 ${files.length} 个文件` }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useReportStore } from '@/stores/reports'
import { useIssueStore } from '@/stores/issues'
import { importMarkdown } from '@/api/import'
import { toast } from '@/utils/toast'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const ui = useUiStore()
const reportStore = useReportStore()
const issueStore = useIssueStore()

const files = ref([])
const importing = ref(false)
const result = ref(null)

/* 导入配置：项目 / 标签 / 非日期文件处理 */
const opts = reactive({ project: '', tagsText: '', nonDateMode: 'skip' })

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function onPick(e) {
  const picked = Array.from(e.target.files || [])
  e.target.value = ''
  if (!picked.length) return

  await reportStore.load()
  const list = []
  for (const file of picked) {
    let content = ''
    try {
      content = await file.text()
    } catch {
      content = ''
    }
    const meta = parsePreview(file.name, content)
    meta.content = content // 保留原文，导入时传给后端解析
    meta.duplicate = !meta.nonDate && reportStore.items.some((r) => r.date === meta.date)
    list.push(meta)
  }
  files.value = list
  result.value = null
}

function resetPick() {
  files.value = []
  result.value = null
}

/** 本地预览解析：文件名 → 日期，首个 # 行 → 标题 */
function parsePreview(name, content) {
  const m = name.match(/(\d{4}-\d{2}-\d{2})/)
  if (!m) return { name, date: '', title: '非日报文件', nonDate: true }
  let title = ''
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (t.startsWith('# ') && t.length > 2) {
      title = t.slice(2).trim()
      break
    }
  }
  return { name, date: m[1], title: title || m[1], nonDate: false }
}

async function onImport() {
  importing.value = true
  const project = opts.project.trim() || ''
  const tags = opts.tagsText
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const effTags = tags.length ? tags : ['导入']
  const nonDateMode = opts.nonDateMode
  try {
    if (USE_MOCK) {
      // 演示模式：本地解析并插入内存 store
      const rows = []
      let imported = 0
      let skipped = 0
      for (const f of files.value) {
        if (f.nonDate) {
          if (nonDateMode === 'issue') {
            const title = (f.title && f.title !== '非日报文件' ? f.title : f.name.replace(/\.(md|markdown|txt)$/i, ''))
            issueStore.addIssue({
              title,
              desc: f.content || '',
              solution: '',
              solutions: [],
              tag: effTags[0],
              project,
              status: 'open',
              favorite: false,
              reportDate: '',
              createdAt: todayStr()
            })
            imported++
            rows.push({ fileName: f.name, date: '', title, status: 'imported', reason: '非日期文件，导入为问题' })
          } else {
            skipped++
            rows.push({ fileName: f.name, date: '', title: f.title, status: 'skipped_non_date', reason: '非日报文件' })
          }
          continue
        }
        if (f.duplicate) {
          skipped++
          rows.push({ fileName: f.name, date: f.date, title: f.title, status: 'skipped_duplicate', reason: '该日期日报已存在' })
          continue
        }
        const tasks = splitTasks(f.content || '', f.title)
        reportStore.addReport({ date: f.date, time: '', title: f.title, tasks, tags: effTags, project })
        imported++
        rows.push({ fileName: f.name, date: f.date, title: f.title, status: 'imported', reason: `导入 ${tasks.length} 条工作内容` })
      }
      result.value = { imported, skipped, rows }
      toast(`导入完成：${imported} 条，跳过 ${skipped} 条`)
      return
    }
    const payload = files.value.map((f) => ({ name: f.name, content: f.content || '' }))
    const data = await importMarkdown(payload, {
      project: project || undefined,
      tags: tags.length ? tags : undefined,
      nonDateMode
    })
    result.value = data
    toast(`导入完成：${data.imported} 条，跳过 ${data.skipped} 条`)
    // 刷新日报/问题列表（后端已入库）
    reportStore.loaded = false
    issueStore.loaded = false
    await Promise.all([reportStore.load(), issueStore.load()])
  } catch (err) {
    toast(err.message || '导入失败')
  } finally {
    importing.value = false
  }
}

/** 按 "## " 小节拆分为工作内容列表（与后端解析一致，供 mock 模式使用） */
function splitTasks(content, title) {
  const tasks = []
  const sections = content.split(/^##\s+/m)
  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i].trim()
    if (!sec) continue
    const nl = sec.indexOf('\n')
    const heading = nl === -1 ? sec : sec.slice(0, nl).trim()
    const body = nl === -1 ? '' : sec.slice(nl + 1).trim()
    tasks.push(body ? `${heading}\n${body}` : heading)
  }
  if (!tasks.length) {
    const body = content.trim().replace(/^#\s+.*$/m, '').trim()
    if (body) tasks.push(body)
  }
  if (!tasks.length) tasks.push(title)
  return tasks
}

function statusText(s) {
  return { imported: '已导入', skipped_duplicate: '已存在', skipped_non_date: '跳过', failed: '失败' }[s] || s
}

function statusClass(s) {
  return {
    imported: 'ok',
    skipped_duplicate: 'dup',
    skipped_non_date: 'skip',
    failed: 'err'
  }[s] || ''
}

function close() {
  if (importing.value) return
  ui.importModalOpen = false
  files.value = []
  result.value = null
}
</script>

<style scoped>
.import-modal .modal-body {
  gap: 14px;
}
.import-opts {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
}
.opt-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.opt-row label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-2);
}
.opt-row input,
.opt-select {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12.5px;
  background: #fff;
  color: var(--text);
  width: 100%;
}
.opt-row input:focus,
.opt-select:focus {
  border-color: var(--primary);
}
@media (max-width: 640px) {
  .import-opts {
    grid-template-columns: 1fr;
  }
}
.pick-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 26px 10px;
}
.pick-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-bg);
  border: 1.5px dashed var(--primary);
  border-radius: 12px;
  padding: 14px 26px;
  cursor: pointer;
  transition: all 0.15s;
}
.pick-btn:hover {
  background: #eef2ff;
  transform: translateY(-1px);
}
.pick-hint {
  font-size: 12.5px;
  color: var(--text-3);
  text-align: center;
  line-height: 1.7;
}
.pick-hint code {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 5px;
  font-size: 11.5px;
}
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-2);
}
.link-btn {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
}
.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  background: var(--bg);
}
.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--card);
  border: 1px solid var(--border);
}
.file-row.dim {
  opacity: 0.55;
}
.file-row.dup {
  background: var(--problem-bg);
  border-color: var(--problem);
}
.fr-date {
  flex-shrink: 0;
  font-weight: 700;
  color: var(--text-2);
  width: 82px;
}
.fr-name {
  flex-shrink: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
  font-weight: 600;
}
.fr-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
}
.fr-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 2px 9px;
}
.fr-badge.ok {
  color: #047857;
  background: #ecfdf5;
}
.fr-badge.dup {
  color: #b45309;
  background: #fffbeb;
}
.fr-badge.skip {
  color: var(--text-3);
  background: var(--bg);
}
.fr-badge.err {
  color: #dc2626;
  background: #fef2f2;
}
.result-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.result-sum {
  font-size: 13.5px;
  color: var(--text);
  background: var(--primary-bg);
  border-radius: 10px;
  padding: 10px 14px;
}
.result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}
</style>
