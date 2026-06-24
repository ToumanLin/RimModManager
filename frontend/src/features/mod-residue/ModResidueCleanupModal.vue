<template>
  <CommonModalShell :show="appStore.uiState.showModResidueCleanup" :title="t('modResidue.title')"
    :description="t('modResidue.description')"
    size="page" :z-index="125" accent="danger" content-class="h-full" @close="closeModal">
    <template #header-actions>
      <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 px-3 py-2 text-xs font-bold text-text-main transition-colors hover:bg-bg-overlay/10 disabled:opacity-50"
        :disabled="store.loading" v-tooltip="t('modResidue.recheckTip')" @click="store.loadOverview()">
        <RefreshCw class="mr-1 inline size-3.5" />
        {{ t('modResidue.recheck') }}
      </button>
      <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 px-3 py-2 text-xs font-bold text-text-main transition-colors hover:bg-bg-overlay/10"
        v-tooltip="t('modResidue.whitelistTip')" @click="showWhitelist = !showWhitelist">
        <Shield class="mr-1 inline size-3.5" />
        {{ t('modResidue.whitelist') }} {{ store.summary.whitelist_count || 0 }}
      </button>
      <button class="rounded-lg border border-accent-danger/35 bg-accent-danger/10 px-3 py-2 text-xs font-bold text-accent-danger transition-colors hover:bg-accent-danger/18 disabled:opacity-50"
        :disabled="selectedItems.length === 0 || cleaning" v-tooltip="t('modResidue.cleanSelectedTip')" @click="cleanSelected">
        <Trash2 class="mr-1 inline size-3.5" />
        {{ t('modResidue.cleanSelected', { count: selectedItems.length }) }}
      </button>
    </template>

    <div class="grid h-full min-h-0 overflow-hidden" :class="showWhitelist ? 'grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1'">
      <section class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-base/10 bg-bg-muted px-5 py-3">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-dim">
            <span>{{ t('modResidue.mods', { count: store.summary.group_count || 0 }) }}</span>
            <span>{{ t('modResidue.pending', { count: store.summary.item_count || 0 }) }}</span>
            <span>{{ t('modResidue.folders', { count: store.summary.directory_count || 0 }) }}</span>
            <span>{{ t('modResidue.settingsFiles', { count: store.summary.settings_file_count || 0 }) }}</span>
            <span>{{ t('modResidue.files', { count: store.summary.file_count || 0 }) }}</span>
            <span>{{ t('modResidue.size', { size: formatFileSize(store.summary.total_size || 0) }) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button class="rounded-md border border-border-base/10 px-3 py-1.5 text-xs font-bold text-text-dim hover:text-text-main disabled:opacity-50"
              :disabled="flatItems.length === 0" v-tooltip="t('modResidue.selectAllTip')" @click="selectAll">
              {{ t('modResidue.selectAll') }}
            </button>
            <button class="rounded-md border border-border-base/10 px-3 py-1.5 text-xs font-bold text-text-dim hover:text-text-main disabled:opacity-50"
              :disabled="selectedItems.length === 0" v-tooltip="t('modResidue.clearSelectionTip')" @click="clearSelection">
              {{ t('modResidue.clearSelection') }}
            </button>
          </div>
        </div>

        <div v-if="store.loading" class="flex min-h-0 flex-1 items-center justify-center gap-3 text-sm text-text-dim">
          <Loader2 class="size-5 animate-spin text-accent-primary" />
          {{ t('modResidue.checking') }}
        </div>

        <div v-else-if="store.groups.length === 0" class="flex min-h-0 flex-1 flex-col items-center justify-center text-sm text-text-dim">
          <PackageCheck class="mb-4 size-14 opacity-50" />
          {{ t('modResidue.empty') }}
        </div>

        <div v-else class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div class="space-y-3">
            <article v-for="group in store.groups" :key="group.key" class="overflow-hidden rounded-lg border border-border-base/10 bg-bg-muted/60">
              <header class="flex items-center justify-between w-full gap-4 border-b border-border-base/10 bg-bg-surface/80 px-4 py-3">
                <div class="flex items-center min-w-0 gap-2">
                  <button class="flex flex-1 items-center justify-start text-left text-sm font-black min-w-0 text-text-main hover:text-accent-primary"
                    v-tooltip="t('modResidue.toggleGroupTip')" @click="toggleGroup(group)">
                    <CheckSquare v-if="isGroupFullySelected(group)" class="shrink-0 mr-2 inline size-4 text-accent-primary" />
                    <Square v-else class="shrink-0 mr-2 inline size-4 text-text-dim" />
                    <div class="truncate min-w-0">{{ groupTitle(group) }}</div>
                  </button>
                  <span class="rounded bg-accent-danger/15 px-2 py-0.5 text-[0.65rem] font-bold text-accent-danger">{{ t('modResidue.pending', { count: group.item_count || 0 }) }}</span>
                  <span v-if="group.workshop_id" class="rounded bg-bg-overlay/10 px-2 py-0.5 text-[0.65rem] font-bold text-text-dim">{{ t('modResidue.workshop', { id: group.workshop_id }) }}</span>
                  <span v-if="group.package_id" class="rounded bg-bg-overlay/10 px-2 py-0.5 text-[0.65rem] font-bold text-text-dim">{{ t('modResidue.packageId', { id: group.package_id }) }}</span>
                </div>
                <div class="shrink-0 flex items-center gap-2 text-[0.7rem] text-text-dim">
                  <span>{{ t('modResidue.folders', { count: group.directory_count || 0 }) }}</span>
                  <span>{{ t('modResidue.settingsFiles', { count: group.settings_file_count || 0 }) }}</span>
                  <span>{{ t('modResidue.files', { count: group.file_count || 0 }) }}</span>
                  <span>{{ t('modResidue.size', { size: formatFileSize(group.total_size || 0) }) }}</span>
                  <span>{{ confidenceText(group.match_confidence) }}</span>
                  <button v-if="group.workshop_id" class="shrink-0 rounded-md border border-border-base/10 px-2 py-1 text-[0.65rem] font-bold text-text-dim hover:text-accent-primary"
                    v-tooltip="t('modResidue.openWorkshopTip')"
                    @click="appStore.openSteamWorkshopById(group.workshop_id)">
                    {{ t('modResidue.openWorkshop') }}
                  </button>
                </div>
              </header>

              <div class="space-y-2 px-2 py-2">
                <div v-for="item in group.items" :key="item.id" class="flex items-start gap-2 rounded-lg border p-2 transition-colors"
                  :class="isSelected(item) ? 'border-accent-primary/10 bg-accent-primary/8' : 'border-border-base/5 bg-bg-surface/80'">

                    <button class="mt-0.5 text-text-dim hover:text-accent-primary" v-tooltip="t('modResidue.toggleItemTip')" @click="toggleItem(item)">
                      <CheckSquare v-if="isSelected(item)" class="shrink-0 size-4" />
                      <Square v-else class="shrink-0 size-4" />
                    </button>
                    <div class="min-w-0 flex-1" @click="toggleItem(item)">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <component :is="item.type === 'directory' ? FolderX : FileCog" class="size-4 shrink-0 text-accent-danger" />
                          <span class="truncate text-sm font-bold text-text-main">{{ item.name }}</span>
                          <span class="rounded bg-bg-overlay/10 px-2 py-0.5 text-[0.65rem] font-bold text-text-dim">{{ item.type_label }}</span>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-text-dim">
                          <span>{{ t('modResidue.fileCount', { count: item.file_count || 0 }) }}</span>
                          <span>{{ t('modResidue.itemSize', { size: formatFileSize(item.total_size || 0) }) }}</span>
                          <span>{{ t('modResidue.modified', { time: formatTime(item.modified_time) }) }}</span>
                        </div>
                      </div>
                      <div class="mt-1 space-y-1 text-[0.7rem] truncate text-text-dim" v-tooltip="itemPathTooltip(item)" :title="item.path">
                        {{ t('modResidue.path', { path: item.path }) }}
                      </div>
                    </div>

                    <div class="flex flex-wrap items-end justify-center gap-2">
                      <button class="flex items-center rounded-lg border border-border-base/10 bg-bg-overlay/5 px-2 py-1 text-[0.7rem] font-bold text-text-main transition-colors hover:bg-bg-overlay/10"
                        v-tooltip="openPathTooltip(item)" @click="openItemPath(item)">
                        <FolderOpen class="mr-1 inline size-3.5" />
                        {{ t('modResidue.openPath') }}
                      </button>
                      <button v-if="item.can_whitelist" class="flex items-center rounded-lg border border-accent-warning/35 bg-accent-warning/10 px-2 py-1 text-[0.7rem] font-bold text-accent-warning transition-colors hover:bg-accent-warning/18"
                        v-tooltip="t('modResidue.addWhitelistTip')" @click="addWhitelist(item)">
                        <ShieldPlus class="mr-1 inline size-3.5" />
                        {{ t('modResidue.addWhitelist') }}
                      </button>
                    </div>

                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <aside v-if="showWhitelist" class="min-h-0 overflow-hidden border-l border-border-base/10 bg-bg-muted/70">
        <div class="flex h-full min-h-0 flex-col">
          <header class="border-b border-border-base/10 px-4 py-3">
            <div class="text-sm font-black text-text-main">{{ t('modResidue.whitelist') }}</div>
            <div class="mt-1 text-xs leading-relaxed text-text-dim">{{ t('modResidue.whitelistDesc') }}</div>
            <input v-model="whitelistQuery" class="mt-3 w-full rounded-lg border border-border-base/10 bg-bg-surface px-3 py-2 text-xs text-text-main outline-none focus:border-accent-primary/50"
              :placeholder="t('modResidue.whitelistSearch')" />
          </header>
          <div v-if="filteredWhitelist.length === 0" class="flex flex-1 items-center justify-center px-4 text-center text-xs text-text-dim">
            {{ t('modResidue.whitelistEmpty') }}
          </div>
          <div v-else class="min-h-0 flex-1 overflow-y-auto p-3">
            <div v-for="item in filteredWhitelist" :key="item.path" class="mb-2 rounded-lg border border-border-base/10 bg-bg-surface/80 p-3">
              <div class="truncate text-sm font-bold text-text-main">{{ item.name || pathName(item.path) }}</div>
              <div class="mt-1 truncate text-[0.7rem] text-text-dim">{{ item.path }}</div>
              <div class="mt-3 flex justify-end gap-2">
                <button class="rounded-md border border-border-base/10 px-2 py-1 text-[0.65rem] font-bold text-text-dim hover:text-text-main"
                  v-tooltip="t('modResidue.openWhitelistTip')" @click="openWhitelistPath(item)">
                  {{ t('modResidue.open') }}
                </button>
                <button class="rounded-md border border-accent-danger/35 bg-accent-danger/10 px-2 py-1 text-[0.65rem] font-bold text-accent-danger hover:bg-accent-danger/18"
                  v-tooltip="t('modResidue.removeWhitelistTip')" @click="removeWhitelist(item)">
                  <ShieldX class="mr-1 inline size-3" />
                  {{ t('modResidue.remove') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </CommonModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckSquare, FileCog, FolderOpen, FolderX, Loader2, PackageCheck, RefreshCw, Shield, ShieldPlus, ShieldX, Square, Trash2 } from 'lucide-vue-next'
import { useAppStore } from '../../app/stores/appStore'
import { formatFileSize } from '../../shared/lib/format'
import CommonModalShell from '../../shared/components/modal/CommonModalShell.vue'
import { useModResidueStore } from './modResidueStore'

const appStore = useAppStore()
const store = useModResidueStore()
const { t } = useI18n()

const selectedKeys = ref(new Set())
const showWhitelist = ref(false)
const whitelistQuery = ref('')
const cleaning = ref(false)

const flatItems = computed(() => store.groups.flatMap(group => group.items || []))
const selectedItems = computed(() => flatItems.value.filter(item => selectedKeys.value.has(item.id)))
const filteredWhitelist = computed(() => {
  const query = whitelistQuery.value.trim().toLowerCase()
  return store.whitelist.filter(item => {
    if (!query) return true
    return String(item.name || '').toLowerCase().includes(query) || String(item.path || '').toLowerCase().includes(query)
  })
})

watch(
  () => store.overview,
  () => {
    const validKeys = new Set(flatItems.value.map(item => item.id))
    selectedKeys.value = new Set([...selectedKeys.value].filter(key => validKeys.has(key)))
  },
  { deep: true }
)

const closeModal = () => {
  appStore.uiState.showModResidueCleanup = false
}

const isSelected = (item) => selectedKeys.value.has(item.id)

const toggleItem = (item) => {
  const next = new Set(selectedKeys.value)
  if (next.has(item.id)) next.delete(item.id)
  else next.add(item.id)
  selectedKeys.value = next
}

const isGroupFullySelected = (group) => {
  const items = group?.items || []
  return items.length > 0 && items.every(item => selectedKeys.value.has(item.id))
}

const toggleGroup = (group) => {
  const items = group?.items || []
  const next = new Set(selectedKeys.value)
  const shouldSelect = !isGroupFullySelected(group)
  items.forEach(item => {
    if (shouldSelect) next.add(item.id)
    else next.delete(item.id)
  })
  selectedKeys.value = next
}

const selectAll = () => {
  selectedKeys.value = new Set(flatItems.value.map(item => item.id))
}

const clearSelection = () => {
  selectedKeys.value = new Set()
}

const cleanSelected = async () => {
  const paths = selectedItems.value.map(item => item.path).filter(Boolean)
  if (!paths.length) return
  cleaning.value = true
  try {
    const ok = await appStore.deletePaths(paths, {
      title: t('modResidue.cleanTitle'),
      message: t('modResidue.cleanMessage', { count: paths.length }),
      forceOptionText: t('modResidue.forceDelete'),
      checkLabel: t('modResidue.checkLabel'),
      successMessage: ({ paths, force }) => t(force ? 'modResidue.deleted' : 'modResidue.trashed', { count: paths.length }),
      reScan: false,
      allowWarning: true,
    })
    if (!ok) return
    clearSelection()
    const nextOverview = await store.loadOverview()
    if (Number(nextOverview?.summary?.item_count || 0) === 0) closeModal()
  } finally {
    cleaning.value = false
  }
}

const addWhitelist = async (item) => {
  if (!item?.path) return
  await store.addWhitelist([item.path])
}

const removeWhitelist = async (item) => {
  if (!item?.path) return
  await store.removeWhitelist([item.path])
}

const openItemPath = async (item) => {
  const targetPath = item?.type === 'settings_file' ? (item.parent_path || item.path) : item?.path
  if (!targetPath) return
  await appStore.openPath(targetPath)
}

const openWhitelistPath = async (item) => {
  const targetPath = String(item?.path || '')
  if (!targetPath) return
  const knownFile = flatItems.value.find(entry => entry.path === targetPath && entry.type === 'settings_file')
  const targetFolder = item?.type === 'file' ? pathDirName(targetPath) : targetPath
  await appStore.openPath(knownFile?.parent_path || targetFolder)
}

const openPathTooltip = (item) => {
  if (item?.type === 'settings_file') return t('modResidue.openSettingsDir')
  return t('modResidue.openResidueFolder')
}

const itemPathTooltip = (item) => {
  if (item?.type === 'settings_file' && item?.parent_path && item.parent_path !== item.path) {
    return t('modResidue.settingsFilePath', { path: item.path, parent: item.parent_path })
  }
  return item?.path || ''
}

const groupTitle = (group) => {
  return group?.workshop_detail?.title || group?.mod_name || group?.package_id || group?.workshop_id || t('modResidue.unknownMod')
}

const confidenceText = (confidence) => {
  return {
    high: t('modResidue.confidence.high'),
    medium: t('modResidue.confidence.medium'),
    low: t('modResidue.confidence.low'),
    unknown: t('modResidue.confidence.unknown'),
  }[String(confidence || '').toLowerCase()] || t('modResidue.confidence.medium')
}

const formatTime = (timestamp) => {
  const value = Number(timestamp || 0)
  if (!value) return t('modResidue.unknown')
  return new Date(value).toLocaleString(globalThis.__RMM_UI_FORMAT_LOCALE__ || 'zh-CN')
}

const pathName = (path) => String(path || '').split(/[\\/]/).filter(Boolean).pop() || path
const pathDirName = (path) => String(path || '').replace(/[\\/][^\\/]*$/, '') || path
</script>
