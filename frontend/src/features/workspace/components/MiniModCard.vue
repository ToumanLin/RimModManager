<!-- src/components/workspace/components/MiniModCard.vue -->
<template>
  <div class="relative w-36 shrink-0 bg-bg-inset/80 rounded-xl border border-border-base/10 overflow-hidden group hover:border-accent-primary/50 transition-all"
    @click="$emit('navigate', mod.workshop_id)">
    <!-- 封面图 -->
    <div class="h-24 w-full bg-bg-inset relative overflow-hidden">
      <img v-if="mod.preview_url" :src="appStore.getRemoteUrl(mod.preview_url)" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
      <div v-else class="absolute inset-0 flex items-center justify-center text-text-dim text-xs">无封面</div>
      
      <!-- 悬浮操作层 -->
      <div class="absolute inset-0 rounded-t-xl bg-bg-inset/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm" @click.stop>
        
        <!-- <button v-if="!isSubscribed" @click="subscribe" v-tooltip="'订阅'" class="p-1.5 rounded-full bg-accent-primary/80 hover:bg-accent-primary text-on-accent-primary transition-transform hover:scale-110">
          <Flag class="size-3.5" />
        </button>
        <button v-else @click="unsubscribe" v-tooltip="'取消订阅'" class="p-1.5 rounded-full bg-accent-danger/80 hover:bg-accent-danger text-on-accent-danger transition-transform hover:scale-110">
          <FlagOff class="size-3.5" />
        </button>
        <button @click="download" v-tooltip="'管理器下载'" class="p-1.5 rounded-full bg-accent-success/80 hover:bg-accent-success text-on-accent-success transition-transform hover:scale-110">
          <Download class="size-3.5" />
        </button> -->
        <WorkshopItemActions :workshop-id="props.mod.workshop_id" :show-unsubscribe="isSubscribed" colorful size="xs" class="pointer-events-auto transition-all duration-300" />
      </div>
      
      <div v-if="isSubscribed" class="absolute top-0 left-0 bg-accent-primary/80 text-on-accent-primary text-xs px-1 rounded-full">
        已订阅
      </div>
    </div>

    <!-- 文本信息 -->
    <div class="p-2 cursor-pointer" v-tooltip="'点击查看详情'">
      <div class="text-xs font-bold text-text-main truncate group-hover:text-accent-primary" :title="mod.title || mod.name || mod.workshop_id">
        {{ mod.title || mod.name || mod.workshop_id }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Flag, FlagOff, Download } from 'lucide-vue-next'
import { useAppStore } from '../../../app/stores/appStore'
import { useWorkspaceStore } from '../workspaceStore'
import WorkshopItemActions from '../../../shared/components/WorkshopItemActions.vue'

const props = defineProps({
  mod: { type: Object, required: true }
})
const emit = defineEmits(['navigate'])

const appStore = useAppStore()
const workspaceStore = useWorkspaceStore()

// 这里的状态可以利用你之前重构的 computed 集合
const isSubscribed = computed(() => workspaceStore.subscribedWorkshopIds.has(String(props.mod.workshop_id)))
const isInstalled = computed(() => workspaceStore.installedAllIds.has(String(props.mod.workshop_id)))

const subscribe = () => appStore.subscribeWorkshopIds([props.mod.workshop_id])
const unsubscribe = () => appStore.unsubscribeWorkshopIds([props.mod.workshop_id])
const download = () => appStore.downloadWorkshopItems([props.mod.workshop_id])
</script>
