<template>
  <div class="flex flex-col h-full bg-bg-surface/40 backdrop-blur-sm border-2 border-white/5 rounded-2xl overflow-hidden shadow-2xl">
    
    <!-- 标题栏 -->
    <div class="px-3 h-8 border-b rounded-t-2xl border-white/5 flex justify-between items-center bg-black/10">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_var(--color-accent-primary)]"></div>
        <span class="text-sm font-bold text-accent-primary uppercase tracking-wider">备份</span>
      </div>
      <button @click="refresh" :class="{'animate-spin': loading}" v-tooltip="'刷新'" class="p-1.5 rounded-lg hover:bg-white/5 text-text-dim transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
      </button>
    </div>

    <!-- 列表内容区 -->
    <div class="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin">
      
      <!-- 1. 今日备份 (Today) -->
      <section v-if="parsedData.today.length > 0">
        <div class="px-2 mb-2 text-[10px] font-bold text-accent-primary uppercase opacity-80 flex items-center gap-2">
          <span>今日动态</span>
          <div class="h-px flex-1 bg-accent-primary/20"></div>
        </div>
        <div class="space-y-1">
          <BackupItem 
            v-for="item in parsedData.today" 
            :key="item.path"
            :item="item"
            :is-selected="selectedPath === item.path"
            @select="selectItem"
            @restore="handleRestore"
            @delete="handleDelete"
          />
        </div>
      </section>

      <!-- 2. 早期归档 (Earlier) -->
      <section v-if="parsedData.earlier.length > 0">
        <div class="px-2 mt-4 mb-2 text-[10px] font-bold text-text-dim uppercase opacity-60 flex items-center gap-2">
          <span>历史归档</span>
          <div class="h-px flex-1 bg-white/5"></div>
        </div>
        <div class="space-y-1">
          <BackupItem 
            v-for="item in parsedData.earlier" 
            :key="item.path"
            :item="item"
            :is-selected="selectedPath === item.path"
            @select="selectItem"
            @restore="handleRestore"
            @delete="handleDelete"
          />
        </div>
      </section>

      <!-- 3. 其他备份 (Other) -->
      <section v-if="parsedData.other.length > 0">
        <div class="px-2 mt-4 mb-2 text-[10px] font-bold text-text-dim uppercase opacity-60 flex items-center gap-2">
          <span>手动备份</span>
          <div class="h-px flex-1 bg-white/5"></div>
        </div>
        <div class="space-y-1">
          <BackupItem 
            v-for="item in parsedData.other" 
            :key="item.path"
            :item="item"
            :is-selected="selectedPath === item.path"
            @select="selectItem"
            @restore="handleRestore"
            @delete="handleDelete"
          />
        </div>
      </section>

      <!-- 空状态 -->
      <div v-if="isEmpty" class="flex flex-col items-center justify-center h-40 text-text-dim/40">
        <svg class="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span class="text-xs">暂无备份记录</span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useModStore } from '../stores/modStore'
import { parse, formatDistanceToNow, differenceInCalendarDays, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// --- 子组件：BackupItem ---
const BackupItem = {
  props: ['item', 'isSelected'],
  emits: ['select', 'restore', 'delete'],
  template: `
    <div 
      class="group relative flex items-center py-1 px-2 rounded-lg border transition-all duration-200 cursor-pointer select-none"
      :class="[isSelected ? 'bg-accent-primary/10 border-accent-primary/30 shadow-[inset_0_0_10px_rgba(var(--color-accent-rgb),0.1)]' 
          : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
      ]"
      @click="$emit('select', item)"
    >
      

      <!-- 中间信息 -->
      <div class="flex-1 min-w-0 flex flex-col justify-center">
        <!-- 距离时间/文件名 -->
        <div class="flex items-center gap-2">
            <span class="text-xs font-medium truncate" :class="isSelected ? 'text-white' : 'text-text-main'">
                {{ item.displayTitle }}
            </span>
        </div>
        
        <div class="flex items-center justify-between ">
            <!-- 左侧图标 -->
            <div class="rounded-md px-1 py-0.5 w-17 flex items-center justify-center transition-colors text-[10px] gap-0.5"
                :class="isSelected ? 'bg-accent-primary/30 text-accent-primary' : 'bg-accent-primary/20 text-text-dim group-hover:text-white'">
                <svg v-if="item.type === 'today'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <svg v-else-if="item.type === 'earlier'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span>{{ item.distanceNow }}</span>
            </div>
            <!-- 具体时间 -->
            <div class="text-[10px] text-text-dim truncate font-mono mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                {{ item.displayTime }}
            </div>
        </div>
      </div>

      <!-- 右侧操作 (Hover显示) -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <button @click.stop="$emit('restore', item)" v-tooltip="'恢复此备份'" class="p-1.5 rounded hover:bg-white/10 text-text-dim hover:text-green-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        </button>
        <button @click.stop="$emit('delete', item)" v-tooltip="'删除'" class="p-1.5 rounded hover:bg-white/10 text-text-dim hover:text-red-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    </div>
  `
}

const store = useModStore()
const loading = ref(false)
const selectedPath = ref(null)

// 原始数据
const rawData = ref({ today: [], earlier: [], other: [] })

// 辅助：从文件名解析时间
// 格式: ModsConfig_YYYYMMDD_HHMMSS.xml
const parseFileTime = (filename) => {
    const match = filename.match(/ModsConfig_(\d{8})_(\d{6})\.xml/)
    if (match) {
        return parse(`${match[1]}${match[2]}`, 'yyyyMMddHHmmss', new Date())
    }
    return null
}

// 核心：处理数据并生成显示文本
const parsedData = computed(() => {
    const process = (files, type) => {
        return files.map(file => { // file 是 path string
            const name = file.split(/[/\\]/).pop()
            const time = parseFileTime(name)
            
            let displayTitle = ''
            let displayTime = '未知时间'
            let distanceNow = '未知时间'

            if (time) {
                const now = new Date()
                // 生成 displayTime (具体时间)
                displayTime = time.toLocaleString('zh-CN', { 
                    year: 'numeric', month: '2-digit', day: '2-digit', 
                    hour: '2-digit', minute: '2-digit', second: '2-digit' 
                })

                // 生成 displayTitle (相对时间)
                if (type === 'today') {
                    // Today: 刚刚, xx分钟前, xx小时前
                    distanceNow = formatDistanceToNow(time, { locale: zhCN, addSuffix: true })
                        .replace('大约 ', '')
                } else if (type === 'earlier') {
                    // Earlier: 昨天, 前天, xx天前
                    const diffDays = differenceInCalendarDays(now, time)
                    if (diffDays === 1) distanceNow = '昨天'
                    else if (diffDays === 2) distanceNow = '前天'
                    else distanceNow = `${diffDays} 天前`
                }
            } else {
                // 如果是 other 或无法解析时间，直接显示文件名去后缀
                displayTitle = name.replace('.xml', '')
            }

            return {
                path: file,
                name: name,
                type: type,
                time: time, // Date object or null
                distanceNow,
                displayTitle,
                displayTime
            }
        }).sort((a, b) => {
            // 按时间倒序
            if (a.time && b.time) return b.time - a.time
            return a.name.localeCompare(b.name)
        })
    }

    return {
        today: process(rawData.value.today || [], 'today'),
        earlier: process(rawData.value.earlier || [], 'earlier'),
        other: process(rawData.value.other || [], 'other')
    }
})

const isEmpty = computed(() => {
    return parsedData.value.today.length === 0 && 
           parsedData.value.earlier.length === 0 && 
           parsedData.value.other.length === 0
})

// --- Actions ---

const refresh = async () => {
    loading.value = true
    try {
        await store.getBackups()
        // 从 store 同步数据 (假设 store.backups 结构是 {today:[], ...})
        if (store.backups) {
            rawData.value = store.backups
        }
    } finally {
        loading.value = false
    }
}

const selectItem = async (item) => {
    // selectedPath.value = item.path
    await store.getLoadOrder(item.path, false)
    store.showDiffDrawer = true
}

const handleRestore = async (item) => {
    if (!confirm(`确定要将配置恢复到 [${item.displayTitle}] 的状态吗？\n当前未保存的更改将丢失。`)) return
    
    // 调用后端恢复接口 (需你自己实现 store.restoreBackup)
    // await store.restoreBackup(item.path)
    // alert('恢复成功！')
    // await store.initialize() // 重新加载 active list
}

const handleDelete = async (item) => {
    if (!confirm(`确定要删除此备份文件吗？`)) return
    // 调用后端删除接口
    // await store.deleteBackup(item.path)
    // refresh()
}

onMounted(() => {
    refresh()
})
</script>

<style scoped>
    
</style>