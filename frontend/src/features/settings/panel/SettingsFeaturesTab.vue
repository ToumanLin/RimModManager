<template>
              <section class="animate-in fade-in slide-in-from-right-4">
                <h3 class="text-lg font-bold text-text-main mb-6">{{ t('settings.features.title') }}</h3>
                <div class="space-y-6">
                  <div class="grid grid-cols-2 gap-4">
                    <CommonSwitch class="col-span-1" :label="t('settings.features.autoScan')" v-model="formData.enable_auto_scan" :description="t('settings.features.autoScanDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.launchProfileQuickScan')" v-model="formData.enable_launch_profile_quick_scan" :description="t('settings.features.launchProfileQuickScanDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.fileSizeScan')" v-model="formData.enable_file_size_scan" :description="t('settings.features.fileSizeScanDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.residueScan')" v-model="formData.enable_mod_residue_scan" :description="t('settings.features.residueScanDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.deleteMissingModData')" v-model="formData.delete_missing_mods_data" :description="t('settings.features.deleteMissingModDataDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.persistTempList')" v-model="formData.ui.persist_temp_mod_list" :description="t('settings.features.persistTempListDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.actionPrechecks')" v-model="formData.enable_action_prechecks" :description="t('settings.features.actionPrechecksDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.coexistenceMessage')" v-model="formData.show_coexistence_message" :description="t('settings.features.coexistenceMessageDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.languageSupport')" v-model="formData.check_language_support" :description="t('settings.features.languageSupportDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.languagePacksFollowTargets')" v-model="formData.language_packs_follow_targets" :description="t('settings.features.languagePacksFollowTargetsDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.features.toolMods')" v-model="formData.enable_tool_mods" :description="t('settings.features.toolModsDesc')" />
                    <CommonSelect class="col-span-1" :label="t('settings.features.autoSortStrategy')" v-model="formData.auto_sort_strategy" showBottom
                      :description="t('settings.features.autoSortStrategyDesc')"
                      :options="autoSortStrategyOptions" />
                    <CommonSelect class="col-span-1" :label="t('settings.features.sortOrder')" v-model="formData.sort_mods_by" showBottom
                      :description="t('settings.features.sortOrderDesc')" 
                      :options="sortOrderOptions" />
                    <CommonSelect class="col-span-1" :label="t('settings.features.coexistFolderNaming')" v-model="formData.coexist_mod_folder_name_type" showBottom
                      :description="t('settings.features.coexistFolderNamingDesc')" 
                      :options="coexistFolderNamingOptions" />
                    <CommonSelect class="col-span-1" :label="t('settings.features.linkDeploymentMode')" v-model="formData.link_deployment_mode_full" showBottom
                      :description="t('settings.features.linkDeploymentModeDesc')"
                      :options="linkDeploymentOptions" />
                    <CommonNumber class="col-span-1" :label="t('settings.features.backupRetentionDays')" :description="t('settings.features.backupRetentionDaysDesc')" v-model="formData.backup_retention_days" :step="1" :min="0" :max="365" />
                    <div v-if="formData.translation" class="modal-section col-span-2 grid grid-cols-2 gap-2 p-2">
                      <span class="col-span-2 ml-2 mt-2 text-sm font-bold tracking-wide">{{ t('settings.features.translation') }}</span>
                      <CommonSelect class="col-span-1" :label="t('settings.features.defaultTargetLanguage')" v-model="formData.translation.default.target_language" showBottom
                        :description="t('settings.features.defaultTargetLanguageDesc')"
                        :options="translationLanguageOptions" />
                      <CommonSelect class="col-span-1" :label="t('settings.features.defaultProvider')" v-model="formData.translation.default.provider" showBottom
                        :description="t('settings.features.defaultProviderDesc')"
                        :options="translationProviderOptions" />
                      <button type="button" class="col-span-2 mt-2 flex items-center justify-between rounded-lg border border-border-base/10 bg-bg-inset/70 px-3 py-2 text-left transition-colors hover:border-accent-primary/30 hover:text-accent-primary"
                        @click="showWorkshopTranslationSettings = !showWorkshopTranslationSettings">
                        <span>
                          <span class="block text-xs font-black text-text-main">{{ t('settings.features.workshopDetailTranslation') }}</span>
                          <span class="block text-[0.68rem] text-text-dim">{{ t('settings.features.workshopDetailTranslationDesc') }}</span>
                        </span>
                        <span class="text-xs font-bold text-text-dim">{{ showWorkshopTranslationSettings ? t('settings.features.collapse') : t('settings.features.expand') }}</span>
                      </button>
                      <template v-if="showWorkshopTranslationSettings">
                        <CommonSelect class="col-span-1" :label="t('settings.features.targetLanguage')" v-model="formData.translation.workshop_detail.target_language" showBottom
                          :description="t('settings.features.targetLanguageDesc')"
                          :options="featureLanguageOptions" />
                        <CommonSelect class="col-span-1" :label="t('settings.features.provider')" v-model="formData.translation.workshop_detail.provider" showBottom
                          :description="t('settings.features.providerDesc')"
                          :options="featureProviderOptions" />
                        <CommonSwitch class="col-span-1" :label="t('settings.features.preferUiLanguage')" v-model="formData.translation.workshop_detail.prefer_ui_language_translation"
                          :description="t('settings.features.preferUiLanguageDesc')" />
                        <CommonSwitch class="col-span-1" :label="t('settings.features.autoTranslateMissing')" v-model="formData.translation.workshop_detail.auto_translate_missing"
                          :description="t('settings.features.autoTranslateMissingDesc')" />
                      </template>
                    </div>
                  </div>
                </div>
              </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import CommonSwitch from '../../../shared/components/input/CommonSwitch.vue'
import CommonSelect from '../../../shared/components/input/CommonSelect.vue'
import CommonNumber from '../../../shared/components/input/CommonNumber.vue'
import { useAppStore } from '../../../app/stores/appStore'
import { useI18n } from 'vue-i18n'

defineProps({ formData: { type: Object, required: true } })
const appStore = useAppStore()
const showWorkshopTranslationSettings = ref(false)
const { t } = useI18n()

const translationLanguageOptions = computed(() => [
  { label: t('settings.features.followUiLanguage'), value: 'follow_ui' },
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: '한국어', value: 'ko' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Français', value: 'fr' },
  { label: 'Español', value: 'es' },
  { label: 'Português do Brasil', value: 'pt-BR' },
  { label: 'Русский', value: 'ru' },
])
const autoSortStrategyOptions = computed(() => [
  { label: t('settings.features.classicSort'), value: 'classic_sort_logic' },
  { label: t('settings.features.edgeSort'), value: 'edge_enhanced_sort_logic' },
])
const sortOrderOptions = computed(() => [
  { label: t('settings.features.byAlias'), value: 'alias_name' },
  { label: t('settings.features.byName'), value: 'name' },
  { label: t('settings.features.byPackageId'), value: 'id' },
])
const coexistFolderNamingOptions = computed(() => [
  { label: t('settings.features.byWorkshopId'), value: 'workshop_id' },
  { label: t('settings.features.byPackageId'), value: 'package_id' },
  { label: t('settings.features.byName'), value: 'name' },
  { label: t('settings.features.byAlias'), value: 'alias_name' },
])
const linkDeploymentOptions = computed(() => [
  { label: t('settings.features.incrementalDeployment'), value: 'incremental' },
  { label: t('settings.features.fullRebuild'), value: 'full' },
])
const translationProviderOptions = computed(() => (
  appStore.translationProviders.map(item => ({ label: item.label || item.id, value: item.id }))
))
const featureLanguageOptions = computed(() => [
  { label: t('settings.features.useDefaultTargetLanguage'), value: 'default' },
  ...translationLanguageOptions.value,
])
const featureProviderOptions = computed(() => [
  { label: t('settings.features.useDefaultProvider'), value: 'default' },
  ...translationProviderOptions.value,
])

onMounted(() => {
  void appStore.ensureTranslationProviders()
})
</script>
