<template>
  <div class="import-page">
    <div class="page-header">
      <div class="page-title-section">
        <h1 class="page-title">数据导入</h1>
        <p class="page-desc">导入 BurpSuite 抓包数据，支持多种格式</p>
      </div>
    </div>

    <div class="content-grid">
      <div class="main-content">
        <div class="import-card upload-card">
          <div class="card-header">
            <el-icon :size="20" color="var(--primary-400)"><UploadFilled /></el-icon>
            <h3>文件上传</h3>
          </div>
          <p class="card-desc">支持 BurpSuite 导出的 XML、JSON 格式文件</p>

          <el-upload
            ref="upload"
            class="upload-area"
            drag
            action="/api/import"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            :limit="1"
            accept=".xml,.json,.txt"
          >
            <div class="upload-inner">
              <div class="upload-icon-wrapper">
                <el-icon :size="56" class="upload-icon"><UploadFilled /></el-icon>
              </div>
              <div class="upload-text">
                <span class="upload-main">将文件拖到此处，或<em>点击上传</em></span>
                <span class="upload-sub">支持 .xml, .json, .txt 格式，单个文件不超过 100MB</span>
              </div>
            </div>
          </el-upload>

          <transition name="slide">
            <div v-if="selectedFile" class="file-info">
              <div class="file-info-left">
                <div class="file-icon">
                  <el-icon :size="24"><Document /></el-icon>
                </div>
                <div class="file-details">
                  <span class="file-name">{{ selectedFile.name }}</span>
                  <span class="file-size">{{ formatSize(selectedFile.size) }}</span>
                </div>
              </div>
              <div class="file-info-right">
                <el-button type="primary" :loading="uploading" @click="handleUpload">
                  <el-icon><Check /></el-icon>
                  开始导入
                </el-button>
                <el-button @click="clearFile">
                  <el-icon><Close /></el-icon>
                  移除
                </el-button>
              </div>
            </div>
          </transition>
        </div>

        <div class="import-card paste-card">
          <div class="card-header">
            <el-icon :size="20" color="var(--success-500)"><EditPen /></el-icon>
            <h3>粘贴导入</h3>
          </div>
          <p class="card-desc">直接粘贴 BurpSuite 的原始数据内容</p>

          <el-input
            v-model="pasteContent"
            type="textarea"
            :rows="12"
            placeholder="请粘贴 BurpSuite 导出的 XML、JSON 或原始 HTTP 请求/响应内容..."
            class="paste-textarea"
            resize="vertical"
          />

          <div class="paste-actions">
            <el-button type="primary" :loading="pasting" @click="handlePasteImport">
              <el-icon><Check /></el-icon>
              导入粘贴内容
            </el-button>
            <el-button @click="pasteContent = ''">
              <el-icon><RefreshRight /></el-icon>
              清空
            </el-button>
          </div>
        </div>
      </div>

      <div class="side-content">
        <div class="guide-card">
          <div class="card-header">
            <el-icon :size="20" color="var(--warning-500)"><QuestionFilled /></el-icon>
            <h3>使用说明</h3>
          </div>

          <div class="guide-steps">
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>导出数据</h4>
                <p>在 BurpSuite 的 Proxy HTTP history 中选中要导出的请求</p>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>保存文件</h4>
                <p>右键点击选中的请求，选择 "Save items"，选择 XML 格式保存</p>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>导入数据</h4>
                <p>在本页面上传保存的文件，或直接粘贴内容</p>
              </div>
            </div>
          </div>
        </div>

        <div class="format-cards">
          <div class="format-card">
            <div class="format-icon xml">
              <el-icon :size="24"><Notebook /></el-icon>
            </div>
            <div class="format-info">
              <h4>XML 格式</h4>
              <p>BurpSuite 原生导出格式，包含最完整的请求响应信息</p>
              <el-tag type="primary" size="small" effect="dark">推荐使用</el-tag>
            </div>
          </div>

          <div class="format-card">
            <div class="format-icon json">
              <el-icon :size="24"><Document /></el-icon>
            </div>
            <div class="format-info">
              <h4>JSON 格式</h4>
              <p>结构化数据，便于程序处理和二次开发</p>
            </div>
          </div>

          <div class="format-card">
            <div class="format-icon raw">
              <el-icon :size="24"><Tickets /></el-icon>
            </div>
            <div class="format-info">
              <h4>原始文本</h4>
              <p>直接复制的 HTTP 请求/响应原始内容</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { importApi } from '../api'

const router = useRouter()
const upload = ref(null)
const selectedFile = ref(null)
const uploading = ref(false)
const pasting = ref(false)
const pasteContent = ref('')

const handleFileChange = (file) => {
  selectedFile.value = file.raw
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

const clearFile = () => {
  selectedFile.value = null
  upload.value?.clearFiles()
}

const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  uploading.value = true
  try {
    const res = await importApi.importFile(selectedFile.value)
    ElMessage.success(res.data.message || '导入成功')
    clearFile()
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.error) || '导入失败')
  } finally {
    uploading.value = false
  }
}

const handlePasteImport = async () => {
  if (!pasteContent.value.trim()) {
    ElMessage.warning('请输入要导入的内容')
    return
  }

  pasting.value = true
  try {
    const blob = new Blob([pasteContent.value], { type: 'text/plain' })
    const file = new File([blob], 'pasted_content.txt', { type: 'text/plain' })
    const res = await importApi.importFile(file)
    ElMessage.success(res.data.message || '导入成功')
    pasteContent.value = ''
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.error) || '导入失败')
  } finally {
    pasting.value = false
  }
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.import-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-6);
  align-items: start;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.import-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.card-header h3 {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 0 0 var(--space-4);
}

.upload-area {
  width: 100%;
}

.upload-inner {
  padding: var(--space-8) var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.upload-icon-wrapper {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  color: var(--primary-400);
}

.upload-text {
  text-align: center;
}

.upload-main {
  display: block;
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.upload-main em {
  color: var(--primary-400);
  font-style: normal;
  font-weight: 500;
}

.upload-sub {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.file-info-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
}

.file-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary-400);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.file-info-right {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.paste-textarea {
  margin-bottom: var(--space-4);
}

.paste-actions {
  display: flex;
  gap: var(--space-2);
}

.side-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  position: sticky;
  top: var(--space-6);
}

.guide-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.step-item {
  display: flex;
  gap: var(--space-3);
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  color: white;
  font-size: var(--text-sm);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-content h4 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-1);
}

.step-content p {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}

.format-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.format-card {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.format-card:hover {
  border-color: var(--border-color-light);
  transform: translateX(4px);
}

.format-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.format-icon.xml {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary-400);
}

.format-icon.json {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success-500);
}

.format-icon.raw {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-500);
}

.format-info h4 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-1);
}

.format-info p {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0 0 var(--space-2);
  line-height: 1.4;
}

/* Element Plus 覆盖 */
:deep(.el-upload-dragger) {
  background: var(--bg-secondary);
  border-color: var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

:deep(.el-upload-dragger:hover) {
  border-color: var(--primary-500);
  background: rgba(99, 102, 241, 0.02);
}

:deep(.el-upload-dragger.is-dragover) {
  border-color: var(--primary-500);
  background: rgba(99, 102, 241, 0.05);
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all var(--transition-normal);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式 */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .side-content {
    position: static;
  }
}

@media (max-width: 768px) {
  .import-card,
  .guide-card {
    padding: var(--space-4);
  }

  .upload-inner {
    padding: var(--space-6) var(--space-4);
  }

  .file-info {
    flex-direction: column;
    align-items: stretch;
  }

  .file-info-right {
    justify-content: flex-end;
  }
}
</style>
