<template>
  <CommonModalShell :show="appStore.uiState.showPackageTransferDialog" :title="dialogTitle" :description="dialogDesc" size="default" :z-index="140" accent="primary"
    panel-class="border-accent-primary/20" content-class="min-h-0 flex flex-col"
    @close="closeDialog" >
      <div class="absolute -top-18 -left-12 h-52 w-52 rounded-full bg-accent-primary/30 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-18 -right-12 h-52 w-52 rounded-full bg-accent-special/10 blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
        <div v-if="isImportMode" class="space-y-4">
          <section class="modal-section p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.importPackageFile') }}</div>
                <div class="mt-1 text-xs text-text-dim">
                  {{ selectedBundlePath || t('packageTransfer.noFileSelected') }}
                </div>
              </div>
              <button class="shrink-0 rounded-xl bg-accent-primary px-4 py-2 text-xs font-black text-on-accent-primary transition-all hover:bg-accent-primary/85"
                @click="pickImportBundle" >
                {{ t('packageTransfer.selectFile') }}
              </button>
            </div>
          </section>

          <section v-if="inspectData" class="modal-section p-4">
            <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.packageSummary') }}</div>
            <div class="mt-3 grid grid-cols-6 gap-3 text-xs text-text-dim">
              <div class="modal-section-subtle col-span-2 px-3 py-2">
                <div class="text-text-dim">{{ t('packageTransfer.format') }}</div>
                <div class="mt-1 font-mono text-text-main">{{ inspectData.format || t('common.unknown') }}</div>
              </div>
              <div class="modal-section-subtle col-span-2 px-3 py-2">
                <div class="text-text-dim">{{ t('packageTransfer.exportedAt') }}</div>
                <div class="mt-1 font-mono text-text-main">{{ inspectData.exported_at || t('common.unknown') }}</div>
              </div>
              <div v-if="dialogMode === 'mod-import'" class="modal-section-subtle px-3 py-2">
                <div class="text-text-dim">{{ t('packageTransfer.modCount') }}</div>
                <div class="mt-1 font-mono text-text-main">{{ inspectData.mods?.length || 0 }}</div>
              </div>
              <div class="modal-section-subtle px-3 py-2">
                <div class="text-text-dim">{{ t('packageTransfer.environmentData') }}</div>
                <div class="mt-1 font-mono text-text-main">
                  {{ inspectData.has_environment_data || (inspectData.profiles?.length > 0) ? t('packageTransfer.includesItems', { count: inspectData.profiles?.length || 0 }) : t('packageTransfer.notIncluded') }}
                </div>
              </div>
              <div v-if="archiveSummary" class="modal-section-subtle col-span-2 px-3 py-2">
                <div class="text-text-dim">{{ t('packageTransfer.bundleSize') }}</div>
                <div class="mt-1 font-mono text-text-main">{{ archiveSummary.bundleSize }}</div>
              </div>
              <div v-if="archiveSummary" class="modal-section-subtle col-span-2 px-3 py-2">
                <div class="text-text-dim">{{ t('packageTransfer.estimatedUnpackedSize') }}</div>
                <div class="mt-1 font-mono text-text-main">{{ archiveSummary.unpackedSize }}</div>
              </div>
              <div v-if="archiveSummary" class="modal-section-subtle col-span-2 px-3 py-2">
                <div class="text-text-dim">{{ t('packageTransfer.sizeChange') }}</div>
                <div class="mt-1 font-mono text-text-main">{{ archiveSummary.ratioText }}</div>
              </div>
              <div v-if="dialogMode === 'mod-import' && targetDiskSpaceSummary" class="rounded-xl border px-3 py-2 col-span-6"
                :class="targetDiskSpaceSummary.enough ? 'border-accent-tip/20 bg-accent-tip/8' : 'border-accent-danger/25 bg-accent-danger/8'" >
                <div class="text-text-dim">{{ t('packageTransfer.targetDiskSpace') }}</div>
                <div class="mt-1 font-mono" :class="targetDiskSpaceSummary.enough ? 'text-text-main' : 'text-accent-danger'">
                  {{ targetDiskSpaceSummary.text }}
                </div>
              </div>
            </div>
          </section>

          <template v-if="dialogMode === 'mod-import' && inspectData">
            <section class="modal-section p-4">
              <div class="mb-3">
                <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.importSettings') }}</div>
                <div class="mt-1 text-xs text-text-dim">{{ t('packageTransfer.importSettingsDesc') }}</div>
              </div>

              <div class="space-y-4">
                <label class="modal-section-subtle flex items-start gap-3 px-3 py-3">
                  <input v-model="modImportForm.import_mods" class="mt-0.5 accent-accent-primary" type="checkbox">
                  <div>
                    <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.importModFiles') }}</div>
                    <div class="mt-1 text-xs leading-relaxed text-text-dim">
                      {{ t('packageTransfer.importModFilesDesc') }}
                    </div>
                  </div>
                </label>

                <div v-if="modImportForm.import_mods" class="grid grid-cols-2 gap-3">
                  <label class="rounded-xl border px-3 py-3" :class="modImportForm.target_kind === 'game_install' ? 'border-accent-primary/35 bg-accent-primary/8' : 'border-border-base/10 bg-bg-inset/55'">
                    <div class="flex items-start gap-3">
                      <input v-model="modImportForm.target_kind" value="game_install" class="mt-0.5 accent-accent-primary" type="radio">
                      <div class="min-w-0">
                        <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.importToGameMods') }}</div>
                        <div class="mt-1 text-xs text-text-dim">{{ t('packageTransfer.importToGameModsDesc') }}</div>
                      </div>
                    </div>
                  </label>
                  <label class="rounded-xl border px-3 py-3" :class="modImportForm.target_kind === 'self_mods' ? 'border-accent-primary/35 bg-accent-primary/8' : 'border-border-base/10 bg-bg-inset/55'">
                    <div class="flex items-start gap-3">
                      <input v-model="modImportForm.target_kind" value="self_mods" class="mt-0.5 accent-accent-primary" type="radio">
                      <div class="min-w-0">
                        <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.importToManagerMods') }}</div>
                        <div class="mt-1 text-xs leading-relaxed text-text-dim">
                          {{ selfModsPath || t('packageTransfer.noManagerModsPath') }}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                <div v-if="modImportForm.import_mods && modImportForm.target_kind === 'game_install'" class="space-y-2">
                  <CommonSelect v-model="modImportForm.game_install_path" :label="t('packageTransfer.targetGameInstall')" :options="availableInstallOptions" />
                  <div v-if="availableInstalls.length === 0" class="text-xs leading-relaxed text-accent-warn">
                    {{ t('packageTransfer.noAvailableGameInstalls') }}
                  </div>
                </div>

                <div v-if="modImportForm.import_mods && modImportForm.target_kind === 'self_mods'" class="rounded-xl border border-accent-warn/20 bg-accent-warn/8 px-3 py-3 text-xs leading-relaxed text-text-dim">
                  {{ t('packageTransfer.enableManagerModsBefore') }} <span class="font-bold text-accent-warn">{{ t('packageTransfer.useManagerMods') }}</span> {{ t('packageTransfer.enableManagerModsAfter') }}
                </div>

                <label v-if="inspectData.has_environment_data" class="modal-section-subtle flex items-start gap-3 px-3 py-3">
                  <input v-model="modImportForm.apply_environment_data" class="mt-0.5 accent-accent-primary" type="checkbox">
                  <div>
                    <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.applyEnvironmentData') }}</div>
                    <div class="mt-1 text-xs leading-relaxed text-text-dim">
                      {{ t('packageTransfer.applyEnvironmentDataDesc') }}
                    </div>
                  </div>
                </label>
              </div>
            </section>

            <section v-if="inspectData.has_environment_data"
              class="modal-section p-4" >
              <div class="mb-3">
                <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.environmentDataHandling') }}</div>
                <div class="mt-1 text-xs text-text-dim">{{ t('packageTransfer.environmentDataHandlingDesc') }}</div>
              </div>

              <div v-if="modImportForm.apply_environment_data && inspectData.profiles?.length" class="space-y-3">
                <div class="rounded-xl border border-accent-danger/20 bg-accent-danger/8 px-3 py-3 text-xs leading-relaxed text-text-dim">
                  {{ t('packageTransfer.overwriteEnvironmentWarning') }}
                </div>
                <ProfileConflictPlanEditor :rows="profilePlanRows" :available-installs="availableInstalls" @strategy="applyProfileStrategy" />
              </div>
              <div v-else class="modal-section-subtle px-3 py-3 text-xs leading-relaxed text-text-dim">
                {{ t('packageTransfer.packageHasProfiles', { count: inspectData.profiles?.length || 0 }) }}
              </div>
            </section>
            

              <section class="modal-section p-4">
                <div class="mb-3">
                  <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.duplicateModsHandling') }}</div>
                  <div class="mt-1 text-xs text-text-dim">{{ t('packageTransfer.duplicateModsHandlingDesc') }}</div>
                </div>

                <div v-if="modImportForm.import_mods && modConflictRows.length > 0" class="space-y-3">
                  <div class="modal-section-subtle px-3 py-3 text-xs leading-relaxed text-text-dim">
                    {{ t('packageTransfer.duplicateModsFound', { count: modConflictRows.length }) }}
                  </div>
                  <ModConflictPlanEditor
                    :rows="modConflictRows"
                    @strategy="applyModConflictStrategy"
                  />
                </div>
                <div v-else-if="modImportForm.import_mods" class="rounded-xl border border-accent-tip/20 bg-accent-tip/8 px-3 py-3 text-xs leading-relaxed text-text-dim">
                  {{ t('packageTransfer.noDuplicateMods') }}
                </div>
                <div v-else class="modal-section-subtle px-3 py-3 text-xs leading-relaxed text-text-dim">
                  {{ t('packageTransfer.modImportNotSelected') }}
                </div>
              </section>
          </template>

          <section v-if="dialogMode === 'data-import' && inspectData" class="modal-section p-4">
            <div class="mb-3 text-sm font-bold text-text-main">{{ t('packageTransfer.environmentImportConflicts') }}</div>
            <div class="mb-3 rounded-xl border border-accent-danger/20 bg-accent-danger/8 px-3 py-3 text-xs leading-relaxed text-text-dim">
              {{ t('packageTransfer.environmentImportConflictsDesc') }}
            </div>
            <ProfileConflictPlanEditor
              :rows="profilePlanRows"
              :available-installs="availableInstalls"
              @strategy="applyProfileStrategy"
            />
          </section>
        </div>

        <div v-else-if="dialogMode === 'mod-export'" class="space-y-4">
          <section class="modal-section p-4">
            <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.exportSource') }}</div>
            <div class="mt-2 text-xs leading-relaxed text-text-dim">{{ exportSummary }}</div>
          </section>

          <section v-if="exportScopeOptions.length > 0" class="modal-section p-4">
            <div class="mb-2 text-sm font-bold text-text-main">{{ t('packageTransfer.exportScope') }}</div>
            <div class="grid grid-cols-2 gap-3">
              <label v-for="option in exportScopeOptions" :key="option.value" class="rounded-xl border px-3 py-3"
                :class="exportForm.export_scope === option.value ? 'border-accent-primary/35 bg-accent-primary/8' : 'border-border-base/10 bg-bg-inset/55'" >
                <div class="flex items-start gap-3">
                  <input v-model="exportForm.export_scope" class="mt-0.5 accent-accent-primary" :value="option.value" type="radio">
                  <div>
                    <div class="text-sm font-bold text-text-main">{{ option.label }}</div>
                    <div class="mt-1 text-xs text-text-dim">{{ option.description }}</div>
                  </div>
                </div>
              </label>
            </div>
          </section>

          <section v-if="showExportExtraOptions" class="modal-section p-4">
            <div class="mb-2 text-sm font-bold text-text-main">{{ t('packageTransfer.extraExportOptions') }}</div>
            <div class="modal-section-subtle mb-3 px-3 py-2 text-xs text-text-dim">
              {{ extraExportSummary }}
            </div>
            <div class="grid grid-cols-3 gap-3">
              <label class="modal-section-subtle px-3 py-3">
                <div class="flex items-start gap-3">
                  <input v-model="exportForm.include_dependencies" class="mt-0.5 accent-accent-primary" type="checkbox">
                  <div>
                    <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.includeDependencies') }}</div>
                    <div class="mt-1 text-xs text-text-dim">{{ t('packageTransfer.includeDependenciesDesc') }}</div>
                  </div>
                </div>
              </label>
              <label class="modal-section-subtle px-3 py-3">
                <div class="flex items-start gap-3">
                  <input v-model="exportForm.include_interlocks" class="mt-0.5 accent-accent-primary" type="checkbox">
                  <div>
                    <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.includeInterlocks') }}</div>
                    <div class="mt-1 text-xs text-text-dim">{{ t('packageTransfer.includeInterlocksDesc') }}</div>
                  </div>
                </div>
              </label>
              <label class="modal-section-subtle px-3 py-3">
                <div class="flex items-start gap-3">
                  <input v-model="exportForm.include_language_packs" class="mt-0.5 accent-accent-primary" type="checkbox">
                  <div>
                    <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.includeLanguagePacks') }}</div>
                    <div class="mt-1 text-xs text-text-dim">{{ t('packageTransfer.includeLanguagePacksDesc') }}</div>
                  </div>
                </div>
              </label>
            </div>
          </section>

          <section class="modal-section p-4 grid grid-cols-2 gap-3">
            <label v-if="allowExportEnvironmentAttach" class="modal-section-subtle flex items-start gap-3 px-3 py-3">
              <input v-model="exportForm.include_environment_data" class="mt-0.5 accent-accent-primary" type="checkbox">
              <div>
                <div class="text-sm font-bold text-text-main">{{ t('packageTransfer.includeCurrentEnvironmentData') }}</div>
                <div class="mt-1 text-xs leading-relaxed text-text-dim">
                  {{ t('packageTransfer.includeCurrentEnvironmentDataDesc') }}
                </div>
              </div>
            </label>
          
            <CommonSelect v-model="exportForm.folder_name_type" :label="t('packageTransfer.modFolderNaming')" showBottom
              :description="t('packageTransfer.modFolderNamingDesc')"
              :options="modFolderNameTypeOptions" />
          </section>
        </div>
      </div>

<template #footer>
      <div class="flex items-center justify-between gap-4">
        <div class="text-xs leading-relaxed text-text-dim">
          <template v-if="dialogMode === 'mod-import'">
            {{ t('packageTransfer.modImportFooter') }}
          </template>
          <template v-else-if="dialogMode === 'data-import'">
            {{ t('packageTransfer.dataImportFooter') }}
          </template>
          <template v-else>
            {{ t('packageTransfer.modExportFooter') }}
          </template>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-xl border border-border-base/10 bg-bg-overlay/5 px-4 py-2 text-xs font-bold text-text-main transition-all hover:bg-bg-overlay/10"
            @click="closeDialog" >
            {{ t('common.close') }}
          </button>
          <button class="rounded-xl bg-accent-primary px-5 py-2 text-sm font-black text-on-accent-primary transition-all hover:bg-accent-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canSubmit" @click="handleSubmit" >
            {{ submitLabel }}
          </button>
        </div>
      </div>
    </template>
  </CommonModalShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../../app/stores/appStore'
import { useModStore } from '../mod/stores/modStore'
import { useProfileStore } from '../profiles/profileStore'
import { formatFileSize } from '../../shared/lib/format'
import CommonSelect from '../../shared/components/input/CommonSelect.vue'
import ProfileConflictPlanEditor from './ProfileConflictPlanEditor.vue'
import ModConflictPlanEditor from './ModConflictPlanEditor.vue'
import CommonModalShell from '../../shared/components/modal/CommonModalShell.vue'

const { t } = useI18n()
const appStore = useAppStore()
const modStore = useModStore()
const profileStore = useProfileStore()

const dialogMode = computed(() => String(appStore.packageTransferDialog.mode || 'mod-import'))
const dialogPreset = computed(() => appStore.packageTransferDialog.preset || {})
const isImportMode = computed(() => dialogMode.value === 'mod-import' || dialogMode.value === 'data-import')

const modPackageSchema = ref(null)
const dataBundleSchema = ref(null)
const inspectData = ref(null)
const selectedBundlePath = ref('')
const lastPreparedImportTargetKey = ref('')

const exportForm = reactive({
  profile_id: '',
  export_scope: 'custom',
  mod_ids: [],
  folder_name_type: 'default',
  include_dependencies: false,
  include_interlocks: false,
  include_language_packs: false,
  include_environment_data: false,
})

const modFolderNameTypeOptions = computed(() => [
  { label: t('packageTransfer.folderNameDefault'), value: 'default' },
  { label: t('packageTransfer.folderNameAlias'), value: 'alias_name' },
  { label: t('packageTransfer.folderNameOriginalName'), value: 'name' },
  { label: t('packageTransfer.folderNameWorkshopId'), value: 'workshop_id' },
  { label: t('packageTransfer.folderNamePackageId'), value: 'package_id' },
])

const modImportForm = reactive({
  import_mods: true,
  target_kind: 'game_install',
  game_install_path: '',
  apply_environment_data: false,
})

const profilePlanRows = ref([])
const modConflictRows = ref([])

const availableInstalls = computed(() => {
  const raw = inspectData.value?.available_installs || modPackageSchema.value?.available_installs || dataBundleSchema.value?.available_installs || []
  return Array.isArray(raw) ? raw : []
})
const availableInstallOptions = computed(() => {
  const options = availableInstalls.value.map(install => ({
    value: String(install.install_path || ''),
    label: `${install.game_version || t('packageTransfer.unknownVersion')} | ${install.install_path || t('packageTransfer.unknownPath')}`,
  }))
  return [
    {
      value: '',
      label: availableInstalls.value.length ? t('packageTransfer.selectGameInstall') : t('packageTransfer.noAvailableGameInstallOption'),
    },
    ...options,
  ]
})
const selfModsPath = computed(() => String(modPackageSchema.value?.self_mods_path || appStore.settings.self_mods_path || '').trim())
const archiveSummary = computed(() => {
  const archiveStats = inspectData.value?.archive_stats || {}
  const bundleSizeBytes = Number(inspectData.value?.bundle_size_bytes || 0)
  const unpackedBytes = Number(archiveStats.uncompressed_bytes || 0)
  const expansionRatio = Number(archiveStats.expansion_ratio || 0)
  if (bundleSizeBytes <= 0 && unpackedBytes <= 0) return null
  return {
    bundleSize: formatFileSize(bundleSizeBytes || Number(archiveStats.compressed_bytes || 0)),
    unpackedSize: formatFileSize(unpackedBytes),
    ratioText: expansionRatio > 0
      ? t('packageTransfer.expansionRatio', { ratio: expansionRatio.toFixed(2) })
      : t('packageTransfer.sizeChangeUnknown'),
  }
})
const targetDiskSpaceSummary = computed(() => {
  const disk = inspectData.value?.target_disk_space
  if (!disk) return null
  const enough = !!disk.enough
  const freeText = formatFileSize(Number(disk.free_bytes || 0))
  const recommendedText = formatFileSize(Number(disk.recommended_bytes || 0))
  return {
    enough,
    text: t('packageTransfer.diskSpaceText', { free: freeText, recommended: recommendedText }),
  }
})

const dialogTitle = computed(() => {
  if (dialogMode.value === 'mod-export') return dialogPreset.value?.title || t('packageTransfer.exportModPackTitle')
  if (dialogMode.value === 'data-import') return t('packageTransfer.importDataBundleTitle')
  return t('packageTransfer.importModPackTitle')
})

const dialogDesc = computed(() => {
  if (dialogMode.value === 'mod-export') return dialogPreset.value?.description || t('packageTransfer.exportModPackDesc')
  if (dialogMode.value === 'data-import') return t('packageTransfer.importDataBundleDesc')
  return t('packageTransfer.importModPackDesc')
})

const exportScopeOptions = computed(() => {
  const options = Array.isArray(dialogPreset.value?.scopeOptions) ? dialogPreset.value.scopeOptions : []
  return options
})
const allowExportEnvironmentAttach = computed(() => !!dialogPreset.value?.sourceProfile)
const showExportExtraOptions = computed(() => dialogMode.value === 'mod-export' && !!dialogPreset.value?.allowExtraOptions)
const exportPreview = computed(() => {
  if (dialogMode.value !== 'mod-export') return null
  return modStore.resolveCurrentExportPlan({
    exportScope: exportForm.export_scope,
    modIds: exportForm.mod_ids,
    includeDependencies: exportForm.include_dependencies,
    includeInterlocks: exportForm.include_interlocks,
    includeLanguagePacks: exportForm.include_language_packs,
  })
})
const resolvedExportModIds = computed(() => {
  if (dialogMode.value !== 'mod-export') return []
  const resolvedIds = Array.isArray(exportPreview.value?.mod_ids) ? exportPreview.value.mod_ids : exportForm.mod_ids
  return [...new Set((resolvedIds || []).map(id => String(id || '').trim()).filter(Boolean))]
})
const formatExportPlanSummary = (selectedCount = 0, resolvedCount = 0, extraCount = 0, compact = false) => {
  if (extraCount > 0) {
    return compact
      ? t('packageTransfer.exportPlanWithExtrasCompact', { selected: selectedCount, extra: extraCount, total: resolvedCount })
      : t('packageTransfer.exportPlanWithExtras', { selected: selectedCount, extra: extraCount, total: resolvedCount })
  }
  return compact
    ? t('packageTransfer.exportPlanCompact', { selected: selectedCount, total: resolvedCount })
    : t('packageTransfer.exportPlan', { selected: selectedCount, total: resolvedCount })
}
const exportSummary = computed(() => {
  if (dialogMode.value === 'mod-export' && exportPreview.value) {
    const selectedCount = Number(exportPreview.value?.selected_count || 0)
    const resolvedCount = Number(exportPreview.value?.mod_count || selectedCount || 0)
    const extraCount = Number(exportPreview.value?.extra_count || 0)
    const summary = formatExportPlanSummary(selectedCount, resolvedCount, extraCount, false)
    if (dialogPreset.value?.sourceProfile) {
      const profileName = dialogPreset.value?.profileName || profileStore.currentProfile?.name || t('appStore.currentProfile')
      if (dialogPreset.value?.scopeOptionsLoading) {
        return t('packageTransfer.loadingSourceStats', { profile: profileName })
      }
      return t('packageTransfer.sourceSummary', { profile: profileName, summary })
    }
    return summary
  }
  if (dialogPreset.value?.summary) return dialogPreset.value.summary
  const count = Array.isArray(dialogPreset.value?.mod_ids) ? dialogPreset.value.mod_ids.length : 0
  return count > 0 ? t('packageTransfer.selectedModsSummary', { count }) : t('packageTransfer.exportWithCurrentSettings')
})
const extraExportSummary = computed(() => {
  const selectedCount = Number(exportPreview.value?.selected_count || 0)
  const resolvedCount = Number(exportPreview.value?.mod_count || selectedCount || 0)
  const extraCount = Number(exportPreview.value?.extra_count || 0)
  return formatExportPlanSummary(selectedCount, resolvedCount, extraCount, true)
})

const canSubmit = computed(() => {
  if (dialogMode.value === 'mod-export') {
    if (!exportForm.profile_id && dialogPreset.value?.sourceProfile) return false
    return resolvedExportModIds.value.length > 0
  }
  if (!selectedBundlePath.value || !inspectData.value) return false
  if (dialogMode.value === 'data-import') return validateProfileRows()
  if (!modImportForm.import_mods && !modImportForm.apply_environment_data) return false
  if (modImportForm.import_mods) {
    if (modImportForm.target_kind === 'game_install' && !modImportForm.game_install_path) return false
    if (modImportForm.target_kind === 'self_mods' && !selfModsPath.value) return false
  }
  if (modImportForm.apply_environment_data && !validateProfileRows()) return false
  if (modImportForm.import_mods && !validateModConflictRows()) return false
  return true
})

const submitLabel = computed(() => {
  if (dialogMode.value === 'mod-export') return t('packageTransfer.startExport')
  return t('packageTransfer.startImport')
})

const closeDialog = () => {
  appStore.closePackageTransferDialog()
}

const buildImportTargetKey = () => (
  `${selectedBundlePath.value}::${modImportForm.target_kind}::${modImportForm.game_install_path}`
)

const resetState = () => {
  selectedBundlePath.value = String(dialogPreset.value?.bundlePath || '')
  inspectData.value = dialogPreset.value?.inspectData || null
  profilePlanRows.value = buildProfileRows(inspectData.value)
  modConflictRows.value = buildModConflictRows(inspectData.value)
  exportForm.profile_id = String(dialogPreset.value?.profileId || profileStore.currentProfile?.id || appStore.settings.current_profile_id || 'default')
  exportForm.export_scope = String(dialogPreset.value?.export_scope || (exportScopeOptions.value[0]?.value || 'custom'))
  exportForm.mod_ids = Array.isArray(dialogPreset.value?.mod_ids) ? [...dialogPreset.value.mod_ids] : []
  exportForm.folder_name_type = String(dialogPreset.value?.folder_name_type || dialogPreset.value?.folderNameType || appStore.settings.bundle_mod_folder_name_type || 'default')
  exportForm.include_dependencies = !!dialogPreset.value?.include_dependencies
  exportForm.include_interlocks = !!dialogPreset.value?.include_interlocks
  exportForm.include_language_packs = !!dialogPreset.value?.include_language_packs
  exportForm.include_environment_data = !!dialogPreset.value?.include_environment_data
  modImportForm.import_mods = dialogMode.value === 'mod-import'
  modImportForm.target_kind = String(dialogPreset.value?.targetKind || (availableInstalls.value.length > 0 ? 'game_install' : 'self_mods'))
  modImportForm.game_install_path = String(dialogPreset.value?.gameInstallPath || availableInstalls.value[0]?.install_path || '')
  modImportForm.apply_environment_data = false
  lastPreparedImportTargetKey.value = (dialogMode.value === 'mod-import' && inspectData.value)
    ? buildImportTargetKey()
    : ''
}

const loadSchemas = async () => {
  if (dialogMode.value === 'mod-import' || dialogMode.value === 'mod-export') {
    modPackageSchema.value = dialogPreset.value?.modPackageSchema || modPackageSchema.value
    if (!modPackageSchema.value) {
      modPackageSchema.value = await appStore.getModPackageSchema()
    }
  }
  if (dialogMode.value === 'data-import') {
    dataBundleSchema.value = dialogPreset.value?.dataBundleSchema || dataBundleSchema.value
    if (!dataBundleSchema.value) {
      dataBundleSchema.value = await appStore.getDataBundleSchema()
    }
  }
}

watch(
  () => appStore.uiState.showPackageTransferDialog,
  async (visible) => {
    if (!visible) return
    await loadSchemas()
    resetState()
  }
)

const buildProfileRows = (inspect) => {
  const entries = Array.isArray(inspect?.profile_conflicts) ? inspect.profile_conflicts : []
  return entries.map((entry) => {
    const conflicts = Array.isArray(entry?.conflicts) ? entry.conflicts : []
    return reactive({
      archive_key: String(entry?.archive_key || ''),
      name: String(entry?.name || ''),
      conflicts,
      mode: 'create',
      target_profile_id: conflicts[0]?.profile_id || '',
      game_install_path: '',
    })
  })
}

const applyProfileStrategy = (strategy) => {
  profilePlanRows.value.forEach((row) => {
    if (strategy === 'overwrite_all' && row.conflicts.length > 0) {
      row.mode = 'overwrite'
      row.target_profile_id = row.target_profile_id || row.conflicts[0]?.profile_id || ''
      return
    }
    if (strategy === 'skip_all') {
      row.mode = 'skip'
      return
    }
    if (strategy === 'create_all') {
      row.mode = 'create'
    }
  })
}

const buildModConflictRows = (inspect) => {
  const entries = Array.isArray(inspect?.mod_conflicts) ? inspect.mod_conflicts : []
  return entries.map((entry) => reactive({
    folder_name: String(entry?.folder_name || ''),
    existing_path: String(entry?.existing_path || ''),
    mode: 'overwrite',
    rename_to: '',
  }))
}

const applyModConflictStrategy = (strategy) => {
  modConflictRows.value.forEach((row) => {
    if (strategy === 'overwrite_all') row.mode = 'overwrite'
    else if (strategy === 'skip_all') row.mode = 'skip'
    else if (strategy === 'rename_all') row.mode = 'rename'
  })
}

const validateProfileRows = () => {
  for (const row of profilePlanRows.value) {
    if (row.mode === 'overwrite' && !row.target_profile_id) return false
  }
  return true
}

const validateModConflictRows = () => {
  for (const row of modConflictRows.value) {
    if (row.mode === 'rename' && row.rename_to && (row.rename_to.includes('/') || row.rename_to.includes('\\'))) return false
  }
  return true
}

const getBundleFilters = () => {
  if (dialogMode.value === 'data-import') {
    const extensions = [
      dataBundleSchema.value?.file_extension || '.rmmdata.zip',
      ...(Array.isArray(dataBundleSchema.value?.legacy_file_extensions) ? dataBundleSchema.value.legacy_file_extensions : ['.rmmdata']),
    ]
      .map(item => String(item || '').trim())
      .filter(Boolean)
    return [`RMM Data Package (${extensions.map(item => `*${item}`).join(';')})`, 'All Files (*.*)']
  }
  return [`RMM Mod Package (*${modPackageSchema.value?.file_extension || '.rmmmods.zip'})`, 'All Files (*.*)']
}

const pickImportBundle = async () => {
  const bundlePath = await appStore.getFilePath('', getBundleFilters())
  if (!bundlePath) return
  selectedBundlePath.value = bundlePath
  if (dialogMode.value === 'data-import') {
    inspectData.value = await appStore.inspectDataBundle(bundlePath)
  } else {
    inspectData.value = await appStore.prepareModPackageImport(bundlePath, {
      target_kind: modImportForm.target_kind,
      game_install_path: modImportForm.game_install_path,
    })
  }
  if (!inspectData.value) return
  lastPreparedImportTargetKey.value = dialogMode.value === 'mod-import' ? buildImportTargetKey() : ''
  profilePlanRows.value = buildProfileRows(inspectData.value)
  modConflictRows.value = buildModConflictRows(inspectData.value)
}

watch(
  () => [modImportForm.target_kind, modImportForm.game_install_path],
  async () => {
    if (dialogMode.value !== 'mod-import' || !selectedBundlePath.value) return
    const targetKey = buildImportTargetKey()
    if (targetKey === lastPreparedImportTargetKey.value) return
    inspectData.value = await appStore.prepareModPackageImport(selectedBundlePath.value, {
      target_kind: modImportForm.target_kind,
      game_install_path: modImportForm.game_install_path,
    })
    if (!inspectData.value) return
    lastPreparedImportTargetKey.value = targetKey
    modConflictRows.value = buildModConflictRows(inspectData.value)
  }
)

const buildProfileImportPlan = () => profilePlanRows.value.map((row) => ({
  archive_key: row.archive_key,
  mode: row.mode,
  target_profile_id: row.mode === 'overwrite' ? row.target_profile_id : '',
  game_install_path: row.mode === 'create' ? row.game_install_path : '',
}))

const buildModConflictPlan = () => modConflictRows.value.map((row) => ({
  folder_name: row.folder_name,
  mode: row.mode,
  rename_to: row.mode === 'rename' ? String(row.rename_to || '').trim() : '',
}))

const handleSubmit = async () => {
  if (dialogMode.value === 'mod-export') {
    const exportPromise = appStore.exportModPackage({
      profile_id: exportForm.profile_id,
      export_scope: exportForm.export_scope,
      mod_ids: resolvedExportModIds.value,
      include_dependencies: showExportExtraOptions.value ? false : exportForm.include_dependencies,
      include_interlocks: showExportExtraOptions.value ? false : exportForm.include_interlocks,
      include_language_packs: showExportExtraOptions.value ? false : exportForm.include_language_packs,
      include_environment_data: allowExportEnvironmentAttach.value && exportForm.include_environment_data,
      folder_name_type: exportForm.folder_name_type || 'default',
    })
    closeDialog()
    const exported = await exportPromise
    if (!exported) return
    return
  }

  if (dialogMode.value === 'data-import') {
    const imported = await appStore.importDataBundle(selectedBundlePath.value, {
      profile_import_plan: buildProfileImportPlan(),
    })
    if (imported) closeDialog()
    return
  }

  const imported = await appStore.importModPackage(selectedBundlePath.value, {
    import_mods: modImportForm.import_mods,
    target_kind: modImportForm.target_kind,
    game_install_path: modImportForm.game_install_path,
    apply_environment_data: modImportForm.apply_environment_data,
    profile_import_plan: buildProfileImportPlan(),
    mod_conflict_plan: buildModConflictPlan(),
  })
  if (imported) closeDialog()
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-border-subtle);
  border-radius: 999px;
}
</style>
