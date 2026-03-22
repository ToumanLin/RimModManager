<template>
  <transition name="panel-fade">
    <div v-show="appStore.uiState.showLogDrawer" 
      class="fixed inset-0 z-100 flex items-center justify-center bg-bg-deep/60 backdrop-blur-md"
      @click.self="appStore.uiState.showLogDrawer = false">
      
      <div class="fixed top-0 left-0 w-full h-full p-10 bg-black/50 backdrop-blur-2xl rounded-lg z-999 flex gap-4 overflow-hidden" @click.self="appStore.uiState.showLogDrawer = false">
        <!-- ================= 左侧：日志主体区 ================= -->
        <div class="flex-1 flex flex-col h-full bg-bg-surface/40 backdrop-blur-md rounded-2xl border border-text-main/10 shadow-2xl relative group overflow-hidden transition-all duration-300">
          
          <!-- 1. 顶部控制台 (Header & Toolbar) -->
          <div class="shrink-0 bg-bg-deep/50 border-b border-text-main/5 backdrop-blur-xl z-20">
            <div class="flex items-center justify-between px-4 h-12">
              
              <!-- 模式切换 Tabs -->
              <div class="flex p-1 bg-black/20 rounded-lg border border-text-main/5">
                <button v-for="tab in tabs" :key="tab.id" @click="currentTab = tab.id"
                  class="px-4 py-1 rounded-md text-sm font-bold transition-all duration-300 flex items-center gap-2 relative overflow-hidden"
                  :class="currentTab === tab.id ? 'text-text-main shadow-lg bg-text-main/10' : 'text-text-dim hover:text-text-main hover:bg-text-main/5'">
                  <div v-if="currentTab === tab.id" class="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary shadow-[0_0_8px_var(--color-accent-primary)]"></div>
                  <component :is="tab.icon" class="w-3.5 h-3.5" />
                  {{ tab.label }}
                </button>
              </div>

              <!-- 右侧区域：统计看板 + AI 侧边栏开关 -->
              <div class="flex items-center gap-4 text-xs font-mono select-none">
                <!-- 原有的统计信息 (为了美观可选择性保留或精简) -->
                <button @click="autoAnalyzeGlobalErrors"
                        class="px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all border bg-accent-danger/10 border-accent-danger/30 text-accent-danger hover:bg-accent-danger hover:text-white shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span class="font-bold">全局一键排错</span>
                </button>
                
                <!-- 【新增】手动开关 AI 侧边栏按钮 -->
                <button @click="showAiSidebar = !showAiSidebar"
                        class="px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all border"
                        :class="showAiSidebar ? 'bg-accent-special/20 border-accent-special/50 text-accent-special shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'bg-black/20 border-text-main/10 text-text-dim hover:text-accent-special'">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  <span class="font-bold">{{ showAiSidebar ? '隐藏 AI 助手' : '召唤 AI 助手' }}</span>
                </button>
              </div>

            </div>
          </div>

          <!-- 2. 日志内容区 (Log Stream) -->
          <div class="flex-1 min-h-0 bg-black/20 font-mono text-sm relative">
            <KeepAlive>
              <UnifiedLogPanel 
                :key="currentTab" 
                :source-type="currentTab" 
                ref="logPanelRef"
                @update:selected-logs="handleSelectedLogsUpdate"
              />
            </KeepAlive>

            <!-- 【新增】悬浮操作条 (Floating Action Bar) -->
            <!-- 当用户在左侧勾选了日志，且 AI 侧边栏未打开时，在底部弹出提示 -->
            <transition name="fade-up">
              <div v-if="selectedLogs.length > 0 && !showAiSidebar" 
                  class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-bg-deep/95 border border-accent-primary/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl rounded-full px-5 py-2.5 flex items-center gap-4 z-30">
                
                <div class="flex items-center gap-2 text-sm">
                  <span class="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse"></span>
                  <span class="text-text-main">已选 <strong class="text-accent-primary">{{ selectedLogs.length }}</strong> 条</span>
                </div>
                
                <!-- 【新增】即时 Token 状态显示 -->
                <div v-if="tokenInfo.isLoading" class="flex items-center gap-1 text-text-dim text-xs">
                  <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>估算中...</span>
                </div>
                <div v-else class="flex items-center gap-1.5 text-xs font-bold" :class="getTokenColor(tokenInfo.estimated, tokenInfo.limit)">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span>{{ tokenInfo.estimated }} / {{ tokenInfo.limit }} TK</span>
                </div>
                <div class="w-px h-4 bg-text-main/20"></div>
                
                <button @click="showAiSidebar = true" :disabled="tokenInfo.isLoading"
                        class="text-sm font-bold text-accent-special hover:text-white transition-colors flex items-center gap-1 disabled:opacity-50">
                  AI 分析 
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
                <!-- 复制内容 -->
                <button @click="triggerCopy" class="text-text-dim hover:text-text-main p-1.5 rounded-full bg-black/20 ml-2" v-tooltip="'复制选中内容'">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                
                <button @click="clearLogSelection" class="text-text-dim hover:text-accent-danger p-1.5 rounded-full bg-black/20" v-tooltip="'取消选择'">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </transition>
          </div>

        </div>

        <!-- ================= 右侧：AI 诊断侧边栏 ================= -->
        <!-- 使用我们新创建的组件，并通过 v-model 控制显隐 -->
        <AiDiagnosticSidebar 
          v-model="showAiSidebar"
          :pending-logs="selectedLogs"
          :token-info="tokenInfo"
          :source-type="currentTab"
          :filename="logPanelRef?.selectedFile || ''"
          @clear-selection="clearLogSelection"
        />

      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Terminal, Gamepad2 } from 'lucide-vue-next'
import { useAppStore } from '../stores/appStore'
import { useToast } from 'vue-toastification'
import UnifiedLogPanel from './utils/UnifiedLogPanel.vue';
import AiDiagnosticSidebar from './utils/AiDiagnosticSidebar.vue'


const appStore = useAppStore()
const toast = useToast()
// --- 状态数据 ---
const currentTab = ref('app') // 'app' | 'game'
const tabs = [
  { id: 'app', label: '系统日志', icon: Terminal },
  { id: 'game', label: '游戏日志', icon: Gamepad2 }
]

// AI 相关状态
const showAiSidebar = ref(false)   // 控制 AI 侧栏的开关
const selectedLogs = ref([]) 
const logPanelRef = ref(null)      // 引用当前的 UnifiedLogPanel 组件实例

// 【核心新增】前置 Token 计算状态
const tokenInfo = ref({
  isLoading: false,
  estimated: 0,
  limit: 32000,
  isOverLimit: false,
  condensedData: null
})

// 防抖计算器
let debounceTimer = null
// 接收子组件日志选中更新
const handleSelectedLogsUpdate = (logs) => {
  selectedLogs.value = logs
  if (logs.length === 0) {
    tokenInfo.value = { isLoading: false, estimated: 0, limit: 32000, isOverLimit: false, condensedData: null }
    return
  }

  tokenInfo.value.isLoading = true
  clearTimeout(debounceTimer)
  
  // 500ms 防抖，用户停止框选后发起请求
  debounceTimer = setTimeout(async () => {
    await fetchTokenEstimate(logs)
  }, 500)
}

const stats = computed(() => {
  const source = currentTab.value === 'app' ? 'app' : 'game'
  return {
    errors: 0,
    warnings: 0,
    total: 0
  }
})
// 调用后端的预检接口
const fetchTokenEstimate = async (logs) => {
  if (!window.pywebview) return
  
  const allRawLines = [...new Set(logs.flatMap(l => l.raw_lines || []))]
  if (allRawLines.length === 0) {
    tokenInfo.value.isLoading = false
    return
  }

  // 获取子组件中当前选中的文件名
  const panel = Array.isArray(logPanelRef.value) ? logPanelRef.value[0] : logPanelRef.value
  const currentFilename = panel?.selectedFile || ''

  try {
    const res = await window.pywebview.api.ai_prepare_diagnosis({
      raw_lines: allRawLines,
      filename: currentFilename,
      log_source_type: currentTab.value
    })
    
    if (res.status === 'success') {
      tokenInfo.value = {
        isLoading: false,
        estimated: res.data.estimated_tokens,
        limit: res.data.token_limit,
        isOverLimit: res.data.is_over_limit,
        condensedData: res.data.condensed_data
      }
    }
  } catch (e) {
    console.error("Token 计算失败:", e)
    tokenInfo.value.isLoading = false
  }
}

// 辅助方法：根据占比计算颜色
const getTokenColor = (est, limit) => {
  if (!limit || limit === 0) return 'text-text-main'
  const ratio = est / limit
  if (ratio > 0.9) return 'text-accent-danger'
  if (ratio > 0.6) return 'text-accent-warn'
  return 'text-accent-success'
}

// 触发子组件复制
const triggerCopy = () => {
  const panel = Array.isArray(logPanelRef.value) ? logPanelRef.value[0] : logPanelRef.value
  if (panel && typeof panel.copySelection === 'function') {
    panel.copySelection()
  }
}
// 供自身悬浮条或子组件调用的清空方法
const clearLogSelection = () => {
  selectedLogs.value =[]
  // 调用子组件 UnifiedLogPanel 暴露的 clearSelection 方法
  if (logPanelRef.value) {
    // 处理 KeepAlive 下获取引用的兼容
    // 有时 Vue3 ref 包装的组件是一个数组或代理对象
    const panel = Array.isArray(logPanelRef.value) ? logPanelRef.value[0] : logPanelRef.value;
    if (panel && typeof panel.clearSelection === 'function') {
      panel.clearSelection()
    }
  }
}

// 【核心新增】全局一键排错
const autoAnalyzeGlobalErrors = async () => {
  const panel = Array.isArray(logPanelRef.value) ? logPanelRef.value[0] : logPanelRef.value
  if (!panel || !window.pywebview) return

  const errorLogs = panel.getGlobalErrorLogs()
  if (!errorLogs || errorLogs.length === 0) {
    toast.info("当前日志文件中没有发现红字错误或警告。")
    return
  }

  toast.info("正在提取全局错误并交由 AI 分析...", { timeout: 2000 })
  showAiSidebar.value = true // 展开侧边栏

  // 直接利用已有的接口能力
  await fetchTokenEstimate(errorLogs)

  if (tokenInfo.value.condensedData) {
    // 通过 EventBus 或者直接触发内部通信
    // 为了简单，我们可以通过操作 DOM 模拟“在侧边栏点击发送”
    // 或者更好的是：通过 ref 暴露给 Sidebar 去自动发送
    // 这里我们只需将 errorLogs 塞给 selectedLogs 即可，剩下的交由用户在侧栏直接点击“发送”
    // 这样不会显得太突兀，用户可以看到系统抓取了多少条错误
    if (typeof panel.selectAll === 'function') {
      // 假如有的话，但实际上直接赋值更快
    }
    selectedLogs.value = errorLogs
    toast.success(`提取完毕！已为你抓取了 ${errorLogs.length} 条全局错误。`)
  }
}
</script>

<style scoped>
/* 呼吸灯动画 */
@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }
  50% { opacity: 0.8; transform: scale(0.98); box-shadow: 0 0 5px rgba(139, 92, 246, 0.1); }
}
.animate-pulse-slow {
  animation: pulse-slow 3s infinite ease-in-out;
}

/* 页面切换动画 */
.panel-fade-enter-active, .panel-fade-leave-active { transition: opacity 0.4s ease; }
.panel-fade-enter-from, .panel-fade-leave-to { opacity: 0; }
</style>