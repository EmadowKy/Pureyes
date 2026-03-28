<template>
  <div class="skeleton-wrapper">
    <!-- 初始化阶段骨架屏 -->
    <div v-if="showInitialization" class="process-section">
      <div class="section-header skeleton-section-header">
        <div class="skeleton-icon"></div>
        <div class="skeleton-title"></div>
      </div>
      <div class="section-body">
        <div v-for="i in 2" :key="`init-${i}`" class="skeleton-card">
          <div class="skeleton-card-header">
            <div class="skeleton-text skeleton-text-md" style="width: 40%;"></div>
          </div>
          <div class="skeleton-card-content">
            <div class="skeleton-text skeleton-text-sm" style="width: 100%; margin-bottom: 12px;"></div>
            <div class="skeleton-metrics">
              <div v-for="j in 4" :key="`metric-${j}`" class="skeleton-metric">
                <div class="skeleton-text skeleton-text-sm"></div>
                <div class="skeleton-text skeleton-text-xs" style="width: 60%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 迭代阶段骨架屏 -->
    <div v-if="showIterations" class="process-section">
      <div class="section-header skeleton-section-header">
        <div class="skeleton-icon"></div>
        <div class="skeleton-title"></div>
      </div>
      <div class="section-body iterations-body">
        <div v-for="i in 3" :key="`iter-${i}`" class="skeleton-card skeleton-iteration">
          <div class="skeleton-card-header">
            <div class="skeleton-iteration-number"></div>
            <div class="skeleton-text skeleton-text-md" style="width: 60%; margin-left: 12px;"></div>
          </div>
          <div class="skeleton-card-content">
            <div class="skeleton-text skeleton-text-sm" style="width: 100%; margin-bottom: 12px;"></div>
            <div class="skeleton-metrics">
              <div v-for="j in 3" :key="`metric-${j}`" class="skeleton-metric">
                <div class="skeleton-text skeleton-text-sm"></div>
                <div class="skeleton-text skeleton-text-xs" style="width: 50%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最终化阶段骨架屏 -->
    <div v-if="showFinalization" class="process-section">
      <div class="section-header skeleton-section-header">
        <div class="skeleton-icon"></div>
        <div class="skeleton-title"></div>
      </div>
      <div class="section-body">
        <div class="skeleton-card">
          <div class="skeleton-card-header">
            <div class="skeleton-text skeleton-text-md" style="width: 30%;"></div>
          </div>
          <div class="skeleton-card-content">
            <div v-for="i in 4" :key="`line-${i}`" class="skeleton-text skeleton-text-sm" style="margin-bottom: 12px; width: 80%;"></div>
            <div class="skeleton-text skeleton-text-sm" style="width: 60%;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

defineProps({
  showInitialization: {
    type: Boolean,
    default: true
  },
  showIterations: {
    type: Boolean,
    default: true
  },
  showFinalization: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.skeleton-wrapper {
  width: 100%;
}

/* 骨架屏 - 基础样式 */
.skeleton-text {
  background: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-text-xs {
  height: 12px;
}

.skeleton-text-sm {
  height: 14px;
}

.skeleton-text-md {
  height: 18px;
}

/* 部分骨架屏 */
.process-section {
  margin-bottom: 32px;
}

.skeleton-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-left: 5px solid #667eea;
}

.skeleton-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  flex-shrink: 0;
}

.skeleton-title {
  width: 150px;
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  flex: 1;
}

.section-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.section-body.iterations-body {
  grid-template-columns: 1fr;
}

.skeleton-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.skeleton-card-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #fafbfc 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.skeleton-iteration-number {
  width: 28px;
  height: 28px;
  background: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
}

.skeleton-metric {
  background: linear-gradient(135deg, #f5f7fa 0%, #fafbfc 100%);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e8eef5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-metric .skeleton-text-sm:first-child {
  width: 100%;
}

.skeleton-metric .skeleton-text-xs {
  width: 100%;
}
</style>
