<template>
  <CommonModalShell :show="visible" :title="t('modSettingsManager.title')" :description="t('modSettingsManager.description')"
    size="page" :z-index="120" accent="primary" content-class="h-full" @close="emit('close')">
    <template #header-actions>
      <button v-if="unknownCleanupPaths.length > 0"
        class="rounded-lg border border-accent-danger/35 bg-accent-danger/10 px-3 py-2 text-xs font-bold text-accent-danger transition-colors hover:bg-accent-danger/18 disabled:opacity-50"
        :disabled="loading || deleting" @click="deleteUnknownFiles">
        {{ t('modSettingsManager.cleanResidue') }}
      </button>
      <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 px-3 py-2 text-xs font-bold text-text-main transition-colors hover:bg-bg-overlay/10 disabled:opacity-50"
        :disabled="loading" @click="loadOverview()">
        {{ t('ui.refresh') }}
      </button>
    </template>

    <div class="flex h-full min-h-0 flex-col overflow-hidden">
      <div class="grid grid-cols-5 border-b border-border-base/10 bg-bg-muted">
        <div class="col-span-3 px-4 py-3 text-[0.7rem] text-text-dim">
          <div class="truncate text-xs">{{ t('modSettingsManager.configDirectory', { path: overview?.config_path || t('common.unknown') }) }}</div>
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{{ t('modSettingsManager.filesCount', { count: overview?.total_files || 0 }) }}</span>
            <span>{{ t('modSettingsManager.matchedModsCount', { count: overview?.matched_mod_count || 0 }) }}</span>
            <span>{{ t('modSettingsManager.unknownFilesCount', { count: overview?.unknown_file_count || 0 }) }}</span>
            <span v-if="workshopDetailLoading">{{ t('modSettingsManager.completingWorkshopInfo') }}</span>
          </div>
        </div>
        <header class="col-span-2 flex items-center justify-end gap-2 px-5 py-3">
          <div class="text-sm font-black text-text-main">{{ t('modSettingsManager.filePreview') }}</div>
          <div class="max-w-[18rem] truncate text-[0.7rem] text-text-dim">
            {{ selectedInstance?.name || t('modSettingsManager.noSelectedFile') }}
          </div>
          <button v-if="selectedInstance?.file_path" class="rounded-lg border border-border-base/10 bg-bg-overlay/5 p-2 text-text-dim transition-colors hover:bg-bg-overlay/10 hover:text-text-main"
            v-tooltip="t('modSettingsManager.openPreviewFile')" @click="appStore.openFile(selectedInstance.file_path)">
            <FileSymlink class="size-4" />
          </button>
        </header>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-5 overflow-hidden">
        <div class="col-span-2 flex min-h-0 flex-col border-r border-border-base/5 px-4 py-4">
          <div class="mb-2 space-y-1">
            <div class="flex items-center gap-1">
              <div class="w-36 shrink-0">
                <CommonSelect v-model="stateFilter" :options="stateFilterOptions" />
              </div>
              <div class="relative min-w-0 flex-1">
                <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-dim" />
                <input v-model="filterQuery"
                  class="w-full rounded-lg border border-border-base/10 bg-bg-surface py-2 pl-9 pr-3 text-xs text-text-main outline-none transition-colors placeholder:text-text-dim focus:border-accent-primary/45"
                  :placeholder="t('modSettingsManager.searchPlaceholder')" />
              </div>
              <button v-if="hasActiveFilter" class="rounded-full p-2 m-0 hover:bg-bg-overlay/10 hover:text-accent-danger"
                v-tooltip="t('modSettingsManager.clearFilters')" @click="clearFilters">
                <CircleX class="size-4" />
              </button>
            </div>
            <div v-if="hasActiveFilter" class="text-[0.7rem] text-text-dim">
              {{ t('modSettingsManager.filteredSummary', { shown: filteredSummary.fileCount, total: overview?.total_files || 0 }) }}
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <div v-if="loading" class="flex h-full items-center justify-center gap-3 text-sm text-text-dim">
              <Loader2 class="size-5 animate-spin text-accent-primary" />
              {{ t('modSettingsManager.loading') }}
            </div>

            <div v-else-if="modGroups.length === 0" class="flex h-full flex-col items-center justify-center text-sm text-text-dim">
              <Files class="mb-4 size-14 opacity-50" />
              {{ t('modSettingsManager.empty') }}
            </div>

            <div v-else-if="filteredModGroups.length === 0" class="flex h-full flex-col items-center justify-center text-sm text-text-dim">
              <Search class="mb-4 size-14 opacity-50" />
              {{ t('modSettingsManager.noMatches') }}
            </div>

            <div v-else class="space-y-4">
              <article v-for="modGroup in filteredModGroups" :key="modGroup.group_key" class="overflow-hidden rounded-lg border"
                :class="selectedModGroupKey === modGroup.group_key ? 'border-accent-primary/50 bg-bg-surface' : 'border-border-base/10 bg-bg-muted/70'">
                <div class="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-border-base/10 bg-bg-surface/80 px-4 py-3 text-left"
                  role="button" tabindex="0" @click="selectModGroup(modGroup)" @keydown.enter.prevent="selectModGroup(modGroup)" @keydown.space.prevent="selectModGroup(modGroup)">
                  <div class="flex min-w-0 gap-3">
                    <div v-if="workshopPreviewUrl(modGroup)" class="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border-base/10 bg-bg-muted">
                      <img :src="workshopPreviewUrl(modGroup)" class="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="truncate text-sm font-black text-text-main" v-tooltip="modDetailTooltip(modGroup)">{{ modDisplayName(modGroup) }}</span>
                      <span class="rounded px-2 py-0.5 text-[0.65rem] font-bold" :class="modStatusClass(modGroup)">
                        {{ modStatusText(modGroup) }}
                      </span>
                      <AlertTriangle v-if="modGroup.status === 'disabled'" class="size-3.5 text-accent-warning" v-tooltip="t('modSettingsManager.disabledTooltip')" />
                    </div>
                    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-text-dim">
                      <span v-if="modGroup.package_id">{{ t('modSettingsManager.packageId', { id: modGroup.package_id }) }}</span>
                      <span v-if="modGroup.workshop_id">{{ t('modSettingsManager.workshopId', { id: modGroup.workshop_id }) }}</span>
                      <span>{{ t('modSettingsManager.settingsCount', { count: modGroup.setting_count || 0 }) }}</span>
                      <span>{{ t('modSettingsManager.filesCount', { count: modGroup.file_count || 0 }) }}</span>
                    </div>
                    </div>
                  </div>
                  <button v-if="modGroup.workshop_id" class="shrink-0 rounded-md border border-border-base/10 px-2 py-1 text-[0.65rem] font-bold text-text-dim hover:text-accent-primary"
                    @click.stop="appStore.openSteamWorkshopById(modGroup.workshop_id)">
                    {{ t('modSettingsManager.workshop') }}
                  </button>
                </div>

                <div class="space-y-3 px-3 py-3">
                  <section v-for="settingGroup in modGroup.setting_groups" :key="settingGroup.key" class="rounded-lg border border-border-base/5 bg-bg-deep/20">
                    <button class="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                      @click="selectSettingGroup(modGroup, settingGroup)">
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="truncate text-sm font-bold text-text-dim">{{ settingGroup.label || t('modSettingsManager.unrecognizedSetting') }}</span>
                          <span class="rounded bg-bg-overlay/10 px-2 py-0.5 text-[0.65rem] font-bold text-text-dim">
                            {{ settingIdentityLabel(settingGroup) }}
                          </span>
                          <span v-if="settingGroup.duplicate_count > 0" class="rounded bg-accent-warning/15 px-2 py-0.5 text-[0.65rem] font-bold text-accent-warning">
                            {{ t('modSettingsManager.duplicateCount', { count: settingGroup.duplicate_count }) }}
                          </span>
                        </div>
                        <div v-if="settingNotice(settingGroup)" class="mt-1 text-[0.7rem] text-accent-warning">
                          {{ settingNotice(settingGroup) }}
                        </div>
                      </div>
                    </button>

                    <div class="space-y-2 px-3 pb-3">
                      <div v-for="item in settingGroup.files" :key="item.key" class="relative rounded-lg border p-3 transition-colors"
                        :class="selectedInstanceKey === item.key ? 'border-accent-primary/45 bg-accent-primary/15' : 'border-border-base/10 bg-bg-surface/85'"
                        @click="selectInstance(modGroup, settingGroup, item)">
                        <div class="min-w-0 pr-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <button class="min-w-0 truncate text-left text-sm font-bold text-text-main hover:text-accent-primary"
                              @click.stop="selectInstance(modGroup, settingGroup, item)">
                              {{ item.name }}
                            </button>
                            <span class="rounded bg-bg-overlay/10 px-2 py-0.5 text-[0.65rem] font-bold text-text-dim">{{ item.source_label }}</span>
                            <span v-if="item.state_label || item.active" class="rounded px-2 py-0.5 text-[0.65rem] font-bold" :class="itemStateClass(item)">
                              {{ item.state_label || (item.active ? t('modSettingsManager.currentActive') : t('modSettingsManager.inactive')) }}
                            </span>
                            <span v-if="item.match_confidence && item.match_confidence !== 'high'" class="rounded bg-accent-warning/15 px-2 py-0.5 text-[0.65rem] font-bold text-accent-warning">
                              {{ confidenceText(item.match_confidence) }}
                            </span>
                          </div>
                          <div class="mt-2 space-y-1 text-[0.7rem] text-text-dim">
                            <div>{{ t('modSettingsManager.sourceFolder', { folder: item.folder_name || t('common.unknown') }) }}</div>
                            <div class="truncate">{{ t('modSettingsManager.fileLocation', { path: item.file_path }) }}</div>
                            <div>{{ t('modSettingsManager.sizeModified', { size: formatSize(item.file_size), time: formatTime(item.modified_time) }) }}</div>
                          </div>
                        </div>

                        <div class="mt-3 flex flex-wrap items-center justify-end gap-2">
                          <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 p-2 text-text-dim transition-colors hover:bg-bg-overlay/10 hover:text-text-main"
                            v-tooltip="t('modSettingsManager.openSettingFile')" @click.stop="appStore.openFile(item.file_path)">
                            <FileSymlink class="size-4" />
                          </button>
                          <button class="rounded-lg border border-border-base/10 bg-bg-overlay/5 p-2 text-text-dim transition-colors hover:bg-bg-overlay/10 hover:text-text-main"
                            v-tooltip="t('modSettingsManager.openContainingFolder')" @click.stop="appStore.openPath(item.file_path)">
                            <FolderInput class="size-4" />
                          </button>
                          <button v-if="canSyncItem(settingGroup, item)" class="rounded-lg border border-accent-warning/35 bg-accent-warning/10 p-2 text-accent-warning transition-colors hover:bg-accent-warning/18 disabled:opacity-50"
                            :disabled="syncingTargetPath === settingGroup.active_file_path" v-tooltip="t('modSettingsManager.overwriteActive')"
                            @click.stop="syncToActive(settingGroup, item)">
                            <Loader2 v-if="syncingTargetPath === settingGroup.active_file_path" class="size-4 animate-spin" />
                            <Replace v-else class="size-4" />
                          </button>
                          <button v-if="canDeleteItem(item)" class="rounded-lg border border-accent-danger/35 bg-accent-danger/10 p-2 text-accent-danger transition-colors hover:bg-accent-danger/18 disabled:opacity-50"
                            :disabled="deleting" v-tooltip="t('modSettingsManager.deleteSettingFile')" @click.stop="deleteItem(item)">
                            <Trash2 class="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div class="col-span-3 min-h-0 overflow-hidden">
          <div class="flex h-full min-h-0 flex-col">
            <div v-if="previewData?.truncated" class="border-b border-border-base/10 px-5 py-3 text-[0.7rem] text-accent-warning">{{ t('modSettingsManager.truncated') }}</div>
            <FileSearchPreviewEditor class="min-h-0 flex-1" :file-path="selectedInstance?.file_path || ''" :content="previewData?.content || ''"
              :loading="previewLoading" :wrap-lines="true" :empty-text="t('modSettingsManager.previewEmpty')" />
          </div>
        </div>
      </div>
    </div>
  </CommonModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, CircleX, Files, FileSymlink, FolderInput, Loader2, Replace, Search, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useAppStore } from '../../app/stores/appStore.js'
import { useConfirmStore } from '../../shared/components/modal/confirmStore.js'
import { formatFileSize } from '../../shared/lib/format.js'
import CommonModalShell from '../../shared/components/modal/CommonModalShell.vue'
import CommonSelect from '../../shared/components/input/CommonSelect.vue'
import FileSearchPreviewEditor from '../file-search/FileSearchPreviewEditor.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const appStore = useAppStore()
const confirmStore = useConfirmStore()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)
const deleting = ref(false)
const previewLoading = ref(false)
const workshopDetailLoading = ref(false)
const syncingTargetPath = ref('')
const overview = ref(null)
const selectedModGroupKey = ref('')
const selectedSettingKey = ref('')
const selectedInstanceKey = ref('')
const previewData = ref(null)
const filterQuery = ref('')
const stateFilter = ref('all')

const modGroups = computed(() => overview.value?.mod_groups || [])
const unknownCleanupPaths = computed(() => overview.value?.cleanup_candidate_paths || [])
const stateFilterOptions = computed(() => [
  { value: 'all', label: t('modSettingsManager.allStates') },
  { value: 'active', label: t('modSettingsManager.currentActive') },
  { value: 'coexist_disabled', label: t('modSettingsManager.coexistDisabled') },
  { value: 'mod_disabled', label: t('modSettingsManager.modDisabled') },
  { value: 'uninstalled', label: t('modSettingsManager.uninstalled') },
  { value: 'unknown', label: t('modSettingsManager.unknownSource') },
])
const hasActiveFilter = computed(() => !!filterQuery.value.trim() || stateFilter.value !== 'all')
const normalizeFilterText = (value) => String(value || '').toLowerCase()
const filterTokens = computed(() => filterQuery.value.trim().toLowerCase().split(/\s+/).filter(Boolean))
const textMatchesFilter = (text) => {
  const tokens = filterTokens.value
  if (!tokens.length) return true
  const normalizedText = normalizeFilterText(text)
  return tokens.every(token => normalizedText.includes(token))
}
const itemMatchesState = (item) => {
  if (stateFilter.value === 'all') return true
  return String(item?.state_kind || '').toLowerCase() === stateFilter.value
}
const buildModSearchText = (modGroup) => [
  modDisplayName(modGroup), modGroup?.mod_name, modGroup?.package_id, modGroup?.workshop_id,
  modStatusText(modGroup), modGroup?.workshop_detail?.title,
].join(' ')
const buildSettingSearchText = (settingGroup) => [
  settingGroup?.label, settingGroup?.class, settingGroup?.fallback_name, settingGroup?.mod_handle_name,
  settingIdentityLabel(settingGroup),
].join(' ')
const buildItemSearchText = (item) => [
  item?.name, item?.folder_name, item?.file_path, item?.source_label, item?.state_label, confidenceText(item?.match_confidence),
].join(' ')
const filteredModGroups = computed(() => {
  const hasQuery = filterTokens.value.length > 0
  return modGroups.value
    .map((modGroup) => {
      const groupMatched = !hasQuery || textMatchesFilter(buildModSearchText(modGroup))
      const settingGroups = (modGroup.setting_groups || [])
        .map((settingGroup) => {
          const settingMatched = groupMatched || textMatchesFilter(buildSettingSearchText(settingGroup))
          const files = (settingGroup.files || []).filter((item) => (
            itemMatchesState(item) && (settingMatched || textMatchesFilter(buildItemSearchText(item)))
          ))
          if (!files.length) return null
          return {
            ...settingGroup,
            files,
            all_files: settingGroup.files || [],
            file_count: files.length,
            duplicate_count: Math.max(0, files.length - 1),
          }
        })
        .filter(Boolean)
      if (!settingGroups.length) return null
      const fileCount = settingGroups.reduce((sum, group) => sum + Number(group.file_count || 0), 0)
      return { ...modGroup, setting_groups: settingGroups, setting_count: settingGroups.length, file_count: fileCount }
    })
    .filter(Boolean)
})
const filteredSummary = computed(() => ({
  fileCount: filteredModGroups.value.reduce((sum, group) => sum + Number(group.file_count || 0), 0),
}))
const selectedModGroup = computed(() => filteredModGroups.value.find(group => group.group_key === selectedModGroupKey.value) || null)
const selectedSettingGroup = computed(() => selectedModGroup.value?.setting_groups?.find(group => group.key === selectedSettingKey.value) || null)
const selectedInstance = computed(() => selectedSettingGroup.value?.files?.find(item => item.key === selectedInstanceKey.value) || null)

const clearFilters = () => {
  filterQuery.value = ''
  stateFilter.value = 'all'
}

const resetSelection = () => {
  selectedModGroupKey.value = ''
  selectedSettingKey.value = ''
  selectedInstanceKey.value = ''
  previewData.value = null
}

const setSelection = (modGroup, settingGroup, item) => {
  selectedModGroupKey.value = modGroup?.group_key || ''
  selectedSettingKey.value = settingGroup?.key || ''
  selectedInstanceKey.value = item?.key || ''
  if (item?.file_path) {
    void loadPreview(item.file_path)
  } else {
    previewData.value = null
  }
}

const selectFirstInstance = (modGroup, settingGroup = null) => {
  const nextSettingGroup = settingGroup || modGroup?.setting_groups?.[0]
  const nextItem = nextSettingGroup?.files?.[0]
  setSelection(modGroup, nextSettingGroup, nextItem)
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadOverview()
      return
    }
    overview.value = null
    resetSelection()
    syncingTargetPath.value = ''
  }
)

const ensureSelection = () => {
  if (!filteredModGroups.value.length) {
    resetSelection()
    return
  }
  const nextModGroup = filteredModGroups.value.find(group => group.group_key === selectedModGroupKey.value) || filteredModGroups.value[0]
  const nextSettingGroup = nextModGroup.setting_groups?.find(group => group.key === selectedSettingKey.value) || nextModGroup.setting_groups?.[0]
  const nextInstance = nextSettingGroup?.files?.find(item => item.key === selectedInstanceKey.value) || nextSettingGroup?.files?.[0]
  setSelection(nextModGroup, nextSettingGroup, nextInstance)
}

watch(
  () => [filterQuery.value, stateFilter.value, overview.value],
  () => ensureSelection()
)

const hydrateWorkshopDetails = async () => {
  const workshopIds = [...new Set(
    modGroups.value
      .filter(group => ['uninstalled', 'unknown'].includes(group.status))
      .map(group => String(group.workshop_id || '').trim())
      .filter(Boolean)
  )]
  if (!workshopIds.length || !window.pywebview?.api?.mod_settings_workshop_details) return
  workshopDetailLoading.value = true
  try {
    const res = await window.pywebview.api.mod_settings_workshop_details(workshopIds)
    if (res?.status !== 'success') return
    const details = res.data || {}
    modGroups.value.forEach((group) => {
      const detail = details[String(group.workshop_id || '').trim()]
      if (!detail) return
      group.workshop_detail = detail
      if (detail.package_id && !group.package_id) group.package_id = detail.package_id
      if (detail.title) group.mod_name = detail.title
      if (detail.available && detail.title) group.match_confidence = 'high'
    })
  } finally {
    workshopDetailLoading.value = false
  }
}

const loadOverview = async () => {
  overview.value = null
  previewData.value = null
  if (!window.pywebview) return
  loading.value = true
  try {
    const res = await window.pywebview.api.mod_settings_get_overview()
    if (res?.status !== 'success') {
      toast.error(res?.message || t('modSettingsManager.readFailed'))
      return
    }
    overview.value = res.data || null
    ensureSelection()
    void hydrateWorkshopDetails()
  } finally {
    loading.value = false
  }
}

const loadPreview = async (path) => {
  previewLoading.value = true
  try {
    previewData.value = await appStore.readTextFile(path)
  } finally {
    previewLoading.value = false
  }
}

const selectModGroup = (modGroup) => {
  selectFirstInstance(modGroup)
}

const selectSettingGroup = (modGroup, settingGroup) => {
  selectFirstInstance(modGroup, settingGroup)
}

const selectInstance = (modGroup, settingGroup, item) => {
  setSelection(modGroup, settingGroup, item)
}

const canSyncItem = (settingGroup, item) => {
  return !!settingGroup?.can_cover_active && !!settingGroup.active_file_path && !item.active
}

const canDeleteItem = (item) => {
  return !item?.active
}

const syncToActive = async (settingGroup, sourceItem) => {
  if (!window.pywebview || !settingGroup?.active_file_path || sourceItem.active) return
  const activeItem = (settingGroup.all_files || settingGroup.files || []).find(item => item.active)
  if (!activeItem) return
  const confirmed = await confirmStore.confirmAction(
    t('modSettingsManager.confirmOverwriteTitle'),
    t('modSettingsManager.confirmOverwriteMessage', { source: sourceItem.name, target: activeItem.name }),
    { confirmText: t('modSettingsManager.overwriteActiveFile'), cancelText: t('common.cancel'), type: 'warning' }
  )
  if (!confirmed) return

  syncingTargetPath.value = activeItem.file_path
  try {
    const res = await window.pywebview.api.mod_settings_sync(sourceItem.file_path, activeItem.file_path)
    if (res?.status !== 'success') {
      toast.error(res?.message || t('modSettingsManager.overwriteFailed'))
      return
    }
    toast.success(res?.message || t('modSettingsManager.overwriteSucceeded'))
    overview.value = res.data?.overview || overview.value
    selectedInstanceKey.value = activeItem.key
    ensureSelection()
    void hydrateWorkshopDetails()
  } finally {
    syncingTargetPath.value = ''
  }
}

const deleteItem = async (item) => {
  const deleted = await appStore.deletePath(item.file_path, false)
  if (!deleted) return
  await loadOverview()
}

const deleteUnknownFiles = async () => {
  const paths = unknownCleanupPaths.value
  if (!paths.length || !window.pywebview) return
  deleting.value = true
  try {
    const ok = await appStore.deletePaths(paths, {
      title: t('modSettingsManager.cleanResidue'),
      message: t('modSettingsManager.cleanResidueMessage', { count: paths.length }),
      checkLabel: t('modSettingsManager.cleanResidue'),
      successMessage: ({ paths, force }) => t(force ? 'modSettingsManager.cleanResidueDeleted' : 'modSettingsManager.cleanResidueTrashed', { count: paths.length }),
      reScan: false,
      allowWarning: true,
    })
    if (!ok) return
    await loadOverview()
    if (Number(overview.value?.total_files || 0) === 0) emit('close')
  } finally {
    deleting.value = false
  }
}

const modDisplayName = (modGroup) => {
  return modGroup?.workshop_detail?.title || modGroup?.mod_name || t('modSettingsManager.unknownMod')
}

const modStatusText = (modGroup) => {
  return {
    enabled: t('modSettingsManager.enabled'),
    disabled: t('modSettingsManager.disabled'),
    uninstalled: t('modSettingsManager.uninstalled'),
    unknown: t('common.unknown'),
  }[modGroup?.status] || t('common.unknown')
}

const modStatusClass = (modGroup) => {
  return {
    enabled: 'bg-accent-success/15 text-accent-success',
    disabled: 'bg-accent-warning/15 text-accent-warning',
    uninstalled: 'bg-accent-danger/15 text-accent-danger',
    unknown: 'bg-bg-overlay/10 text-text-dim',
  }[modGroup?.status] || 'bg-bg-overlay/10 text-text-dim'
}

const settingNotice = (settingGroup) => {
  if (settingGroup?.parse_status === 'ok') return ''
  return settingGroup?.parse_message || ''
}

const workshopPreviewUrl = (modGroup) => {
  const rawUrl = modGroup?.workshop_detail?.preview_url
  return rawUrl ? appStore.getRemoteUrl(rawUrl) : ''
}

const modDetailTooltip = (modGroup) => {
  const lines = [modDisplayName(modGroup), t('modSettingsManager.statusTooltip', { status: modStatusText(modGroup) })]
  if (modGroup?.package_id) lines.push(t('modSettingsManager.packageId', { id: modGroup.package_id }))
  if (modGroup?.workshop_id) lines.push(t('modSettingsManager.workshopId', { id: modGroup.workshop_id }))
  if (Array.isArray(modGroup?.workshop_detail?.author) && modGroup.workshop_detail.author.length) {
    lines.push(t('modSettingsManager.author', { author: modGroup.workshop_detail.author.join(', ') }))
  }
  if (modGroup?.workshop_detail?.detail_source === 'database') lines.push(t('modSettingsManager.detailSourceDatabase'))
  if (modGroup?.workshop_detail?.detail_source === 'unavailable') lines.push(t('modSettingsManager.detailUnavailable'))
  return lines.join('\n')
}

const confidenceText = (confidence) => {
  return {
    medium: t('modSettingsManager.mediumConfidence'),
    low: t('modSettingsManager.lowConfidence'),
    unknown: t('modSettingsManager.unknownSource'),
  }[String(confidence || '').toLowerCase()] || t('modSettingsManager.assistedIdentification')
}

const settingIdentityLabel = (settingGroup) => {
  return settingGroup?.identity === 'class' ? t('modSettingsManager.settingClass') : t('modSettingsManager.filenameFallback')
}

const itemStateClass = (item) => {
  return {
    active: 'bg-accent-primary/15 text-accent-primary',
    coexist_disabled: 'bg-accent-warning/15 text-accent-warning',
    mod_disabled: 'bg-bg-overlay/10 text-text-dim',
    folder_missing: 'bg-accent-danger/15 text-accent-danger',
    uninstalled: 'bg-accent-danger/15 text-accent-danger',
    unknown: 'bg-bg-overlay/10 text-text-dim',
  }[String(item?.state_kind || '').toLowerCase()] || (item?.active ? 'bg-accent-primary/15 text-accent-primary' : 'bg-bg-overlay/10 text-text-dim')
}

const formatTime = (timestamp) => {
  const value = Number(timestamp || 0)
  if (!value) return t('common.unknown')
  try {
    return new Date(value).toLocaleString(globalThis.__RMM_UI_FORMAT_LOCALE__ || 'zh-CN')
  } catch {
    return t('common.unknown')
  }
}

const formatSize = (size) => formatFileSize(size, 2)
</script>
