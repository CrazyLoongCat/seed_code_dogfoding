<template>
  <div class="packets-page">
    <div class="page-header">
      <div class="page-title-section">
        <h1 class="page-title">抓包记录</h1>
        <p class="page-desc">管理和分析所有导入的 HTTP 流量数据</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" @click="$router.push('/import')">
          <el-icon><Upload /></el-icon>
          导入数据
        </el-button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-total">
        <div class="stat-icon">
          <el-icon :size="24"><DataLine /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">总抓包数</div>
          <div class="stat-value">{{ stats.total || 0 }}</div>
        </div>
      </div>

      <div class="stat-card stat-sensitive">
        <div class="stat-icon">
          <el-icon :size="24"><Warning /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">敏感信息</div>
          <div class="stat-value">{{ stats.sensitive_count || 0 }}</div>
        </div>
      </div>

      <div class="stat-card stat-methods">
        <div class="stat-icon">
          <el-icon :size="24"><Operation /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">HTTP 方法</div>
          <div class="stat-tags">
            <el-tag
              v-for="(count, method) in stats.methods || {}"
              :key="method"
              :type="getMethodType(method)"
              size="small"
              effect="dark"
            >
              {{ method }} {{ count }}
            </el-tag>
          </div>
        </div>
      </div>

      <div class="stat-card stat-status">
        <div class="stat-icon">
          <el-icon :size="24"><Histogram /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">状态码分布</div>
          <div class="stat-tags">
            <el-tag
              v-for="(count, code) in getStatusGroups()"
              :key="code"
              :type="getStatusType(code)"
              size="small"
              effect="dark"
            >
              {{ code }}xx {{ count }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="content-card">
      <div class="toolbar">
        <div class="filter-section">
          <div class="filter-group">
            <el-input
              v-model="filters.search"
              placeholder="搜索 URL、Host、Path、请求/响应内容..."
              clearable
              class="search-input"
              @keyup.enter="loadData"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <el-select v-model="filters.method" placeholder="方法" clearable class="filter-select">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
            <el-option label="PATCH" value="PATCH" />
            <el-option label="OPTIONS" value="OPTIONS" />
          </el-select>

          <el-select v-model="filters.status_code" placeholder="状态码" clearable class="filter-select">
            <el-option label="2xx 成功" value="200" />
            <el-option label="3xx 重定向" value="300" />
            <el-option label="4xx 客户端错误" value="400" />
            <el-option label="5xx 服务器错误" value="500" />
          </el-select>

          <el-select v-model="filters.has_sensitive" placeholder="敏感信息" clearable class="filter-select">
            <el-option label="包含" value="true" />
            <el-option label="不包含" value="false" />
          </el-select>

          <el-select v-model="filters.is_starred" placeholder="收藏" clearable class="filter-select">
            <el-option label="已收藏" value="true" />
            <el-option label="未收藏" value="false" />
          </el-select>

          <el-button type="primary" @click="loadData">
            <el-icon><Filter /></el-icon>
            筛选
          </el-button>

          <el-button @click="resetFilters">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </div>

        <div class="action-section">
          <el-dropdown @command="handleExport" trigger="click">
            <el-button type="success" :disabled="selectedIds.length === 0">
              <el-icon><Download /></el-icon>
              导出选中 ({{ selectedIds.length }})
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="json">导出为 JSON</el-dropdown-item>
                <el-dropdown-item command="xml">导出为 XML</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-dropdown @command="(cmd) => handleExportAll(cmd)" trigger="click">
            <el-button type="success" plain>
              <el-icon><Download /></el-icon>
              导出全部
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="json">导出全部为 JSON</el-dropdown-item>
                <el-dropdown-item command="xml">导出全部为 XML</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-button type="danger" :disabled="selectedIds.length === 0" @click="handleDeleteSelected">
            <el-icon><Delete /></el-icon>
            删除选中 ({{ selectedIds.length }})
          </el-button>
          <el-button type="danger" plain @click="handleDeleteAll">
            <el-icon><DeleteFilled /></el-icon>
            清空全部
          </el-button>
        </div>
      </div>

      <div class="table-container">
        <el-table
          :data="packets"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
          stripe
          style="width: 100%"
          :row-class-name="tableRowClassName"
        >
          <el-table-column type="selection" width="48" />
          <el-table-column prop="id" label="ID" width="60" align="center" />
          <el-table-column prop="method" label="方法" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="getMethodType(row.method)" size="small" effect="dark">
                {{ row.method }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status_code" label="状态码" width="80" align="center" sortable>
            <template #default="{ row }">
              <span class="status-badge" :class="getStatusCodeClass(row.status_code)">
                {{ row.status_code || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="url" label="URL" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="url-cell">
                <span class="url-scheme">{{ getUrlScheme(row.url) }}</span>
                <span class="url-host">{{ getUrlHost(row.url) }}</span>
                <span class="url-path">{{ getUrlPath(row.url) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="host" label="Host" width="160" show-overflow-tooltip />
          <el-table-column prop="content_length" label="大小" width="80" align="right" sortable>
            <template #default="{ row }">
              {{ formatSize(row.content_length) }}
            </template>
          </el-table-column>
          <el-table-column label="收藏" width="50" align="center">
            <template #default="{ row }">
              <el-icon
                :class="['star-icon', { 'is-starred': row.is_starred }]"
                :size="18"
                @click.stop="handleToggleStar(row)"
              >
                <StarFilled v-if="row.is_starred" />
                <Star v-else />
              </el-icon>
            </template>
          </el-table-column>

          <el-table-column label="敏感" width="60" align="center">
            <template #default="{ row }">
              <el-tooltip v-if="row.has_sensitive" content="包含敏感信息" placement="top">
                <el-icon color="var(--danger-500)" :size="18"><WarningFilled /></el-icon>
              </el-tooltip>
              <span v-else class="no-sensitive">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="time" label="时间" width="160" sortable="custom">
            <template #default="{ row }">
              <span class="time-cell">{{ formatTime(row.time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right" align="center">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button type="primary" link @click="viewDetail(row)">
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
                <el-button type="danger" link @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.per_page"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { packetApi, statsApi } from '../api'

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

const router = useRouter()
const loading = ref(false)
const packets = ref([])
const selectedIds = ref([])
const stats = ref({})

const filters = reactive({
  search: '',
  method: '',
  status_code: '',
  has_sensitive: '',
  is_starred: ''
})

const pagination = reactive({
  page: 1,
  per_page: 20,
  total: 0,
  pages: 0
})

const sort = reactive({
  sort_by: 'time',
  sort_order: 'desc'
})

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      per_page: pagination.per_page,
      sort_by: sort.sort_by,
      sort_order: sort.sort_order,
      ...filters
    }
    const res = await packetApi.getList(params)
    packets.value = res.data.items
    pagination.total = res.data.total
    pagination.pages = res.data.pages
  } catch (e) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const res = await statsApi.getStats()
    stats.value = res.data
  } catch (e) {
    console.error('加载统计失败', e)
  }
}

const resetFilters = () => {
  filters.search = ''
  filters.method = ''
  filters.status_code = ''
  filters.has_sensitive = ''
  filters.is_starred = ''
  pagination.page = 1
  loadData()
}

const handleToggleStar = async (row) => {
  try {
    const res = await packetApi.toggleStar(row.id)
    row.is_starred = res.data.is_starred
    ElMessage.success(row.is_starred ? '已收藏' : '已取消收藏')
    loadStats()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleExport = async (format) => {
  try {
    const res = await packetApi.export(selectedIds.value, format)
    const filename = `packets_${Date.now()}.${format}`
    downloadFile(res.data, filename)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

const handleExportAll = async (format) => {
  try {
    const res = await packetApi.export([], format)
    const filename = `all_packets_${Date.now()}.${format}`
    downloadFile(res.data, filename)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item.id)
}

const handleSortChange = ({ prop, order }) => {
  if (prop === 'time' || prop === 'status_code' || prop === 'content_length') {
    sort.sort_by = prop === 'content_length' ? 'time' : prop
    sort.sort_order = order === 'ascending' ? 'asc' : 'desc'
    loadData()
  }
}

const handleSizeChange = (size) => {
  pagination.per_page = size
  pagination.page = 1
  loadData()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadData()
}

const viewDetail = (row) => {
  router.push(`/packet/${row.id}`)
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await packetApi.delete(row.id)
    ElMessage.success('删除成功')
    loadData()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleDeleteSelected = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条记录吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await packetApi.deleteBatch(selectedIds.value)
    ElMessage.success('删除成功')
    loadData()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleDeleteAll = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有抓包记录吗？此操作不可恢复！', '确认清空', {
      type: 'warning',
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
    await packetApi.deleteAll()
    ElMessage.success('清空成功')
    loadData()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('清空失败')
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

const getStatusCodeType = (code) => {
  if (!code) return 'info'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'info'
  if (code >= 400 && code < 500) return 'warning'
  if (code >= 500) return 'danger'
  return 'info'
}

const getStatusCodeClass = (code) => {
  if (!code) return 'status-default'
  if (code >= 200 && code < 300) return 'status-success'
  if (code >= 300 && code < 400) return 'status-info'
  if (code >= 400 && code < 500) return 'status-warning'
  if (code >= 500) return 'status-danger'
  return 'status-default'
}

const getStatusGroups = () => {
  const groups = {}
  const statusCodes = stats.value.status_codes || {}
  for (const [code, count] of Object.entries(statusCodes)) {
    const group = code.charAt(0) + 'xx'
    groups[group] = (groups[group] || 0) + count
  }
  return groups
}

const getStatusType = (code) => {
  if (code.startsWith('2')) return 'success'
  if (code.startsWith('3')) return 'info'
  if (code.startsWith('4')) return 'warning'
  if (code.startsWith('5')) return 'danger'
  return 'info'
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

const tableRowClassName = ({ row }) => {
  if (row.is_starred) return 'row-starred'
  if (row.has_sensitive) return 'row-sensitive'
  return ''
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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style scoped>
.packets-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-title-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.page-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  transition: all var(--transition-normal);
  cursor: default;
}

.stat-card:hover {
  border-color: var(--border-color-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-total .stat-icon {
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary-400);
}

.stat-sensitive .stat-icon {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger-500);
}

.stat-methods .stat-icon {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success-500);
}

.stat-status .stat-icon {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning-500);
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-1);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.stat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: var(--space-1);
}

.content-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-color);
}

.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.filter-group {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.search-input {
  width: 280px;
}

.filter-select {
  width: 140px;
}

.action-section {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.table-container {
  padding: 0 var(--space-6);
  overflow-x: auto;
}

.table-actions {
  display: flex;
  gap: var(--space-1);
  justify-content: center;
}

.url-cell {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.4;
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

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
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

.time-cell {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

.no-sensitive {
  color: var(--text-muted);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--border-color);
}

.row-starred {
  background: rgba(99, 102, 241, 0.05) !important;
}

.row-sensitive {
  background: rgba(239, 68, 68, 0.03) !important;
}

.star-icon {
  cursor: pointer;
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.star-icon:hover {
  color: var(--warning-500);
  transform: scale(1.2);
}

.star-icon.is-starred {
  color: var(--warning-500);
}

/* Element Plus 覆盖 */
:deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-text-color: var(--text-secondary);
  --el-table-header-text-color: var(--text-tertiary);
  --el-table-row-hover-bg-color: var(--bg-tertiary);
  --el-table-border-color: var(--border-color);
  --el-table-header-bg-color: var(--bg-secondary);
}

:deep(.el-table th) {
  background: var(--bg-secondary) !important;
  font-weight: 600;
}

:deep(.el-table .el-table__row:hover) {
  background: var(--bg-tertiary) !important;
}

:deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: var(--text-secondary);
  --el-pagination-hover-text-color: var(--text-primary);
  --el-pagination-button-bg-color: var(--bg-secondary);
  --el-pagination-button-disabled-bg-color: var(--bg-tertiary);
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    padding: var(--space-4);
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .action-section {
    flex-wrap: wrap;
  }

  .table-container {
    padding: 0 var(--space-4);
  }
}
</style>
