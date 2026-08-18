<template>
  <div class="md-view" v-html="html"></div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'
import DOMPurify from 'dompurify'
import 'highlight.js/styles/github.css'

const props = defineProps({
  content: { type: String, default: '' },
  inline: { type: Boolean, default: false }
})

// html:false 不解析原始 HTML；linkify 自动链接；breaks 换行转 <br>
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch {
        /* fallthrough */
      }
    }
    return ''
  }
})

const html = computed(() => {
  const raw = props.content || ''
  const rendered = props.inline ? md.renderInline(raw) : md.render(raw)
  return DOMPurify.sanitize(rendered)
})
</script>

<style>
/* Markdown 内容样式（全局限定 .md-view 前缀，避免污染） */
.md-view {
  line-height: 1.65;
  font-size: 13.5px;
  color: var(--text);
  word-break: break-word;
}
.md-view p {
  margin: 0 0 4px;
}
.md-view p:last-child {
  margin-bottom: 0;
}
.md-view ul,
.md-view ol {
  margin: 4px 0 8px;
  padding-left: 20px;
}
.md-view li {
  margin: 2px 0;
}
.md-view a {
  color: var(--primary, #6366f1);
  text-decoration: underline;
}
.md-view code {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Consolas, monospace);
  font-size: 12.5px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  padding: 1px 5px;
}
.md-view pre {
  background: #f6f8fa;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 6px 0 10px;
}
.md-view pre code {
  background: none;
  padding: 0;
  font-size: 12.5px;
  line-height: 1.5;
}
.md-view blockquote {
  border-left: 3px solid var(--border, #e5e7eb);
  padding-left: 12px;
  margin: 6px 0;
  color: var(--text-2);
}
.md-view h1,
.md-view h2,
.md-view h3,
.md-view h4 {
  margin: 10px 0 6px;
  font-weight: 600;
}
.md-view table {
  border-collapse: collapse;
  margin: 6px 0;
}
.md-view th,
.md-view td {
  border: 1px solid var(--border, #e5e7eb);
  padding: 5px 10px;
  font-size: 12.5px;
}
</style>
