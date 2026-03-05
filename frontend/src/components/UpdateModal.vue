<!-- UpdateModal.vue -->
<template>
  <!-- 使用 Transition 增加平滑动画 -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="isVisible" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <!-- 遮罩层 (点击可关闭) -->
      <div 
        class="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        @click="close"
      ></div>

      <!-- 弹窗主体 -->
      <div class="relative w-full max-w-lg overflow-hidden bg-white shadow-2xl rounded-2xl dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
        
        <!-- 头部 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span class="p-1.5 bg-blue-500 rounded-lg">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            更新详情
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 内容区域 (可滚动) -->
        <div class="px-6 py-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div v-for="(item, index) in changelog" :key="item.version" :class="{'mt-8': index > 0}">
            <!-- 版本与日期 -->
            <div class="flex items-baseline justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                  v{{ item.version }}
                </span>
                <span class="h-1 w-1 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
                <span class="text-xs text-gray-500 font-medium">{{ item.date }}</span>
              </div>
            </div>

            <!-- 更新列表 -->
            <ul class="space-y-2.5">
              <li v-for="(note, nIndex) in item.notes" :key="nIndex" class="flex items-start gap-3 group">
                <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:scale-125 transition-transform flex-shrink-0"></span>
                <p class="text-gray-600 dark:text-zinc-400 text-[14px] leading-relaxed">
                  {{ note }}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 flex justify-end">
          <button 
            @click="close"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'

const isVisible = ref(false)
const changelog = ref([])

// 暴露 show 方法给父组件
const show = (data) => {
  changelog.value = data
  isVisible.value = true
}

const close = () => {
  isVisible.value = false
}

// 暴露组件方法
defineExpose({
  show
})
</script>

<style scoped>
/* 自定义滚动条样式，使其更美观 */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #3f3f46;
}
</style>