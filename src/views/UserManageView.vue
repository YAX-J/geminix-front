<template>
  <div class="users-page">
    <header class="page-head">
      <button class="back" @click="$router.replace('/')">← 返回</button>
      <h1>用户管理</h1>
      <span class="sub">管理员专属 · 分配角色 / 重置密码</span>
    </header>

    <div class="table-wrap">
      <table class="user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>角色</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td>
            <td class="mono">{{ u.username }}</td>
            <td>{{ u.nickname || '—' }}</td>
            <td>
              <span class="role-badge" :class="roleClass(u.role)">{{ roleText(u.role) }}</span>
            </td>
            <td class="muted">{{ fmtDate(u.createdAt) }}</td>
            <td class="ops">
              <select
                :value="u.role"
                :disabled="u.id === auth.userInfo?.id"
                @change="onRoleChange(u, $event.target.value)"
              >
                <option value="ADMIN">管理员</option>
                <option value="AUTHOR">作者</option>
                <option value="READER">读者</option>
              </select>
              <button class="btn-mini" @click="onResetPwd(u)">重置密码</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listUsersApi, updateUserRoleApi, resetUserPasswordApi } from '@/api/users'
import { toast } from '@/utils/toast'

const auth = useAuthStore()
const users = ref([])

function roleText(role) {
  return { ADMIN: '管理员', AUTHOR: '作者', READER: '读者' }[role] || role
}
function roleClass(role) {
  return { ADMIN: 'is-admin', AUTHOR: 'is-author', READER: 'is-reader' }[role] || ''
}
function fmtDate(s) {
  if (!s) return '—'
  return String(s).replace('T', ' ').slice(0, 16)
}

async function load() {
  try {
    users.value = await listUsersApi()
  } catch (e) {
    toast(e.message || '加载失败')
  }
}

async function onRoleChange(u, role) {
  if (role === u.role) return
  try {
    await updateUserRoleApi(u.id, role)
    toast(`已将 ${u.username} 设为${roleText(role)}`)
    await load()
  } catch (e) {
    toast(e.message || '修改失败')
    await load()
  }
}

async function onResetPwd(u) {
  const pwd = window.prompt(`为「${u.username}」设置新密码（6-32 位）`)
  if (!pwd) return
  if (pwd.length < 6 || pwd.length > 32) {
    toast('密码长度须为 6-32 位')
    return
  }
  try {
    await resetUserPasswordApi(u.id, pwd)
    toast(`已重置 ${u.username} 的密码`)
  } catch (e) {
    toast(e.message || '重置失败')
  }
}

onMounted(load)
</script>

<style scoped>
.users-page {
  min-height: 100vh;
  background: var(--bg);
  padding: 24px 32px;
}
.page-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 20px;
}
.page-head h1 {
  font-size: 20px;
  font-weight: 700;
}
.page-head .sub {
  font-size: 12px;
  color: var(--text-3);
}
.back {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-2);
}
.table-wrap {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}
.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.user-table th,
.user-table td {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.user-table thead th {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 700;
  background: var(--bg);
}
.user-table tbody tr:last-child td {
  border-bottom: none;
}
.mono {
  font-family: var(--font-mono, monospace);
  font-weight: 600;
}
.muted {
  color: var(--text-3);
}
.role-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.role-badge.is-admin {
  background: #fee2e2;
  color: #b91c1c;
}
.role-badge.is-author {
  background: #dbeafe;
  color: #1d4ed8;
}
.role-badge.is-reader {
  background: #e2e8f0;
  color: #475569;
}
.ops {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ops select {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12px;
  background: var(--bg);
  color: var(--text);
}
.btn-mini {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-2);
}
.btn-mini:hover {
  color: var(--primary);
  border-color: var(--primary);
}
</style>
