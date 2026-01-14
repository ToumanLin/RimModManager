<template>
  <div class="flex flex-col h-full bg-bg-surface/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
    
    <!-- ================= 1. 顶部控制台 (Header & Toolbar) ================= -->
    <div class="shrink-0 bg-bg-deep/50 border-b border-white/5 backdrop-blur-xl z-20">
      
      <!-- A. 顶栏：标签页与统计 -->
      <div class="flex items-center justify-between px-4 h-12">
        <!-- 模式切换 Tabs -->
        <div class="flex p-1 bg-black/20 rounded-lg border border-white/5">
          <button v-for="tab in tabs" :key="tab.id" @click="currentTab = tab.id"
            class="px-4 py-1 rounded-md text-xs font-bold transition-all duration-300 flex items-center gap-2 relative overflow-hidden"
            :class="currentTab === tab.id ? 'text-white shadow-lg bg-white/10' : 'text-text-dim hover:text-white hover:bg-white/5'">
            <!-- 激活时的底部光条 -->
            <div v-if="currentTab === tab.id" class="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary shadow-[0_0_8px_var(--color-accent-primary)]"></div>
            <component :is="tab.icon" class="w-3.5 h-3.5" />
            {{ tab.label }}
          </button>
        </div>

        <!-- 实时统计看板 -->
        <div class="flex items-center gap-4 text-[10px] font-mono select-none">
          <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-accent-danger/10 border border-accent-danger/20 text-accent-danger">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span class="font-bold">{{ stats.errors }}</span> ERR
          </div>
          <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-accent-warn/10 border border-accent-warn/20 text-accent-warn">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span class="font-bold">{{ stats.warnings }}</span> WARN
          </div>
          <div class="px-2 py-1 text-text-dim opacity-60">
            TOTAL: {{ filteredLogs.length }}
          </div>
        </div>
      </div>

      <!-- B. 工具栏：筛选与搜索 -->
      <div class="px-4 py-2 flex items-center gap-3 border-t border-white/5">
        
        <!-- 文件选择 (模拟) -->
        <div class="relative group/file">
          <button class="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-text-main transition-colors">
            <svg class="w-3.5 h-3.5 text-accent-cool" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span class="max-w-[150px] truncate">{{ activeFileName }}</span>
            <svg class="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <!-- 下拉菜单预留位 -->
        </div>

        <div class="h-4 w-px bg-white/10 mx-1"></div>

        <!-- 搜索框 -->
        <div class="flex-1 relative group/search">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim group-focus-within/search:text-accent-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input v-model="searchQuery" type="text" placeholder="搜索日志内容 (支持 Regex)..." 
            class="w-full bg-black/20 border border-white/10 rounded-lg py-1.5 pl-8 pr-8 text-xs text-text-main focus:outline-none focus:border-accent-primary/50 focus:bg-black/30 transition-all font-mono placeholder:text-text-dim/50" />
          <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-white">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- 级别筛选 Checkbox -->
        <div class="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
          <FilterToggle v-model="filters.info" color="text-white" label="INFO" />
          <FilterToggle v-model="filters.warn" color="text-accent-warn" label="WARN" />
          <FilterToggle v-model="filters.error" color="text-accent-danger" label="ERR" />
          <FilterToggle v-if="currentTab === 'app'" v-model="filters.debug" color="text-accent-cool" label="DEBUG" />
        </div>

        <div class="h-4 w-px bg-white/10 mx-1"></div>

        <!-- 自动滚动开关 -->
        <button @click="autoScroll = !autoScroll" 
          class="p-1.5 rounded-lg border transition-all"
          :class="autoScroll ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/30' : 'bg-transparent text-text-dim border-transparent hover:bg-white/5'"
          v-tooltip="'自动滚动到底部'">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </button>

        <!-- 刷新/清空 -->
        <button @click="clearLogs" class="p-1.5 rounded-lg text-text-dim hover:text-accent-danger hover:bg-accent-danger/10 transition-colors" v-tooltip="'清空显示'">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>

      </div>
    </div>

    <!-- ================= 2. 日志内容区 (Log Stream) ================= -->
    <div ref="logContainer" class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black/20 p-2 font-mono text-xs selection:bg-accent-primary/30 selection:text-white">
      
      <!-- 空状态 -->
      <div v-if="filteredLogs.length === 0" class="h-full flex flex-col items-center justify-center text-text-dim/30 pointer-events-none">
        <svg class="w-16 h-16 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <span class="text-sm tracking-widest uppercase">No Logs Found</span>
      </div>

      <!-- 列表渲染 -->
      <template v-else>
        <!-- 虚拟滚动优化：实际场景建议用 virtual-list，这里用 v-for 演示结构 -->
        <div v-for="(log, index) in filteredLogs" :key="log.id || index"
             class="group/row flex gap-2 py-0.5 px-2 hover:bg-white/5 rounded-sm border-l-2 border-transparent transition-colors break-words"
             :class="getLevelBorderClass(log.level)">
          
          <!-- 时间戳 -->
          <span class="shrink-0 text-text-dim/50 select-none w-[60px]">{{ formatTime(log.timestamp) }}</span>
          
          <!-- 级别标记 -->
          <span class="shrink-0 w-[40px] font-bold" :class="getLevelColorClass(log.level)">
            {{ log.level }}
          </span>

          <!-- 内容主体 -->
          <div class="flex-1 min-w-0">
            <!-- App Log Mode: 结构化展示 -->
            <template v-if="currentTab === 'app'">
              <div class="flex items-baseline gap-2">
                <span class="text-accent-special opacity-80 select-none">[{{ log.module }}]</span>
                <span :class="{'text-white': log.level !== 'DEBUG', 'text-text-dim': log.level === 'DEBUG'}">
                  {{ log.message }}
                </span>
              </div>
              <!-- 详情折叠区 (如果有 details) -->
              <div v-if="log.details" class="mt-1 ml-1 pl-2 border-l border-white/10 text-text-dim/70 text-[11px] whitespace-pre-wrap font-mono bg-black/20 rounded p-1">
                {{ log.details }}
              </div>
            </template>

            <!-- Game Log Mode: Unity 格式 -->
            <template v-else>
              <!-- 处理 Unity Rich Text -->
              <div class="whitespace-pre-wrap leading-tight" v-html="parseUnityLog(log.message)"></div>
              <!-- 堆栈折叠 -->
              <div v-if="log.stackTrace" class="mt-1">
                <button @click="log._expanded = !log._expanded" class="text-[10px] text-accent-cool hover:underline flex items-center gap-1 select-none">
                  {{ log._expanded ? '收起堆栈' : '查看堆栈' }}
                  <svg class="w-3 h-3 transition-transform" :class="log._expanded ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div v-if="log._expanded" class="mt-1 pl-2 border-l border-accent-danger/30 text-red-300/60 text-[10px] whitespace-pre-wrap bg-red-900/10 rounded p-1">
                  {{ log.stackTrace }}
                </div>
              </div>
            </template>
          </div>

        </div>
      </template>
      
      <!-- 底部锚点 -->
      <div id="log-bottom-anchor"></div>
    </div>

    <!-- ================= 3. AI 智能辅助栏 (Footer) ================= -->
    <div class="bg-bg-deep/80 border-t border-white/10 p-3 backdrop-blur-xl z-30">
      <div class="flex items-center gap-2">
        <!-- AI 图标 -->
        <div class="w-8 h-8 rounded-lg bg-linear-to-br from-accent-special to-accent-highlight p-0.5 shadow-lg shadow-accent-special/20 animate-pulse-slow">
          <div class="w-full h-full bg-bg-deep rounded-[6px] flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
        </div>

        <div class="flex-1">
          <h3 class="text-xs font-bold text-white mb-0.5">AI 智能诊断</h3>
          <p class="text-[10px] text-text-dim">
            当前选中 <span class="text-accent-primary font-bold">{{ selectedLogCount }}</span> 条日志。
            <span v-if="selectedLogCount > 0" class="text-accent-success cursor-pointer hover:underline" @click="analyzeLogs">点击开始分析</span>
            <span v-else>请在上方筛选或框选日志以进行分析。</span>
          </p>
        </div>

        <button @click="analyzeLogs" :disabled="selectedLogCount === 0"
          class="px-4 py-2 bg-white/5 hover:bg-accent-special hover:text-white border border-white/10 rounded-lg text-xs font-bold text-text-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <span>分析原因</span>
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Terminal, Gamepad2, FileText, Filter } from 'lucide-vue-next'
import { useToast } from "vue-toastification"
import { parseUnityRichText } from '../utils/unityTextParser' // 复用之前实现的解析器

const toast = useToast()

// --- 子组件: 筛选开关 ---
const FilterToggle = {
  props: ['modelValue', 'color', 'label'],
  emits: ['update:modelValue'],
  template: `
    <button @click="$emit('update:modelValue', !modelValue)"
      class="px-2 py-0.5 rounded text-[10px] font-bold border transition-all duration-200 select-none"
      :class="modelValue ? [color, 'bg-white/10 border-white/10 shadow-sm'] : 'text-text-dim opacity-50 border-transparent hover:opacity-80'">
      {{ label }}
    </button>
  `
}

// --- 状态数据 ---
const currentTab = ref('app') // 'app' | 'game'
const tabs = [
  { id: 'app', label: '系统日志', icon: Terminal },
  { id: 'game', label: '游戏日志', icon: Gamepad2 }
]

const logs = ref([]) // 存储当前显示的日志列表
const gameLogs = ref([]) // 独立存储游戏日志缓存
const appLogs = ref([])  // 独立存储应用日志缓存

const activeFileName = ref('app.log')
const searchQuery = ref('')
const autoScroll = ref(true)
const logContainer = ref(null)

// 过滤器状态
const filters = ref({
  info: true,
  warn: true,
  error: true,
  debug: false
})

// --- 核心逻辑 ---

// 1. 初始化 & 监听
onMounted(() => {
  // 监听后端 EventBus 推送的 'app-log'
  window.addEventListener('app-log', handleAppLogEntry)
  
  // 初始加载 (模拟)
  // loadInitialLogs()
})

onUnmounted(() => {
  window.removeEventListener('app-log', handleAppLogEntry)
})

// 处理后端推送的单条日志
const handleAppLogEntry = (event) => {
  const entry = event.detail
  // 简单的去重（防止热重载重复添加）
  if (appLogs.value.some(l => l.id === entry.id)) return
  
  appLogs.value.push(entry)
  
  // 限制最大条数 (如 2000)，防止前端卡顿
  if (appLogs.value.length > 2000) appLogs.value.shift()
  
  if (currentTab.value === 'app' && autoScroll.value) {
    scrollToBottom()
  }
}

// 切换 Tab 时切换数据源
watch(currentTab, (newTab) => {
  if (newTab === 'app') {
    logs.value = appLogs.value
    activeFileName.value = 'app.log'
  } else {
    // 这里未来接通 Player.log 读取逻辑
    logs.value = gameLogs.value
    activeFileName.value = 'Player.log'
    // 模拟加载游戏日志
    if(gameLogs.value.length === 0) mockLoadGameLogs() 
  }
  nextTick(scrollToBottom)
})

// 2. 筛选逻辑
const filteredLogs = computed(() => {
  const query = searchQuery.value.toLowerCase()
  // 尝试编译正则
  let regex = null
  if (query) {
    try { regex = new RegExp(query, 'i') } catch(e) {}
  }

  // 根据 Tab 决定数据源
  const source = currentTab.value === 'app' ? appLogs.value : gameLogs.value

  return source.filter(log => {
    // A. 级别筛选
    const lvl = log.level.toUpperCase()
    if (lvl === 'INFO' && !filters.value.info) return false
    if (lvl === 'WARNING' && !filters.value.warn) return false
    if ((lvl === 'ERROR' || lvl === 'CRITICAL' || lvl === 'EXCEPTION') && !filters.value.error) return false
    if (lvl === 'DEBUG' && !filters.value.debug) return false

    // B. 搜索筛选
    if (query) {
      const content = (log.message + (log.details || '') + (log.module || '')).toLowerCase()
      if (regex) return regex.test(content)
      return content.includes(query)
    }
    
    return true
  })
})

// 3. 统计逻辑
const stats = computed(() => {
  const source = currentTab.value === 'app' ? appLogs.value : gameLogs.value
  return {
    errors: source.filter(l => ['ERROR', 'CRITICAL', 'EXCEPTION'].includes(l.level)).length,
    warnings: source.filter(l => l.level === 'WARNING').length
  }
})

const selectedLogCount = computed(() => {
  // 这里简化处理：如果没有选区，则视为分析当前过滤后的所有（如果数量不多）或者最后50条
  return filteredLogs.value.length
})

// 4. 辅助函数
const scrollToBottom = () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

const clearLogs = () => {
  if (currentTab.value === 'app') appLogs.value = []
  else gameLogs.value = []
}

const formatTime = (ts) => {
  // 如果是完整时间戳字符串，截取时分秒
  if (typeof ts === 'string' && ts.includes(' ')) return ts.split(' ')[1].split('.')[0]
  return ts
}

const getLevelColorClass = (level) => {
  switch (level) {
    case 'INFO': return 'text-accent-success'
    case 'WARNING': return 'text-accent-warn'
    case 'ERROR': 
    case 'CRITICAL': 
    case 'EXCEPTION': return 'text-accent-danger'
    case 'DEBUG': return 'text-accent-cool'
    default: return 'text-text-dim'
  }
}

const getLevelBorderClass = (level) => {
  switch (level) {
    case 'ERROR': 
    case 'CRITICAL': 
    case 'EXCEPTION': return 'border-accent-danger/50 bg-accent-danger/5'
    case 'WARNING': return 'border-accent-warn/30'
    default: return 'border-transparent'
  }
}

// 游戏日志富文本解析
const parseUnityLog = (text) => {
  // 复用之前的 parser，或者这里做一个简单的替换
  // 支持 <color=red>...</color>
  if (!text) return ''
  return parseUnityRichText(text, true) // removeImg=true
}

// AI 分析动作
const analyzeLogs = () => {
  toast.info("正在打包日志发送给 AI 分析...", { timeout: 2000 })
  // TODO: 调用后端 AI 接口
}

// --- Mock Data (仅用于演示) ---
const mockLoadGameLogs = () => {
  const mockData = [
    { level: 'INFO', timestamp: '10:00:01', message: 'RimWorld 1.5.4104 rev435 started' },
    { level: 'WARNING', timestamp: '10:00:05', message: '[Harmony] Patching method failed: Verse.Pawn.Tick' },
    { level: 'ERROR', timestamp: '10:00:12', message: 'XML error: <defName>MyMod_Thing</defName> already exists in another mod.', details: 'File: Mods/MyMod/Defs/Things.xml' },
    { level: 'EXCEPTION', timestamp: '10:00:15', message: 'NullReferenceException: Object reference not set to an instance of an object', stackTrace: '  at Verse.Pawn.get_Name () [0x00000] \n  at MyMod.HarmonyPatches.Prefix (...) [0x00012]' },
    { level: 'INFO', timestamp: '10:00:16', message: '<color=#66ff00>[HugsLib]</color> Library initialized.' }
  ]
  gameLogs.value = mockData.map((l, i) => ({ ...l, id: `g-${i}`, _expanded: false }))
}

</script>

<style scoped>
/* 滚动条样式微调 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 呼吸灯动画 */
@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }
  50% { opacity: 0.8; transform: scale(0.98); box-shadow: 0 0 5px rgba(139, 92, 246, 0.1); }
}
.animate-pulse-slow {
  animation: pulse-slow 3s infinite ease-in-out;
}
</style>