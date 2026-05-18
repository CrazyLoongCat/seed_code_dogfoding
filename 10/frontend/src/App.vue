<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-inner">
        <div class="logo-section">
          <div class="logo-icon">
            <el-icon :size="28">
              <DataAnalysis />
            </el-icon>
          </div>
          <div class="logo-text">
            <h1 class="app-title">BurpSuite 抓包辅助工具</h1>
            <p class="app-subtitle">HTTP 流量分析管理平台</p>
          </div>
        </div>

        <nav class="main-nav">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <el-icon :size="18">
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="header-actions">
          <el-tooltip content="刷新数据" placement="bottom">
            <el-button circle :icon="Refresh" @click="$emit('refresh')" />
          </el-tooltip>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="main-inner">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <footer class="app-footer">
      <p>BurpSuite Helper v1.0.0 · 安全分析工具</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { List, Upload, Setting, Refresh } from '@element-plus/icons-vue'

const route = useRoute()

const navItems = [
  { path: '/', label: '抓包记录', icon: List },
  { path: '/import', label: '数据导入', icon: Upload },
  { path: '/config', label: '系统配置', icon: Setting }
]

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
}

.app-header {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
  background: rgba(30, 41, 59, 0.85);
}

.header-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-8);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.logo-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.app-subtitle {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.2;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex: 1;
  justify-content: center;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
  cursor: pointer;
  white-space: nowrap;
}

.nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.nav-item.active {
  color: white;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-inner {
  flex: 1;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-6);
}

.app-footer {
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-color);
  padding: var(--space-4) var(--space-6);
  text-align: center;
}

.app-footer p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal), transform var(--transition-normal);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式 */
@media (max-width: 1024px) {
  .header-inner {
    padding: 0 var(--space-4);
  }

  .main-inner {
    padding: var(--space-4);
  }

  .app-subtitle {
    display: none;
  }
}

@media (max-width: 768px) {
  .header-inner {
    height: auto;
    padding: var(--space-3) var(--space-4);
    flex-direction: column;
    gap: var(--space-3);
  }

  .logo-section {
    align-self: flex-start;
  }

  .main-nav {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: var(--space-1);
  }

  .nav-item {
    flex-shrink: 0;
  }

  .header-actions {
    position: absolute;
    top: var(--space-3);
    right: var(--space-4);
  }
}
</style>
