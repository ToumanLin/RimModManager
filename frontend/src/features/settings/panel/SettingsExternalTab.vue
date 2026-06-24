<template>
              <section class="animate-in fade-in slide-in-from-right-4">
                <h3 class="text-lg font-bold text-text-main mb-6 flex items-center justify-between">{{ t('settings.external.title') }}
                  <button @click="resetToDefaultExternalPaths" v-tooltip="t('settings.external.resetDefaultsTip')" class="px-3 py-1 bg-accent-warn/10 hover:bg-accent-warn/20 border border-accent-warn/30 rounded text-xs font-bold text-accent-warn transition-all">
                    {{ t('settings.external.resetDefaults') }}
                  </button>
                </h3>
                <div class="space-y-6">
                  <div class="modal-section space-y-4 p-5">
                    <div class="flex items-center justify-between gap-3">
                      <div> <h4 class="text-sm font-bold text-text-main">{{ t('settings.external.tools') }}</h4><p class="text-xs text-text-dim mt-1">{{ t('settings.external.toolsDesc') }}</p></div>
                      <button @click="handleCheckTools" class="px-3 py-1.5 bg-accent-tip/10 hover:bg-accent-tip/25 border border-accent-tip/20 rounded-lg text-xs font-bold transition-all">
                        {{ t('settings.external.checkTools') }}
                      </button>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <CommonPathInput class="col-span-2" :label="t('settings.external.steamcmdPath')" v-model="formData.steamcmd_path" @browse="handleBrowse('steamcmd_path')" @blur="checkPath('steamcmd_path', formData.steamcmd_path)" :check="formData.check_info?.steamcmd_path" :description="t('settings.external.steamcmdPathDesc')" />
                      <CommonPathInput class="col-span-2" :label="t('settings.external.ripgrepPath')" v-model="formData.ripgrep_path" @browse="handleBrowse('ripgrep_path')" @blur="checkPath('ripgrep_path', formData.ripgrep_path)" :check="formData.check_info?.ripgrep_path" :description="t('settings.external.ripgrepPathDesc')" />
                      <CommonPathInput class="col-span-2" :label="t('settings.external.textureToolsPath')" v-model="formData.texture_opt.texture_tools_path" @browse="handleBrowse('texture_opt.texture_tools_path', null, 'texture_tools_path')" @blur="checkPath('texture_tools_path', formData.texture_opt.texture_tools_path)" :check="formData.check_info?.texture_tools_path" :description="t('settings.external.textureToolsPathDesc')" />
                      <CommonSwitch class="col-span-1" :label="t('settings.external.autoToolCheck')" v-model="formData.enable_auto_tool_check" :description="t('settings.external.autoToolCheckDesc')" />
                      <CommonNumber class="col-span-1" :label="t('settings.external.checkIntervalDays')" v-model="formData.tool_check_interval_days" :step="1" :min="1" :max="365" />
                    </div>
                  </div>

                  <div class="modal-section space-y-4 p-5">
                    <div class="flex items-center justify-between gap-3">
                      <div> <h4 class="text-sm font-bold text-text-main">{{ t('settings.external.libraries') }}</h4><p class="text-xs text-text-dim mt-1">{{ t('settings.external.librariesDesc') }}</p></div>
                      <button @click="handleCheckExternalData" class="px-3 py-1.5 bg-accent-primary/10 hover:bg-accent-primary/25 border border-accent-primary/20 rounded-lg text-xs font-bold transition-all">
                        {{ t('settings.external.checkLibraries') }}
                      </button>
                    </div>

                    <CommonPathInput :label="t('settings.external.userRulesPath')" v-model="formData.user_rules_path" @browse="handleBrowse('user_rules_path', ['JSON Files (*.json)'])" :check="formData.check_info?.user_rules_path" />
                    <div class="flex items-end gap-1.5">
                        <CommonInput :label="t('settings.external.communityRulesUrl')" v-model="formData.community_rules_url" />
                      <button @click="ruleStore.updateCommunity()" v-tooltip="t('settings.external.updateCommunityRulesTip')" :class="{'opacity-50 cursor-not-allowed pointer-events-none' :ruleStore.isLoading }"
                        class="shrink-0 h-9 w-9 bg-accent-tip/10 hover:bg-accent-tip text-accent-tip hover:text-text-main border border-accent-tip/30 rounded-lg flex items-center justify-center transition-colors">
                        <Download class="size-5" :class="{'animate-bounce': ruleStore.isLoading}" />
                      </button>
                    </div>
                    <CommonPathInput :label="t('settings.external.communityRulesPath')" v-model="formData.community_rules_path" @browse="handleBrowse('community_rules_path', ['JSON Files (*.json)'])" :check="formData.check_info?.community_rules_path" />
                    <div class="py-2 pt-2 place-self-center w-[90%] border-b border-border-base/10"></div>
                    <div class="w-full">
                      <div class="flex justify-between items-center px-1 mb-1">
                        <label class="text-xs text-text-dim uppercase font-bold tracking-widest">
                          {{ t('settings.external.gitProviderCatalog') }}
                          <span v-tooltip="t('settings.external.gitProviderCatalogTip')" class="text-text-dim ml-1 cursor-help italic underline hover:text-text-main">?</span>
                        </label>
                      </div>
                      <textarea v-model="formData.git_provider_catalog_url" rows="3"
                        class="input-glass w-full resize-y px-3 py-2 font-mono text-sm text-text-main focus:outline-none"
                        placeholder="RJW|https://example.invalid/providers.json"></textarea>
                    </div>
                    <div class="py-2 pt-2 place-self-center w-[90%] border-b border-border-base/10"></div>
                    <div class="flex items-end gap-1.5">
                      <CommonInput :label="t('settings.external.workshopDbUrl')" v-model="formData.community_workshop_db_url" />
                      <button @click="updateExternalDB('workshop_db')" v-tooltip="t('settings.external.updateWorkshopDbTip')" :class="{'opacity-50 cursor-not-allowed pointer-events-none' : downloadState['workshop_db'] }"
                        class="shrink-0 h-9 w-9 bg-accent-tip/10 hover:bg-accent-tip text-accent-tip hover:text-text-main border border-accent-tip/30 rounded-lg flex items-center justify-center transition-colors">
                        <Download class="size-5" :class="{'animate-bounce': downloadState['workshop_db']}" />
                      </button>
                    </div>
                    <CommonPathInput :label="t('settings.external.workshopDbPath')" v-model="formData.community_workshop_db_path" @browse="handleBrowse('community_workshop_db_path', ['JSON Files (*.json)'])" :check="formData.check_info?.community_workshop_db_path" />
                    <div class="py-2 pt-2 place-self-center w-[90%] border-b border-border-base/10"></div>
                    <div class="flex items-end gap-1.5">
                      <CommonInput :label="t('settings.external.insteadDbUrl')" v-model="formData.community_instead_db_url" />
                      <button @click="updateExternalDB('instead_db')" v-tooltip="t('settings.external.updateInsteadDbTip')" :class="{'opacity-50 cursor-not-allowed pointer-events-none' : downloadState['instead_db'] }"
                        class="shrink-0 h-9 w-9 bg-accent-tip/10 hover:bg-accent-tip text-accent-tip hover:text-text-main border border-accent-tip/30 rounded-lg flex items-center justify-center transition-colors">
                        <Download class="size-5" :class="{'animate-bounce': downloadState['instead_db']}" />
                      </button>
                    </div>
                    <CommonPathInput :label="t('settings.external.insteadDbPath')" v-model="formData.community_instead_db_path" @browse="handleBrowse('community_instead_db_path', ['JSON Files (*.json;*.gz)'])" :check="formData.check_info?.community_instead_db_path" />
                    <div class="grid grid-cols-2 gap-4 pt-1">
                      <CommonSwitch class="col-span-1" :label="t('settings.external.autoExternalDataCheck')" v-model="formData.enable_auto_external_data_update_check" :description="t('settings.external.autoExternalDataCheckDesc')" />
                      <CommonNumber class="col-span-1" :label="t('settings.external.checkIntervalDays')" v-model="formData.external_data_update_check_interval_days" :step="1" :min="1" :max="365" />
                    </div>
                  </div>
                </div>
              </section>
</template>

<script setup>
import { ref } from 'vue'
import { Download } from 'lucide-vue-next'
import CommonPathInput from '../../../shared/components/input/CommonPathInput.vue'
import CommonSwitch from '../../../shared/components/input/CommonSwitch.vue'
import CommonInput from '../../../shared/components/input/CommonInput.vue'
import CommonNumber from '../../../shared/components/input/CommonNumber.vue'
import { useAppStore } from '../../../app/stores/appStore'
import { useRuleStore } from '../../rules/ruleStore'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  formData: { type: Object, required: true },
  handleBrowse: { type: Function, required: true },
  checkPath: { type: Function, required: true },
})

const appStore = useAppStore()
const ruleStore = useRuleStore()
const { t } = useI18n()

const downloadState = ref({
  workshop_db: false,
  instead_db: false,
})

const resetToDefaultExternalPaths = async () => {
  // 默认路径按后端当前运行环境生成；贴图工具配置是嵌套对象，需要合并而不是整段覆盖。
  const paths = await appStore.getDefaultExternalPaths()
  if (!paths) return
  const { texture_opt, ...rest } = paths
  Object.assign(props.formData, rest)
  if (texture_opt && typeof texture_opt === 'object') {
    props.formData.texture_opt = {
      ...(props.formData.texture_opt || {}),
      ...texture_opt,
    }
  }
}

const handleCheckTools = async () => {
  await appStore.checkToolMaintenance({
    manual: true,
    prompt: true,
    overrides: {
      steamcmd_path: props.formData.steamcmd_path,
      ripgrep_path: props.formData.ripgrep_path,
      texture_opt: props.formData.texture_opt,
    },
  })
}

const handleCheckExternalData = async () => {
  await appStore.checkExternalDataUpdates({
    manual: true,
    prompt: true,
    overrides: {
      user_rules_path: props.formData.user_rules_path,
      community_rules_url: props.formData.community_rules_url,
      community_rules_path: props.formData.community_rules_path,
      community_workshop_db_url: props.formData.community_workshop_db_url,
      community_workshop_db_path: props.formData.community_workshop_db_path,
      community_instead_db_url: props.formData.community_instead_db_url,
      community_instead_db_path: props.formData.community_instead_db_path,
    },
  })
}

const updateExternalDB = async (dbType) => {
  // 每个外部库独立维护下载状态，避免一个按钮下载时锁住其它更新入口。
  downloadState.value[dbType] = true
  await appStore.updateExternalDB(dbType)
  downloadState.value[dbType] = false
}
</script>
