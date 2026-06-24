<template>
              <section class="animate-in fade-in slide-in-from-right-4">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-lg font-bold text-text-main">{{ t('settings.paths.title') }}
                    <label v-tooltip="t('settings.paths.titleTip')" class="text-text-dim ml-1 cursor-help italic underline hover:text-text-main">?</label>
                    <label class="ml-5 text-xs py-0.5 px-2 text-accent-cool bg-accent-cool/20 rounded-md" v-tooltip="`${t('settings.paths.currentProfile')}：${profileStore?.currentProfile?.name}\n${t('settings.paths.description')}：${profileStore?.currentProfile?.description}`">
                      {{ profileStore?.currentProfile?.name }}
                    </label>
                  </h3>
                  <button @click="autoDetect" v-tooltip="t('settings.paths.autoDetectTip')" class="px-3 py-1 bg-accent-success/10 hover:bg-accent-success/20 border border-accent-success/30 rounded text-xs font-bold text-accent-success transition-all">
                    {{ t('settings.paths.autoDetect') }}
                  </button>
                </div>
                <div class="grid gap-6">
                  <CommonPathInput :label="t('settings.paths.gameInstallPath')" v-model="formData.game_install_path" @browse="handleGameBrowse"
                    :check="formData.check_info?.game_install_path"
                    :description="t('settings.paths.gameInstallPathDesc')" 
                    @blur="checkPath('game_install_path', formData.game_install_path)"/>
                  <CommonPathInput :label="t('settings.paths.userDataPath')" v-model="formData.user_data_path" @browse="handleBrowse('user_data_path')" 
                    :check="formData.check_info?.user_data_path"
                    :description="t('settings.paths.userDataPathDesc')" 
                    @blur="checkPath('user_data_path', formData.user_data_path)"/>
                  <!-- <CommonPathInput label="游戏配置目录" v-model="formData.game_config_path" @browse="handleBrowse('game_config_path')" 
                    :check="formData.check_info?.game_config_path"
                    :description="'游戏配置目录即排序文件（ModsConfig.xml）所在的目录，默认配置目录一般位于：\nC:/Users/{用户名}/AppData/LocalLow/Ludeon Studios/RimWorld by Ludeon Studios/Config'" 
                    @blur="checkPath('game_config_path', formData.game_config_path)"/> -->
                  <CommonPathInput :label="t('settings.paths.workshopModsPath')" v-model="formData.workshop_mods_path" @browse="handleBrowse('workshop_mods_path')" 
                    :check="formData.check_info?.workshop_mods_path"
                    :description="t('settings.paths.workshopModsPathDesc')" 
                    @blur="checkPath('workshop_mods_path', formData.workshop_mods_path)"/>
                  <CommonPathInput :label="t('settings.paths.localModsPath')" v-model="formData.local_mods_path" readOnly @browse="handleBrowse('local_mods_path')" :description="t('settings.paths.localModsPathDesc')" />
                  <CommonTagInput :label="t('settings.paths.runCommands')" v-model="formData.run_commands" :allTags="RUN_COMMAND_TAGS" :placeholder="t('settings.paths.runCommandsPlaceholder')" :description="t('settings.paths.runCommandsDesc')" />
                  <div class="modal-section grid grid-cols-1 gap-2 p-3">
                    <CommonPathInput :label="t('settings.paths.steamPath')" :check="formData.check_info?.steam_path"
                      :description="t('settings.paths.steamPathDesc')" 
                      v-model="formData.steam_path" @browse="handleBrowse('steam_path')" @blur="checkPath('steam_path', formData.steam_path)"
                    />
                    <div class="grid grid-cols-2 gap-2">
                      <CommonSwitch :label="t('settings.paths.preferSteamLaunch')" :disabled="steamLaunchDisabled" v-model="formData.prefer_steam_launch" :description="t('settings.paths.preferSteamLaunchDesc')" />
                      <CommonSwitch :label="t('settings.paths.useWorkshopMods')" :disabled="workshopModsDisabled" v-model="formData.use_workshop_mods" :description="t('settings.paths.useWorkshopModsDesc')" />
                    </div>
                  </div>
                  <div class="modal-section grid grid-cols-2 gap-2 p-3">
                    <h3 class="col-span-2 text-sm font-bold ml-1 text-text-main">{{ t('settings.paths.managerMods') }}</h3>
                    <CommonPathInput class=" col-span-2" :label="t('settings.paths.selfModsPath')" :check="formData.check_info?.self_mods_path"
                      :description="t('settings.paths.selfModsPathDesc')" 
                      v-model="formData.self_mods_path" @browse="handleBrowse('self_mods_path')" @blur="checkPath('self_mods_path', formData.self_mods_path)"
                    />
                    <CommonSwitch :label="t('settings.paths.useSelfMods')" v-model="formData.use_self_mods" :description="t('settings.paths.useSelfModsDesc')" />
                    <CommonSwitch :label="t('settings.paths.moveOldSelfMods')" v-model="formData.move_old_self_mods" :description="t('settings.paths.moveOldSelfModsDesc')" />
                    <CommonSwitch class="col-span-1" :label="t('settings.paths.autoSteamcmdModUpdateCheck')" v-model="formData.enable_auto_steamcmd_mod_update_check" :description="t('settings.paths.autoSteamcmdModUpdateCheckDesc')" />
                    <div class="col-span-1 grid grid-cols-2 gap-3 items-end">
                      <CommonNumber class="col-span-1" :label="t('settings.paths.checkIntervalDays')" v-model="formData.steamcmd_mod_update_check_interval_days" :step="1" :min="1" :max="365" />
                      <button @click="handleCheckSteamcmdMods" class="px-3 py-1.5 mx-2 my-1 h-8 bg-accent-warn/10 hover:bg-accent-warn/25 border border-accent-warn/20 rounded-lg text-xs font-bold transition-all"> {{ t('settings.paths.checkUpdates') }} </button>
                    </div>
                  </div>
                  <div class="modal-section grid grid-cols-2 gap-2 p-3">
                    <h3 class="col-span-2 text-sm font-bold ml-1 text-text-main">{{ t('settings.paths.loadOrderStartFolder') }}</h3>
                    <CommonSelect class="col-span-1" :label="t('settings.paths.importStartDir')" v-model="formData.load_order_import_dir_mode"
                      :description="t('settings.paths.importStartDirDesc')"
                      :options="LOAD_ORDER_DIR_MODE_OPTIONS"
                    />
                    <CommonSelect class="col-span-1" :label="t('settings.paths.exportStartDir')" v-model="formData.load_order_export_dir_mode"
                      :description="t('settings.paths.exportStartDirDesc')"
                      :options="LOAD_ORDER_DIR_MODE_OPTIONS"
                    />
                    <CommonPathInput v-if="formData.load_order_import_dir_mode === 'custom'" class="col-span-2" :label="t('settings.paths.customImportStartDir')" v-model="formData.load_order_import_custom_path"
                      :check="formData.check_info?.load_order_import_custom_path" :description="t('settings.paths.customImportStartDirDesc')"
                      @browse="handleBrowse('load_order_import_custom_path')" @blur="checkPath('load_order_import_custom_path', formData.load_order_import_custom_path)"
                    />
                    <CommonPathInput v-if="formData.load_order_export_dir_mode === 'custom'" class="col-span-2" :label="t('settings.paths.customExportStartDir')" v-model="formData.load_order_export_custom_path"
                      :check="formData.check_info?.load_order_export_custom_path" :description="t('settings.paths.customExportStartDirDesc')"
                      @browse="handleBrowse('load_order_export_custom_path')" @blur="checkPath('load_order_export_custom_path', formData.load_order_export_custom_path)"
                    />
                  </div>
                  <!-- <CommonPathInput label="主目录" v-model="formData.home_path" @browse="handleBrowse('home_path')" /> -->
                </div>
              </section>
</template>

<script setup>
import CommonPathInput from '../../../shared/components/input/CommonPathInput.vue'
import CommonSwitch from '../../../shared/components/input/CommonSwitch.vue'
import CommonSelect from '../../../shared/components/input/CommonSelect.vue'
import CommonNumber from '../../../shared/components/input/CommonNumber.vue'
import CommonTagInput from '../../../shared/components/input/CommonTagInput.vue'
import { RUN_COMMAND_TAGS } from '../../../shared/lib/constants'
import { useAppStore } from '../../../app/stores/appStore'
import { useProfileStore } from '../../profiles/profileStore'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  formData: { type: Object, required: true },
  steamLaunchDisabled: Boolean,
  workshopModsDisabled: Boolean,
  autoDetect: { type: Function, required: true },
  handleBrowse: { type: Function, required: true },
  checkPath: { type: Function, required: true },
})

const appStore = useAppStore()
const profileStore = useProfileStore()
const { t } = useI18n()

const LOAD_ORDER_DIR_MODE_OPTIONS = computed(() => [
  { label: t('settings.paths.modes.default'), value: 'default' },
  { label: t('settings.paths.modes.remember'), value: 'remember' },
  { label: t('settings.paths.modes.custom'), value: 'custom' },
])

const handleGameBrowse = async () => {
  // 游戏目录会影响 Steam 版判定和本地模组路径，选择后立即刷新校验结果。
  const res = await appStore.getFolderPath(props.formData.game_install_path)
  if (!res) return
  props.formData.game_install_path = res
  await props.checkPath('game_install_path', props.formData.game_install_path)
}

const handleCheckSteamcmdMods = async () => {
  await appStore.checkSteamcmdModUpdates({ manual: true, prompt: true })
}
</script>
