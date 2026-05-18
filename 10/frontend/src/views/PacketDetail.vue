<template>
  <div class="detail-page">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <div class="header-title">
          <h1 class="page-title">抓包详情</h1>
          <div class="header-meta">
            <el-tag size="small" :type="getMethodType(packet?.method)" effect="dark">
              {{ packet?.method }}
            </el-tag>
            <span class="packet-id">#{{ packet?.id }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button :type="packet?.is_starred ? 'warning' : ''" @click="handleToggleStar">
          <el-icon><StarFilled v-if="packet?.is_starred" /><Star v-else /></el-icon>
          {{ packet?.is_starred ? '已收藏' : '收藏' }}
        </el-button>
        <el-button type="primary" :loading="replaying" @click="handleReplay">
          <el-icon><RefreshRight /></el-icon>
          重放请求
        </el-button>
        <el-dropdown @command="handleExport" trigger="click">
          <el-button type="success">
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">导出为 JSON</el-dropdown-item>
              <el-dropdown-item command="xml">导出为 XML</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="danger" @click="handleDelete">
          <el-icon><Delete /></el-icon>
          删除记录
        </el-button>
      </div>
    </div>

    <div v-if="packet" class="detail-content">
      <div class="info-grid">
        <div class="info-card main-info">
          <div class="card-header">
            <el-icon :size="20"><Link /></el-icon>
            <h3>请求信息</h3>
          </div>
          <div class="url-display">
            <span class="url-scheme">{{ getUrlScheme(packet.url) }}</span>
            <span class="url-host">{{ getUrlHost(packet.url) }}</span>
            <span class="url-path">{{ getUrlPath(packet.url) }}</span>
          </div>
          <div class="info-row">
            <div class="info-item">
              <span class="info-label">状态码</span>
              <span class="status-badge" :class="getStatusCodeClass(packet.status_code)">
                {{ packet.status_code || '-' }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">请求时间</span>
              <span class="info-value">{{ formatTime(packet.time) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">内容大小</span>
              <span class="info-value">{{ formatSize(packet.content_length) }}</span>
            </div>
          </div>
        </div>

        <div class="info-card tags-card">
          <div class="card-header">
            <el-icon :size="20"><CollectionTag /></el-icon>
            <h3>标签管理</h3>
          </div>
          <div class="tags-input-wrapper">
            <el-input
              v-model="tagsInput"
              placeholder="输入标签，用逗号分隔"
              @blur="saveTags"
              @keyup.enter="saveTags"
              class="tags-input"
            />
            <el-button type="primary" @click="saveTags" :loading="saving">
              保存
            </el-button>
          </div>
          <div class="tags-list">
            <el-tag
              v-for="(tag, index) in tagsList"
              :key="index"
              closable
              @close="removeTag(index)"
              size="large"
              effect="light"
            >
              {{ tag }}
            </el-tag>
            <el-tag v-if="tagsList.length === 0" type="info" size="large" effect="light">
              暂无标签，点击输入框添加
            </el-tag>
          </div>
          <div v-if="packet.has_sensitive" class="sensitive-warning">
            <el-icon color="var(--danger-500)"><WarningFilled /></el-icon>
            <span>检测到敏感信息</span>
          </div>
        </div>
      </div>

      <div class="info-card meta-card">
        <div class="card-header">
          <el-icon :size="20"><InfoFilled /></el-icon>
          <h3>基本信息</h3>
        </div>
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12" :md="8">
            <div class="meta-item">
              <span class="meta-label">Host</span>
              <span class="meta-value">{{ packet.host || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="meta-item">
              <span class="meta-label">Path</span>
              <span class="meta-value">{{ packet.path || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="meta-item">
              <span class="meta-label">协议</span>
              <span class="meta-value">{{ packet.protocol || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="meta-item">
              <span class="meta-label">内容类型</span>
              <span class="meta-value">{{ packet.content_type || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="meta-item">
              <span class="meta-label">来源文件</span>
              <span class="meta-value">{{ packet.source_file || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="meta-item">
              <span class="meta-label">敏感信息</span>
              <el-tag v-if="packet.has_sensitive" type="danger" size="small" effect="dark">包含</el-tag>
              <el-tag v-else type="success" size="small" effect="dark">不包含</el-tag>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="content-card">
        <el-tabs v-model="activeTab" class="detail-tabs" type="border-card">
          <el-tab-pane label="请求头" name="request_headers">
            <div class="code-wrapper">
              <div class="code-actions">
                <span class="code-label">Request Headers</span>
                <el-button size="small" text @click="copyToClipboard(packet.request_headers)">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
              </div>
              <pre class="code-block">{{ packet.request_headers || '无请求头' }}</pre>
            </div>
          </el-tab-pane>
          <el-tab-pane label="请求体" name="request_body">
            <div class="code-wrapper">
              <div class="code-actions">
                <span class="code-label">Request Body</span>
                <div class="format-actions">
                  <el-button size="small" text @click="requestBodyFormat = 'raw'">原始</el-button>
                  <el-button size="small" text @click="requestBodyFormat = 'formatted'">格式化</el-button>
                  <el-button size="small" text @click="copyToClipboard(packet.request_body)">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                </div>
              </div>
              <pre class="code-block">{{ formatContent(packet.request_body, requestBodyFormat) }}</pre>
            </div>
          </el-tab-pane>
          <el-tab-pane label="响应头" name="response_headers">
            <div class="code-wrapper">
              <div class="code-actions">
                <span class="code-label">Response Headers</span>
                <el-button size="small" text @click="copyToClipboard(packet.response_headers)">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
              </div>
              <pre class="code-block">{{ packet.response_headers || '无响应头' }}</pre>
            </div>
          </el-tab-pane>
          <el-tab-pane label="响应体" name="response_body">
            <div class="code-wrapper">
              <div class="code-actions">
                <span class="code-label">Response Body</span>
                <div class="format-actions">
                  <el-button size="small" text @click="responseBodyFormat = 'raw'">原始</el-button>
                  <el-button size="small" text @click="responseBodyFormat = 'formatted'">格式化</el-button>
                  <el-button size="small" text @click="copyToClipboard(packet.response_body)">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                </div>
              </div>
              <pre class="code-block">{{ formatContent(packet.response_body, responseBodyFormat) }}</pre>
            </div>
          </el-tab-pane>
          <el-tab-pane label="原始请求" name="raw_request">
            <div class="code-wrapper">
              <div class="code-actions">
                <span class="code-label">Raw Request</span>
                <el-button size="small" text @click="copyToClipboard(packet.raw_request)">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
              </div>
              <pre class="code-block">{{ packet.raw_request || '无原始请求' }}</pre>
            </div>
          </el-tab-pane>
          <el-tab-pane label="原始响应" name="raw_response">
            <div class="code-wrapper">
              <div class="code-actions">
                <span class="code-label">Raw Response</span>
                <el-button size="small" text @click="copyToClipboard(packet.raw_response)">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
              </div>
              <pre class="code-block">{{ packet.raw_response || '无原始响应' }}</pre>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <div v-else class="loading-container">
      <el-icon :size="48" class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <el-dialog v-model="replayDialogVisible" title="重放请求结果" width="900px" class="replay-dialog">
      <div v-if="replayResult" class="replay-content">
        <div class="replay-info">
          <el-tag :type="getStatusCodeType(replayResult.status_code)" effect="dark" size="large">
            {{ replayResult.status_code }}
          </el-tag>
          <span class="replay-method">{{ replayResult.method }}</span>
          <span class="replay-url">{{ replayResult.url }}</span>
        </div>
        <el-tabs v-model="replayActiveTab">
          <el-tab-pane label="响应头" name="headers">
            <pre class="code-block">{{ replayResult.headers || '无响应头' }}</pre>
          </el-tab-pane>
          <el-tab-pane label="响应体" name="body">
            <pre class="code-block">{{ formatContent(replayResult.body, 'formatted') }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
      <div v-else-if="replayError" class="replay-error">
        <el-icon color="var(--danger-500)" :size="32"><WarningFilled /></el-icon>
        <p>重放失败: {{ replayError }}</p>
      </div>
      <div v-else class="replay-loading">
        <el-icon :size="32" class="is-loading"><Loading /></el-icon>
        <p>正在重放请求...</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { packetApi } from '../api'

const route = useRoute()
const router = useRouter()
const packet = ref(null)
const activeTab = ref('request_headers')
const tagsInput = ref('')
const saving = ref(false)
const replaying = ref(false)
const requestBodyFormat = ref('formatted')
const responseBodyFormat = ref('formatted')
const replayDialogVisible = ref(false)
const replayResult = ref(null)
const replayError = ref('')
const replayActiveTab = ref('body')

const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

const tagsList = computed(() => {
  if (!packet.value?.tags) return []
  return packet.value.tags.split(',').filter(t => t.trim())
})

const loadDetail = async () => {
  try {
    const res = await packetApi.getDetail(route.params.id)
    packet.value = res.data
    tagsInput.value = packet.value.tags || ''
  } catch (e) {
    ElMessage.error('加载详情失败')
  }
}

const saveTags = async () => {
  if (!packet.value) return
  saving.value = true
  try {
    await packetApi.updateTags(packet.value.id, tagsInput.value)
    packet.value.tags = tagsInput.value
    ElMessage.success('标签已保存')
  } catch (e) {
    ElMessage.error('保存标签失败')
  } finally {
    saving.value = false
  }
}

const removeTag = (index) => {
  const list = [...tagsList.value]
  list.splice(index, 1)
  tagsInput.value = list.join(',')
  saveTags()
}

const copyToClipboard = async (text) => {
  if (!text) {
    ElMessage.warning('没有可复制的内容')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

const formatContent = (content, format) => {
  if (!content) return '无内容'
  if (format === 'raw') return content
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

const goBack = () => {
  router.push('/')
}

const handleToggleStar = async () => {
  if (!packet.value) return
  try {
    const res = await packetApi.toggleStar(packet.value.id)
    packet.value.is_starred = res.data.is_starred
    ElMessage.success(packet.value.is_starred ? '已收藏' : '已取消收藏')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleExport = async (format) => {
  if (!packet.value) return
  try {
    const res = await packetApi.export([packet.value.id], format)
    const filename = `packet_${packet.value.id}_${Date.now()}.${format}`
    downloadFile(res.data, filename)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

const handleReplay = async () => {
  if (!packet.value) return
  replaying.value = true
  replayDialogVisible.value = true
  replayResult.value = null
  replayError.value = ''
  replayActiveTab.value = 'body'
  try {
    const res = await packetApi.replay(packet.value.id)
    replayResult.value = res.data
    ElMessage.success('重放成功')
  } catch (e) {
    replayError.value = e.response?.data?.error || e.message || '未知错误'
    ElMessage.error('重放失败')
  } finally {
    replaying.value = false
  }
}

const getStatusCodeType = (code) => {
  if (!code) return 'info'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'info'
  if (code >= 400 && code < 500) return 'warning'
  if (code >= 500) return 'danger'
  return 'info'
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？此操作不可恢复。', '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
    await packetApi.delete(packet.value.id)
    ElMessage.success('删除成功')
    router.push('/')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const getMethodType = (method) => {
  const types = {
    'GET': 'success',
    'POST': 'primary',
    'PUT': 'warning',
    'DELETE': 'danger',
    'PATCH': 'warning',
    'OPTIONS': 'info',
    'HEAD': 'info'
  }
  return types[method] || 'info'
}

const getStatusCodeClass = (code) => {
  if (!code) return 'status-default'
  if (code >= 200 && code < 300) return 'status-success'
  if (code >= 300 && code < 400) return 'status-info'
  if (code >= 400 && code < 500) return 'status-warning'
  if (code >= 500) return 'status-danger'
  return 'status-default'
}

const getUrlScheme = (url) => {
  if (!url) return ''
  const match = url.match(/^(https?:\/\/)/)
  return match ? match[1] : ''
}

const getUrlHost = (url) => {
  if (!url) return ''
  const withoutScheme = url.replace(/^https?:\/\//, '')
  const pathIndex = withoutScheme.indexOf('/')
  return pathIndex > 0 ? withoutScheme.substring(0, pathIndex) : withoutScheme
}

const getUrlPath = (url) => {
  if (!url) return ''
  const withoutScheme = url.replace(/^https?:\/\//, '')
  const pathIndex = withoutScheme.indexOf('/')
  return pathIndex > 0 ? withoutScheme.substring(pathIndex) : ''
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.back-btn {
  color: var(--text-tertiary);
}

.back-btn:hover {
  color: var(--text-primary);
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.packet-id {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.info-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-6);
}

.info-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  color: var(--text-primary);
}

.card-header h3 {
  font-size: var(--text-lg);
  font-weight: 600;
  margin: 0;
}

.url-display {
  font-family: var(--font-mono);
  font-size: 13px;
  padding: var(--space-4);
  background: var(--gray-950);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  line-height: 1.6;
  word-break: break-all;
}

.url-scheme {
  color: var(--text-muted);
}

.url-host {
  color: var(--primary-400);
}

.url-path {
  color: var(--text-secondary);
}

.info-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.info-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: var(--text-base);
  color: var(--text-primary);
  font-weight: 500;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 28px;
  padding: 0 var(--space-3);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.status-success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success-500);
}

.status-info {
  background: rgba(59, 130, 246, 0.15);
  color: var(--info-500);
}

.status-warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning-500);
}

.status-danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger-500);
}

.status-default {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.tags-input-wrapper {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.tags-input {
  flex: 1;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-height: 32px;
  align-items: center;
}

.sensitive-warning {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-3);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: var(--danger-500);
  font-size: var(--text-sm);
}

.meta-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}

.meta-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  word-break: break-all;
  font-family: var(--font-mono);
}

.content-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.code-wrapper {
  padding: var(--space-4);
}

.code-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.code-label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-weight: 500;
}

.format-actions {
  display: flex;
  gap: var(--space-1);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16);
  color: var(--text-tertiary);
}

.loading-container p {
  margin-top: var(--space-4);
  font-size: var(--text-sm);
}

/* Tabs 样式覆盖 */
:deep(.el-tabs--border-card) {
  border: none;
  background: transparent;
}

:deep(.el-tabs__header) {
  margin: 0;
  padding: 0 var(--space-6);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

:deep(.el-tabs__item) {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  font-weight: 500;
}

:deep(.el-tabs__item.is-active) {
  color: var(--primary-400);
}

:deep(.el-tabs__active-bar) {
  background: var(--primary-500);
}

:deep(.el-tabs__nav-wrap::after) {
  background: var(--border-color);
}

:deep(.el-tabs__content) {
  padding: 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left {
    flex-wrap: wrap;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .info-card,
  .meta-card,
  .content-card {
    padding: var(--space-4);
  }

  .code-actions {
    flex-direction: column;
    gap: var(--space-2);
    align-items: flex-start;
  }
}

:deep(.replay-dialog) {
  --el-dialog-bg-color: var(--bg-elevated);
  --el-dialog-border-color: var(--border-color);
}

.replay-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.replay-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-4);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.replay-method {
  font-weight: 600;
  color: var(--text-primary);
}

.replay-url {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  word-break: break-all;
  flex: 1;
  min-width: 200px;
}

.replay-error,
.replay-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-12);
  color: var(--text-tertiary);
}

.replay-error p {
  color: var(--danger-500);
  margin: 0;
}

.replay-loading p {
  margin: 0;
}

:deep(.replay-dialog .el-tabs__content) {
  padding: 0;
}
</style>
