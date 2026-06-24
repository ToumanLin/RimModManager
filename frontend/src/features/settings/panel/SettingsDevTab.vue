<template>
              <section class="animate-in fade-in slide-in-from-right-4">
                <h3 class="text-lg font-bold text-text-main mb-6">{{ t('settings.dev.title') }}</h3>
                <div class="space-y-6">
                  <div class="grid grid-cols-2 gap-4">
                    <CommonSwitch class="col-span-2" :label="t('settings.dev.debugMode')" v-model="formData.debug_mode" :description="t('settings.dev.debugModeDesc')" />
                    <CommonSwitch class="col-span-2" :label="t('settings.dev.browserMode')" v-model="formData.browser_mode" :description="t('settings.dev.browserModeDesc')" />
                    <div class="modal-section col-span-2 p-2">
                      <CommonSwitch class="mb-2" :label="t('settings.dev.silentMode')" v-model="formData.auto_enter_silent_mode" mini :description="t('settings.dev.silentModeDesc')" />
                      <div class="grid grid-cols-3 items-center">
                        <p class="col-span-2 text-xs ml-1 leading-relaxed text-text-dim">
                          {{ t('settings.dev.silentModeInfo') }}
                        </p>
                        <CommonSelect class="col-span-1 mr-2" :label="t('settings.dev.defaultPage')" mini v-model="formData.silent_mode_default_view"
                          :options="silentViewOptions"
                          :description="t('settings.dev.defaultPageDesc')"
                        />
                      </div>
                    </div>
                    <CommonSwitch class="col-span-1" :label="t('settings.dev.autoUpdate')" v-model="formData.enable_auto_update_check" :description="t('settings.dev.autoUpdateDesc')" />
                    <!-- 手动检查按钮 -->
                    <div class="modal-section flex items-center justify-between p-3">
                      <div class="flex flex-col">
                        <span class="text-sm font-bold text-text-main">{{ t('settings.dev.appVersion') }}</span>
                        <span class="text-xs text-text-dim">{{ t('settings.dev.currentVersion', { version: appStore.appVersion }) }}</span>
                      </div>

                      <div class="flex items-center justify-between gap-1">
                        <button @click="appStore.showChangelog()"
                          class="px-3 py-1.5 bg-accent-tip/15 hover:bg-accent-tip/30 border border-accent-tip/10 rounded-lg text-xs font-bold cursor-pointer transition-all">
                          <span class="flex items-center gap-2">
                            {{ t('settings.dev.changelog') }}
                          </span>
                        </button>
                        <button @click="appStore.checkUpdate(true)" :disabled="appStore.updateState.isChecking"
                          class="px-3 py-1.5 bg-accent-highlight/15 hover:bg-bg-overlay/10 border border-border-base/10 rounded-lg text-xs font-bold cursor-pointer transition-all">
                          <span v-if="appStore.updateState.isChecking" class="flex items-center gap-2">
                            <LoaderCircle class="animate-spin h-3 w-3" />
                            {{ t('settings.dev.checking') }}
                          </span>
                          <span v-else>{{ t('settings.dev.checkUpdates') }}</span>
                        </button>
                      </div>

                    </div>
                    <CommonSelect :label="t('settings.dev.logLevel')" v-model="formData.log_level" :options="[{label:'DEBUG', value:'DEBUG'},{label:'INFO', value:'INFO'},{label:'WARNING', value:'WARNING'}]" />
                    <CommonNumber :label="t('settings.dev.logRetentionDays')" v-model="formData.log_retention_days" :step="1" :min="0" :max="365" />
                  </div>
                  <div class="modal-section p-4">
                    <div class="flex items-center justify-between gap-4">
                      <div class="min-w-0">
                        <h4 class="text-sm font-bold text-text-main">{{ t('settings.dev.remoteImageCache') }}</h4>
                        <p class="mt-1 text-xs leading-relaxed text-text-dim">
                          {{ t('settings.dev.remoteImageCacheDesc') }}
                        </p>
                        <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-dim">
                          <span>{{ t('settings.dev.cachedImages', { count: appStore.remoteImageCache.file_count }) }}</span>
                          <span>{{ t('settings.dev.cacheSize', { size: formatFileSize(appStore.remoteImageCache.total_bytes) }) }}</span>
                        </div>
                      </div>
                      <button @click="handleClearRemoteImageCache" :disabled="appStore.isLoading"
                        class="shrink-0 px-4 py-1.5 bg-bg-overlay/5 hover:bg-bg-overlay/10 border border-border-base/10 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50">
                        {{ t('settings.dev.clearCachedImages') }}
                      </button>
                    </div>
                  </div>
                  <div class="p-4 rounded-2xl bg-accent-primary/5 border border-accent-primary/20">
                    <div class="flex items-center justify-between gap-4">
                      <div class="min-w-0">
                        <h4 class="text-sm font-bold text-text-main">{{ t('settings.dev.dataMigration') }}</h4>
                        <p class="text-xs text-text-dim leading-relaxed mt-1">
                          {{ t('settings.dev.dataMigrationDesc') }}
                        </p>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <button @click="openDataBundleImportDialog"
                          class="px-3 py-1.5 rounded-lg bg-bg-overlay/5 hover:bg-bg-overlay/10 border border-border-base/10 text-xs font-bold transition-all" >
                          {{ t('settings.dev.importDataPackage') }}
                        </button>
                        <button @click="openDataBundleModal"
                          class="px-4 py-1.5 rounded-lg bg-accent-primary hover:bg-accent-primary/85 text-on-accent-primary text-xs font-black shadow-[0_0_15px_rgba(var(--rgb-accent-primary),0.2)] transition-all" >
                          {{ t('settings.dev.exportAppData') }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="p-4 rounded-2xl bg-accent-special/5 border border-accent-special/20">
                    <div class="flex items-center justify-between gap-4">
                      <div class="min-w-0">
                        <h4 class="text-sm font-bold text-text-main">{{ t('settings.dev.profileModPackage') }}</h4>
                        <p class="text-xs text-text-dim leading-relaxed mt-1">
                          {{ t('settings.dev.profileModPackageDesc') }}
                        </p>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <button @click="openModPackageImportDialog"
                          class="px-3 py-1.5 rounded-lg bg-bg-overlay/5 hover:bg-bg-overlay/10 border border-border-base/10 text-xs font-bold transition-all" >
                          {{ t('settings.dev.importModPackage') }}
                        </button>
                        <button @click="openCurrentProfileExportDialog"
                          class="px-4 py-1.5 rounded-lg bg-accent-special hover:bg-accent-special/85 text-on-accent-special text-xs font-black shadow-[0_0_15px_rgba(var(--rgb-accent-cool),0.2)] transition-all" >
                          {{ t('settings.dev.exportProfileMods') }}
                        </button>
                      </div>
                    </div>
                    <div class="mt-4 grid grid-cols-3 gap-4 items-center">
                      <div class="col-span-1 text-xs text-text-dim">
                        {{ t('settings.dev.currentProfile') }}<span class="font-bold text-text-main">{{ profileStore.currentProfile?.name || t('settings.dev.inactiveProfile') }}</span>
                      </div>
                      <CommonSelect class="col-span-1" :label="t('settings.dev.bundleFolderNaming')" v-model="formData.bundle_mod_folder_name_type" showBottom mini
                        :description="t('settings.dev.bundleFolderNamingDesc')"
                        :options="bundleFolderNameOptions" />
                      <CommonNumber class="col-span-1" :label="t('settings.dev.compressionLevel')" v-model="formData.bundle_compress_level" :step="1" :min="0" :max="9" mini
                        :description="t('settings.dev.compressionLevelDesc')"  />
                    </div>
                  </div>
                  <div class="p-6 rounded-2xl bg-accent-danger/5 border border-accent-danger/20 space-y-4">
                    <h4 class="text-sm font-bold text-accent-danger uppercase">{{ t('settings.dev.dangerZone') }}</h4>
                    <p class="text-xs text-accent-danger/60 leading-relaxed">{{ t('settings.dev.dangerZoneDesc') }}</p>
                    <div class="grid grid-cols-2 gap-3">
                      <button @click="handleRepair" :disabled="appStore.isLoading"
                        class="w-full py-2 bg-accent-warn/10 hover:bg-accent-warn text-accent-warn hover:text-text-main border border-accent-warn/30 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50" >
                        {{ t('settings.dev.repairDb') }}
                      </button>
                      <button @click="handleReset" :disabled="appStore.isLoading"
                        class="w-full py-2 bg-accent-danger/10 hover:bg-accent-danger text-accent-danger hover:text-text-main border border-accent-danger/30 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50" >
                        {{ t('settings.dev.resetDb') }}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

  <DataBundleExportModal
    :show="showDataBundleModal && appStore.uiState.showSettingsPanel"
    :schema="dataBundleSchema"
    @close="closeDataBundleModal"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoaderCircle } from 'lucide-vue-next'
import CommonSwitch from '../../../shared/components/input/CommonSwitch.vue'
import CommonSelect from '../../../shared/components/input/CommonSelect.vue'
import CommonNumber from '../../../shared/components/input/CommonNumber.vue'
import { formatFileSize } from '../../../shared/lib/format'
import { toast } from '../../../shared/lib/common'
import { useAppStore } from '../../../app/stores/appStore'
import { useConfirmStore } from '../../../shared/components/modal/confirmStore'
import { useProfileStore } from '../../profiles/profileStore'
import { useModStore } from '../../mod/stores/modStore'
import DataBundleExportModal from './DataBundleExportModal.vue'

const props = defineProps({
  formData: { type: Object, required: true },
})

const appStore = useAppStore()
const confirmStore = useConfirmStore()
const profileStore = useProfileStore()
const modStore = useModStore()
const { t } = useI18n()

const dataBundleSchema = ref({
  modules: [],
  profiles: [],
  presets: {},
  file_extension: '.rmmdata.zip',
})
const showDataBundleModal = ref(false)

const silentViewOptions = computed(() => [
  { label: t('settings.dev.silentHome'), value: 'home' },
  { label: t('settings.dev.gameLogs'), value: 'logs' },
])

const bundleFolderNameOptions = computed(() => [
  { label: t('settings.dev.default'), value: 'default' },
  { label: t('settings.dev.byAlias'), value: 'alias_name' },
  { label: t('settings.dev.byOriginalModName'), value: 'name' },
  { label: t('settings.dev.byWorkshopId'), value: 'workshop_id' },
  { label: t('settings.dev.byPackageId'), value: 'package_id' },
])

const loadDataBundleSchema = async () => {
  // schema 由后端提供，前端只按模块定义渲染导出项，避免写死可打包范围。
  const schema = await appStore.getDataBundleSchema()
  if (!schema) return
  dataBundleSchema.value = schema
}

const openDataBundleModal = async () => {
  if (!(dataBundleSchema.value?.modules || []).length) {
    await loadDataBundleSchema()
  }
  showDataBundleModal.value = true
}

const closeDataBundleModal = () => {
  showDataBundleModal.value = false
}

const handleClearRemoteImageCache = async () => {
  // 缓存清理不可撤销，先确认再执行，成功后用实际清理结果反馈用户。
  const ok = await confirmStore.confirmAction(
    t('settings.dev.clearCacheTitle'),
    t('settings.dev.clearCacheMessage'),
    { type: 'warning', confirmText: t('settings.dev.clearNow'), cancelText: t('settings.dev.cancel') }
  )
  if (!ok) return
  const cleared = await appStore.clearRemoteImageCache()
  if (!cleared) return
  const clearedCount = Number(cleared?.cleared?.file_count || 0)
  const clearedBytes = formatFileSize(cleared?.cleared?.total_bytes || 0)
  toast.success(t('settings.dev.clearCacheSuccess', { count: clearedCount, size: clearedBytes }))
}

const openDataBundleImportDialog = async () => {
  // 导入前先检查数据包内容，把冲突处理交给统一的迁移面板。
  const schema = await appStore.getDataBundleSchema()
  if (!schema) return

  const extensions = [
    schema.file_extension || '.rmmdata.zip',
    ...(Array.isArray(schema.legacy_file_extensions) ? schema.legacy_file_extensions : ['.rmmdata']),
  ]
    .map(item => String(item || '').trim())
    .filter(Boolean)
  const bundlePath = await appStore.getFilePath('', [
    `RMM Data Package (${extensions.map(item => `*${item}`).join(';')})`,
    'All Files (*.*)',
  ])
  if (!bundlePath) return

  const inspectData = await appStore.inspectDataBundle(bundlePath)
  if (!inspectData) return

  appStore.openPackageTransferDialog('data-import', {
    title: t('settings.dev.importDataPackageTitle'),
    bundlePath,
    inspectData,
    dataBundleSchema: schema,
  })
}

const openModPackageImportDialog = async () => {
  // 模组包导入需要先根据当前可用安装目录确定默认落点，迁移面板仍允许用户后续调整。
  const schema = await appStore.getModPackageSchema()
  if (!schema) return

  const bundlePath = await appStore.getFilePath('', [
    `RMM Mod Package (*${schema.file_extension || '.rmmmods.zip'})`,
    'All Files (*.*)',
  ])
  if (!bundlePath) return

  const availableInstalls = Array.isArray(schema.available_installs) ? schema.available_installs : []
  const targetKind = availableInstalls.length > 0 ? 'game_install' : 'self_mods'
  const gameInstallPath = String(availableInstalls[0]?.install_path || '')
  const inspectData = await appStore.prepareModPackageImport(bundlePath, {
    target_kind: targetKind,
    game_install_path: gameInstallPath,
  })
  if (!inspectData) return

  appStore.openPackageTransferDialog('mod-import', {
    title: t('settings.dev.importModPackageTitle'),
    bundlePath,
    inspectData,
    modPackageSchema: schema,
    targetKind,
    gameInstallPath,
  })
}

const openCurrentProfileExportDialog = () => {
  // 导出当前环境时只提供可感知的范围选项，具体文件收集由打包流程统一处理。
  const currentProfile = profileStore.currentProfile || {}
  appStore.openPackageTransferDialog('mod-export', {
    title: t('settings.dev.exportCurrentProfileModsTitle'),
    description: t('settings.dev.exportCurrentProfileModsDesc'),
    sourceProfile: true,
    profileId: currentProfile.id || appStore.settings.current_profile_id || 'default',
    profileName: currentProfile.name || t('settings.dev.currentProfileName'),
    scopeOptions: [
      { value: 'profile-effective', label: t('settings.dev.profileEffectiveMods', { count: modStore.exportableVisibleCount }), description: t('settings.dev.profileEffectiveModsDesc') },
      { value: 'profile-active', label: t('settings.dev.profileActiveMods', { count: modStore.exportableActiveCount }), description: t('settings.dev.profileActiveModsDesc') },
    ],
    export_scope: 'profile-effective',
    folder_name_type: props.formData?.bundle_mod_folder_name_type || appStore.settings.bundle_mod_folder_name_type || 'default',
  })
}

const handleReset = async () => {
  const ok = await confirmStore.confirmAction(t('settings.dev.resetTitle'), t('settings.dev.resetMessage'), { type: 'error' })
  if (ok) appStore.resetDatabase()
}

const handleRepair = async () => {
  // 修复成功后必须重启才能切换到修复后的数据库状态。
  const ok = await confirmStore.confirmAction(
    t('settings.dev.repairTitle'),
    t('settings.dev.repairMessage'),
    { type: 'warning', confirmText: t('settings.dev.startRepair') }
  )
  if (!ok) return

  const res = await appStore.repairDatabase()
  if (!res || res.status !== 'success') {
    // 主动修复失败时不自动切换任何数据库，直接提示用户转向更保守的重置方案。
    const shouldReset = await confirmStore.confirmAction(
      t('settings.dev.repairFailedTitle'),
      t('settings.dev.repairFailedMessage'),
      { type: 'error', confirmText: t('settings.dev.resetNow'), cancelText: t('settings.dev.later') }
    )
    if (shouldReset) {
      await appStore.resetDatabase()
    }
    return
  }

  if (res.data?.initialized) {
    appStore.closeSettingsPanel()
    toast.success(t('settings.dev.dbRecreated'))
    return
  }

  const restartNow = await confirmStore.confirmAction(
    t('settings.dev.repairCompleteTitle'),
    t('settings.dev.repairCompleteMessage'),
    { type: 'success', confirmText: t('settings.dev.restartNow'), cancelText: t('settings.dev.restartLater') }
  )

  if (!restartNow) {
    toast.info(t('settings.dev.repairCompleteToast'), { timeout: 4000 })
    return
  }

  appStore.closeSettingsPanel()
  await appStore.restartApplication()
}

watch(() => appStore.uiState.showSettingsPanel, async (visible) => {
  if (visible) {
    await appStore.refreshRemoteImageCacheStats()
    return
  }
  closeDataBundleModal()
}, { immediate: true })
</script>
