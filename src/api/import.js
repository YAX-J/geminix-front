import request from './request'

/** Markdown 批量导入为日报（本地 .md 文件 → 后端解析入库） */
export function importMarkdown(files, opts = {}) {
  return request.post('/import/markdown', { files, ...opts })
}
