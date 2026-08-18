import request from './request'

// 全局搜索：跨日报 + 问题联合检索
export function searchApi(keyword) {
  return request.get('/search', { params: { keyword } })
}
