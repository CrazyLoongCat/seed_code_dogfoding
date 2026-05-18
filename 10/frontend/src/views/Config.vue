<template>
  <div class="config-page">
    <div class="page-header">
      <div class="page-title-section">
        <h1 class="page-title">系统配置</h1>
        <p class="page-desc">配置系统的各项参数，配置会即时生效</p>
      </div>
    </div>

    <div class="content-grid">
      <div class="main-content">
        <div class="config-card">
          <div class="card-header">
            <el-icon :size="20" color="var(--primary-400)"><Setting /></el-icon>
            <h3>基础设置</h3>
          </div>
          <p class="card-desc">控制数据导入和处理的核心行为</p>

          <div class="form-group">
            <div class="form-row">
              <div class="form-label">
                <span class="label-text">自动解析</span>
                <span class="label-desc">导入文件时自动解析 HTTP 请求和响应</span>
              </div>
              <el-switch v-model="configForm.auto_parse" active-value="true" inactive-value="false" />
            </div>

            <div class="form-row">
              <div class="form-label">
                <span class="label-text">自动打标签</span>
                <span class="label-desc">根据请求特征自动添加标签</span>
              </div>
              <el-switch v-model="configForm.auto_tagging" active-value="true" inactive-value="false" />
            </div>

            <div class="form-row">
              <div class="form-label">
                <span class="label-text">高亮敏感信息</span>
                <span class="label-desc">检测并高亮显示包含敏感信息的请求</span>
              </div>
              <el-switch v-model="configForm.highlight_sensitive" active-value="true" inactive-value="false" />
            </div>
          </div>
        </div>

        <div class="config-card">
          <div class="card-header">
            <el-icon :size="20" color="var(--warning-500)"><Warning /></el-icon>
            <h3>敏感信息检测</h3>
          </div>
          <p class="card-desc">配置敏感信息检测的关键词和规则</p>

          <div class="form-item-full">
            <label class="field-label">敏感关键词</label>
            <el-input
              v-model="configForm.sensitive_keywords"
              type="textarea"
              :rows="3"
              placeholder="用逗号分隔多个关键词，例如：password, token, secret, key"
              class="keyword-input"
            />
            <span class="field-desc">检测敏感信息时使用的关键词列表，多个关键词用逗号分隔</span>
          </div>
        </div>

        <div class="config-card">
          <div class="card-header">
            <el-icon :size="20" color="var(--success-500)"><Grid /></el-icon>
            <h3>显示设置</h3>
          </div>
          <p class="card-desc">自定义列表展示和导出的偏好设置</p>

          <div class="form-row-group">
            <div class="form-item">
              <label class="field-label">默认导出格式</label>
              <el-select v-model="configForm.export_format" class="full-width">
                <el-option label="XML 格式" value="xml" />
                <el-option label="JSON 格式" value="json" />
              </el-select>
            </div>

            <div class="form-item">
              <label class="field-label">每页显示条数</label>
              <el-select v-model="configForm.items_per_page" class="full-width">
                <el-option label="10 条" value="10" />
                <el-option label="20 条" value="20" />
                <el-option label="50 条" value="50" />
                <el-option label="100 条" value="100" />
              </el-select>
            </div>

            <div class="form-item">
              <label class="field-label">主题</label>
              <el-select v-model="configForm.theme" class="full-width">
                <el-option label="深色主题" value="dark" />
                <el-option label="浅色主题" value="light" />
              </el-select>
            </div>
          </div>
        </div>

        <div class="action-bar">
          <el-button type="primary" size="large" :loading="saving" @click="saveConfig">
            <el-icon><Check /></el-icon>
            保存配置
          </el-button>
          <el-button size="large" @click="loadConfig">
            <el-icon><Refresh /></el-icon>
            重置为默认
          </el-button>
        </div>
      </div>

      <div class="side-content">
        <div class="about-card">
          <div class="card-header">
            <el-icon :size="20" color="var(--info-500)"><InfoFilled /></el-icon>
            <h3>关于系统</h3>
          </div>

          <div class="about-info">
            <div class="info-row">
              <span class="info-label">项目名称</span>
              <span class="info-value">BurpSuite 抓包辅助工具</span>
            </div>
            <div class="info-row">
              <span class="info-label">版本</span>
              <span class="info-value">1.0.0</span>
            </div>
            <div class="info-row">
              <span class="info-label">技术栈</span>
              <span class="info-value">Vue 3 + Flask + SQLite</span>
            </div>
            <div class="info-row">
              <span class="info-label">开源协议</span>
              <span class="info-value">MIT License</span>
            </div>
          </div>
        </div>

        <div class="features-card">
          <div class="card-header">
            <el-icon :size="20" color="var(--primary-400)"><Star /></el-icon>
            <h3>功能特性</h3>
          </div>

          <div class="feature-list">
            <div class="feature-item">
              <div class="feature-icon primary">
                <el-icon :size="20"><DataAnalysis /></el-icon>
              </div>
              <div class="feature-info">
                <h4>多格式支持</h4>
                <p>支持 XML、JSON、原始文本等多种格式导入</p>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon success">
                <el-icon :size="20"><Search /></el-icon>
              </div>
              <div class="feature-info">
                <h4>智能检索</h4>
                <p>支持按 URL、方法、状态码等多维度筛选</p>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon warning">
                <el-icon :size="20"><Warning /></el-icon>
              </div>
              <div class="feature-info">
                <h4>敏感检测</h4>
                <p>自动识别并标记包含敏感信息的请求</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { configApi } from '../api'

const configForm = reactive({
  auto_parse: 'true',
  auto_tagging: 'true',
  highlight_sensitive: 'true',
  sensitive_keywords: '',
  export_format: 'xml',
  items_per_page: '20',
  theme: 'dark'
})

const saving = ref(false)

const loadConfig = async () => {
  try {
    const res = await configApi.getAll()
    const configs = res.data
    configs.forEach(item => {
      if (configForm.hasOwnProperty(item.key)) {
        configForm[item.key] = item.value
      }
    })
    ElMessage.success('配置已重置')
  } catch (e) {
    ElMessage.error('加载配置失败')
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    await configApi.update(configForm)
    ElMessage.success('配置保存成功')
  } catch (e) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.config-page {
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

.config-card {
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
  margin: 0 0 var(--space-6);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
}

.form-row:hover {
  border-color: var(--border-color-light);
  background: var(--bg-tertiary);
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.label-text {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-primary);
}

.label-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.form-item-full {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.field-desc {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.keyword-input {
  width: 100%;
}

.form-row-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.full-width {
  width: 100%;
}

.action-bar {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding-top: var(--space-2);
}

.side-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  position: sticky;
  top: var(--space-6);
}

.about-card,
.features-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.info-value {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.feature-item {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
}

.feature-item:hover {
  border-color: var(--border-color-light);
  transform: translateX(4px);
}

.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-icon.primary {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary-400);
}

.feature-icon.success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success-500);
}

.feature-icon.warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-500);
}

.feature-info h4 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-1);
}

.feature-info p {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .side-content {
    position: static;
  }
}

@media (max-width: 768px) {
  .config-card,
  .about-card,
  .features-card {
    padding: var(--space-4);
  }

  .form-row-group {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-bar {
    flex-direction: column;
  }

  .action-bar .el-button {
    width: 100%;
  }
}
</style>
