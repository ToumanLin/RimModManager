<!-- src/components/workspace/views/NexusBrowser.vue -->
<template>
  <div class="h-full flex gap-4 p-4 overflow-hidden">
    
    <!-- 左侧：智库列表 (35%) -->
    <div class="w-[35%] flex flex-col bg-black/30 border border-text-main/10 rounded-2xl overflow-hidden shadow-2xl">
      <div class="p-4 bg-accent-primary/5 border-b border-text-main/10 space-y-3 relative z-10">
        <h3 class="text-sm font-black tracking-widest text-accent-primary flex items-center gap-2 uppercase">
          <Globe class="size-4" /> 缓存工坊浏览
        </h3>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
          <input v-model="workspaceStore.nexusSearch.query" @input="debouncedSearch" placeholder="搜索模组名称、包名或工坊ID..." 
            class="w-full bg-black/60 border border-text-main/10 rounded-xl pl-9 pr-4 py-2 text-sm text-text-main focus:border-accent-primary focus:bg-black/80 outline-none transition-all shadow-inner" />
          <!-- 搜索加载动画 -->
          <div v-if="workspaceStore.nexusSearch.isLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
            <div class="size-3 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>

      <!-- 虚拟列表 -->
      <div class="flex-1 overflow-hidden relative p-1">
        <VirtualList 
          v-if="workspaceStore.nexusSearch.results.length"
          v-model="workspaceStore.nexusSearch.results" 
          dataKey="workshop_id"
          class="h-full custom-scrollbar"
          :keeps="40" :sortable="false" :disabled="true" group="none"
        >
          <template v-slot:item="{ record, index, dataKey }">
            <div @click="selectMod(record)" 
              class="px-4 py-2.5 border-b border-text-main/5 cursor-pointer transition-all hover:bg-accent-primary/10 group rounded-lg"
              :class="selectedId === dataKey ? 'bg-accent-primary/20 border-r-4 border-r-accent-primary shadow-[inset_2px_0_10px_rgba(59,130,246,0.1)]' : ''">
              <div class="text-sm font-bold truncate transition-colors" :class="selectedId === dataKey ? 'text-text-main' : 'text-text-main/80 group-hover:text-accent-primary'">
                {{ record.name }}
              </div>
              <div class="flex justify-between items-center mt-1">
                <div class="text-[0.65rem] text-text-dim truncate font-mono opacity-80 max-w-[70%]">{{ record.package_id }}</div>
                <div class="text-[0.6rem] font-bold px-1 rounded bg-black/40 text-text-dim border border-text-main/10">{{ dataKey }}</div>
              </div>
            </div>
          </template>
        </VirtualList>
        <div v-else class="h-full flex flex-col items-center justify-center text-text-dim/30">
          <Cpu class="size-16 mb-4 opacity-50" />
          <span class="text-sm font-bold tracking-widest">暂无结果</span>
          <span class="text-xs mt-2 opacity-50">输入关键字开始检索缓存库</span>
        </div>
      </div>
    </div>

    <!-- 右侧：全息详情展示 (65%) -->
    <div class="flex-1 bg-black/40 border border-text-main/10 rounded-2xl overflow-hidden flex flex-col relative shadow-2xl">
      
      <template v-if="workspaceStore.nexusSearch.detailData && !workspaceStore.nexusSearch.isDetailLoading">
        <!-- 头部 Banner -->
        <div class="h-64 shrink-0 relative overflow-hidden group">
          <img v-if="workspaceStore.nexusSearch.detailData.preview_url" :src="appStore.getRemoteUrl(workspaceStore.nexusSearch.detailData.preview_url)" 
            class="absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-110 transition-transform duration-1000 group-hover:scale-100 group-hover:opacity-60" />
          <div class="absolute inset-0 bg-linear-to-t from-bg-deep via-bg-deep/60 to-transparent"></div>
          
          <div class="absolute inset-0 p-8 flex gap-6 items-end">
            <img v-if="workspaceStore.nexusSearch.detailData.preview_url" :src="appStore.getRemoteUrl(workspaceStore.nexusSearch.detailData.preview_url)" 
              class="size-40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-2 border-text-main/10 object-cover z-10" />
            <div class="size-40 rounded-xl bg-black/50 border-2 border-dashed border-text-main/20 flex items-center justify-center z-10" v-else>
              <span class="text-xs text-text-dim">NO IMAGE</span>
            </div>

            <div class="flex-1 min-w-0 pb-2 z-10">
              <h2 class="text-3xl font-black flex items-center gap-1 text-text-main text-shadow-lg truncate leading-tight">{{ workspaceStore.nexusSearch.detailData.title || workspaceStore.nexusSearch.detailData?.name }}
                <Link @click="openWebUrl(workspaceStore.nexusSearch.selectedId)" title="打开创意工坊页面" class="size-5 text-text-dim hover:text-accent-primary cursor-pointer transition-all" />
              </h2>
              <div class="flex gap-2 mt-3">
                <span class="px-2.5 py-1 rounded bg-accent-primary/20 text-accent-primary text-[0.65rem] font-bold border border-accent-primary/30 uppercase tracking-widest">ID: {{ workspaceStore.nexusSearch.selectedId }}</span>
                <span v-if="workspaceStore.nexusSearch.detailData.time_updated" class="px-2.5 py-1 rounded bg-black/60 text-text-main text-[0.65rem] font-bold border border-text-main/20 flex items-center gap-1 backdrop-blur-sm">
                  <Calendar class="size-3 text-text-dim"/>
                  云端更新: {{ formatDate(workspaceStore.nexusSearch.detailData.time_updated) }}
                </span>
              </div>
            </div>
            
            <!-- 动作按钮 -->
            <div class="flex flex-col gap-3 mb-2 z-10 shrink-0">
              <button v-if="!isSubscribed([selectedId])" @click="handleSubscribe([selectedId])" class="w-36 py-2.5 rounded-xl bg-accent-primary/20 text-accent-primary text-sm border border-accent-primary/40 font-bold hover:scale-105 hover:bg-accent-primary active:scale-95 transition-all hover:text-black flex items-center justify-center gap-2">
                <CloudDownload class="size-4" /> 订阅
              </button>
              <button v-else @click="handleUnsubscribe([selectedId])" class="w-36 py-2.5 rounded-xl bg-accent-danger/20 text-accent-danger border border-accent-danger/40 font-bold text-sm hover:bg-accent-danger hover:text-black hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-2">
                <CloudDownload class="size-4" /> 取消订阅
              </button>
              <button @click="handleDownload" class="w-36 py-2.5 rounded-xl bg-accent-success/20 text-accent-success border border-accent-success/40 font-bold text-sm hover:bg-accent-success hover:text-black hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2">
                <Download class="size-4" /> 管理器下载
              </button>
            </div>

          </div>
        </div>

        <!-- 内容区 (使用 Tailwind Typography) -->
        <div class="flex-1 overflow-y-auto p-5 custom-scrollbar bg-text-main/2">
          <!-- 依赖提示框 (如果是解析得到的) -->
          <div v-if="workspaceStore.nexusSearch.detailData?.dependencies_mods && dependencies_ids.length > 0" 
            class="mb-6 p-3 rounded-xl bg-accent-warn/10 border border-accent-warn/30">
            <div class="flex justify-between items-center mb-2">
              <h4 class="text-xs font-bold text-accent-warn uppercase tracking-widest flex items-center gap-1">
                <Link class="size-3" /> 侦测到前置依赖
              </h4>
              <div class="flex gap-1">
                <button @click="handleUnsubscribe(dependencies_ids)" class="px-2.5 py-1 cursor-pointer rounded bg-accent-danger/20 text-accent-danger text-[0.65rem] font-bold border border-accent-danger/30 hover:scale-105 hover:text-text-main hover:bg-accent-danger active:scale-95 transition-all uppercase tracking-widest">
                  取订所有依赖
                </button>
                <button @click="handleSubscribe(dependencies_ids)" class="px-2.5 py-1 cursor-pointer rounded bg-accent-primary/20 text-accent-primary text-[0.65rem] font-bold border border-accent-primary/30 hover:scale-105 hover:text-text-main hover:bg-accent-primary active:scale-95 transition-all uppercase tracking-widest">
                  订阅所有依赖
                </button>
                <button @click="handleDownload(dependencies_ids)" class="px-2.5 py-1 cursor-pointer rounded bg-accent-primary/20 text-accent-success text-[0.65rem] font-bold border border-accent-success/30 hover:scale-105 hover:text-text-main hover:bg-accent-success active:scale-95 transition-all uppercase tracking-widest">
                  下载所有依赖
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-for="(name, wid) in workspaceStore.nexusSearch.detailData?.dependencies_mods" :key="wid"
                class="px-2 py-0.5 text-sm group relative rounded border border-text-main/10 font-mono"
                :class="[isSubscribed([wid]) ? 'bg-accent-primary/20 text-accent-primary' : isInstalled([wid]) ? 'bg-accent-success/20 text-accent-success' : 'bg-text-main/10 text-text-dim']"
                >
                {{ name }} <span class="opacity-50 text-[0.6rem]">({{ wid }})</span>
                <div class="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto flex gap-0.5 justify-center items-center text-[0.6rem] transition-all">
                  <button @click="openWebUrl(wid)" v-tooltip="'打开创意工坊页面'" class="p-1.5 cursor-pointer rounded-full bg-accent-special/80 hover:bg-accent-special scale-90 hover:scale-105 text-black transition-all"><Link class="size-3" /></button>
                  <button v-if="isSubscribed([wid])" @click="handleUnsubscribe([wid])" v-tooltip="'取消订阅'" class="p-1.5 cursor-pointer rounded-full bg-accent-danger/80 hover:bg-accent-danger scale-90 hover:scale-105 text-black transition-all"><FlagOff class="size-3" /></button>
                  <button v-else @click="handleSubscribe([wid])" v-tooltip="'Steam 订阅'" class="p-1.5 cursor-pointer rounded-full bg-accent-primary/80 hover:bg-accent-primary scale-90 text-black hover:scale-105 transition-all"><Flag class="size-3" /></button>
                  <button @click="handleDownloadSingle([wid])" v-tooltip="'下载到管理器'" class="p-1.5 cursor-pointer rounded-full bg-accent-success/80 hover:bg-accent-success scale-90 text-black hover:scale-105 transition-all"><Download class="size-3" /></button>
                </div>
              </span>
            </div>
          </div>

          <div class="prose prose-invert prose-sm md:prose-base max-w-none prose-img:rounded-xl prose-a:text-accent-primary">
            <div v-if="parsedDescription" v-html="parsedDescription"></div>
            <div v-else class="text-text-dim italic">该模组没有提供详细描述。</div>
          </div>
        </div>
      </template>

      <!-- 加载遮罩 -->
      <div v-if="workspaceStore.nexusSearch.isDetailLoading" class="absolute inset-0 bg-bg-deep flex flex-col items-center justify-center z-50">
        <div class="relative flex items-center justify-center">
          <div class="size-16 border-2 border-text-main/10 rounded-full"></div>
          <div class="absolute size-16 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <Globe class="size-6 text-accent-primary absolute animate-pulse" />
        </div>
        <span class="text-xs font-mono text-text-dim mt-6 tracking-widest">从 Steam 获取详情中...</span>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import VirtualList from 'vue-virtual-sortable'
import { Search, Globe, Cpu, Calendar, CloudDownload, Download, Link, Flag, FlagOff } from 'lucide-vue-next'
import { useAppStore } from '../../../stores/appStore'
import { useToast } from 'vue-toastification'
import { parseUnityRichText } from '../../../utils/unityTextParser'
import { useWorkspaceStore } from '../../../stores/workspaceStore'

const appStore = useAppStore()
const toast = useToast()
const workspaceStore = useWorkspaceStore()

const searchQuery = ref('')
const searchList = ref([]) 
const selectedBaseInfo = ref(null)
const detailData = ref(null)
const isSearching = ref(false)
const isLoadingDetail = ref(false)
let searchTimeout = null


const selectedMod = computed(() => {
  return workspaceStore.nexusSearch.detailData
})
const selectedId = computed(() => {
  return workspaceStore.nexusSearch.selectedId
})
const dependencies_ids = computed(() => {
  return Object.keys(workspaceStore.nexusSearch.detailData?.dependencies_mods)
})

const isSubscribed = (workshop_ids) => {
  if (!workshop_ids.length) return false
  return workshop_ids.every(id => workspaceStore.librariesMods.subscribed_workshop_ids.includes(id))
}
const isInstalled = (workshop_ids) => {
  if (!workshop_ids.length) return false
  return workshop_ids.every(id => workspaceStore.librariesMods.installed_all_ids.includes(id))
}

// 防抖搜索
const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    workspaceStore.doNexusSearch()
  }, 500)
}


const virtualListProxy = computed({
  get() { return searchList.value.map(i => ({ ...i, id: i.workshop_id })) },
  set(val) {}
})

// 获取详情
const selectMod = async (mod) => {
  workspaceStore.fetchNexusDetails(mod.workshop_id)
}

const parsedDescription = computed(() => {
  if (!workspaceStore.nexusSearch.detailData?.description) return ''
  return parseUnityRichText(workspaceStore.nexusSearch.detailData?.description, false)
})

const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString() : '未知'

// 打开网页
const openWebUrl = (url, on_steam=true) => {
  if(!url) return
  workspaceStore.openSteamWorkshopUrl(url, on_steam)
}
// 订阅模组
const handleSubscribe = (workshop_ids) => {
  appStore.subscribeMod(workshop_ids)
}
// 取消订阅
const handleUnsubscribe = (workshop_ids) => {
  appStore.unsubscribeMod(workshop_ids)
}
// 下载模组
const handleDownload = (workshop_ids) => {
  appStore.downloadWorkshopItems(workshop_ids)
}

</script>