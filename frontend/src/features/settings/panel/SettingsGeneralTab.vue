<template>
              <section class="animate-in fade-in slide-in-from-right-4">
                <h3 class="text-lg font-bold text-text-main mb-6 flex items-center justify-between">{{ t('settings.general.title') }}
                  <button @click="guideStore.resetAllGuides()" v-tooltip="t('settings.general.resetGuidesTip')" class="px-3 py-1 bg-accent-warn/10 hover:bg-accent-warn/20 border border-accent-warn/30 rounded text-xs font-bold text-accent-warn transition-all">
                    {{ t('settings.general.resetGuides') }}
                  </button>
                </h3>
                <div class="space-y-6">
                  <div class="grid grid-cols-2 gap-4">
                    <CommonSelect :label="t('settings.general.language')" v-model="languageModel" :options="languageOptions" />
                    <ThemeSelect v-if="formData.ui" v-model="currentThemeId" :themes="appStore.themes"
                      @create="openThemeCreate" @edit="openThemeEdit" @delete="handleThemeDelete"
                    />
                  </div>
                  <CommonSwitch :label="t('settings.general.openUrlOnSystem')" v-model="formData.open_url_on_system" :description="t('settings.general.openUrlOnSystemDesc')" />
                  <div class="grid grid-cols-2 gap-4">
                    <CommonNumber :label="t('settings.general.fontSize')" :description="t('settings.general.fontSizeDesc')" v-model="formData.ui.font_size" :step="1" :min="8" :max="40" />
                    <CommonNumber :label="t('settings.general.tooltipHoverTime')" :description="t('settings.general.tooltipHoverTimeDesc')" v-model="formData.ui.tooltip_hover_time" :step="100" :min="100" :max="5000" />
                    <CommonNumber :label="t('settings.general.dragDelay')" :description="t('settings.general.dragDelayDesc')" v-model="formData.ui.drag_delay" :step="10" :min="0" :max="500" />
                    <div></div>
                    
                    <div class="modal-section col-span-2 grid grid-cols-2 gap-2 p-2">
                      <span class="col-span-2 ml-2 mt-2 text-sm font-bold tracking-wide">{{ t('settings.general.listSettings') }}
                        <label v-tooltip="t('settings.general.listSettingsTip')" class="text-text-dim ml-1 cursor-help italic underline hover:text-text-main">?</label>
                      </span>
                      <CommonSwitch :label="t('settings.general.modHoverPanel')" v-model="formData.ui.show_mod_hover_panel" :description="t('settings.general.modHoverPanelDesc')" />
                      <CommonSwitch :label="t('settings.general.doubleClickActiveMod')" v-model="formData.ui.double_click_active_mod" :description="t('settings.general.doubleClickActiveModDesc')" />
                      <CommonSwitch :label="t('settings.general.dependencyGraph')" v-model="formData.ui.show_dependency_graph" :description="t('settings.general.dependencyGraphDesc')" />
                      <CommonSwitch :label="t('settings.general.smoothListTargetScroll')" v-model="formData.ui.smooth_list_target_scroll" :description="t('settings.general.smoothListTargetScrollDesc')" />
                      <CommonSwitch :label="t('settings.general.listIndex')" v-model="formData.ui.show_list_index" :description="t('settings.general.listIndexDesc')" />
                    </div>

                    <div class="modal-section col-span-2 grid grid-cols-2 gap-2 p-2">
                      <CommonSwitch class="col-span-2 px-2 pt-2" :label="t('settings.general.listIcons')" v-model="formData.ui.show_list_icon" :description="t('settings.general.listIconsDesc')" mini />
                      <CommonSwitch :disabled="!formData.ui.show_list_icon" :label="t('settings.general.listModIcon')" v-model="formData.ui.show_list_mod_icon" :description="t('settings.general.listModIconDesc')" />
                      <CommonSwitch :disabled="!formData.ui.show_list_icon" :label="t('settings.general.listModTypeIcon')" v-model="formData.ui.show_list_modtype_icon" :description="t('settings.general.listModTypeIconDesc')" />
                    </div>
                    <div class="modal-section col-span-2 grid grid-cols-2 gap-2 p-2">
                      <CommonSwitch class="col-span-2 px-2 pt-2" mini :label="t('settings.general.activeSectionCollapse')" v-model="formData.ui.enable_active_section_collapse" :description="t('settings.general.activeSectionCollapseDesc')" />
                      <CommonSwitch :disabled="!formData.ui.enable_active_section_collapse" :label="t('settings.general.defaultCollapseActiveSections')" v-model="formData.ui.default_collapse_active_sections" :description="t('settings.general.defaultCollapseActiveSectionsDesc')" />
                      <div class="flex items-center gap-1" :class="{'pointer-events-none opacity-50': !formData.ui.enable_active_section_collapse}">
                        <button @click="appStore.openSteamWorkshopById('2138932352', false)"
                          class="px-2 py-1.5 bg-bg-overlay/5 hover:bg-bg-overlay/10 border border-border-base/10 rounded-lg text-xs font-bold cursor-pointer transition-all">
                          <span class="flex items-center gap-2">
                            {{ t('settings.general.visitWorkshopPrefix') }}<p class="text-accent-cool">{{ t('settings.general.sectionTagCollection') }}</p>{{ t('settings.general.visitWorkshopSuffix') }}
                          </span>
                        </button>
                        <button @click="appStore.openSteamWorkshopById('3542535605', false)"
                          class="px-2 py-1.5 bg-bg-overlay/5 hover:bg-bg-overlay/10 border border-border-base/10 rounded-lg text-xs font-bold cursor-pointer transition-all">
                          <span class="flex items-center gap-2">
                            {{ t('settings.general.visitWorkshopPrefix') }}<p class="text-accent-cool">{{ t('settings.general.sectionSortCollection') }}</p>{{ t('settings.general.visitWorkshopSuffix') }}
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    <div class="modal-section col-span-2 grid grid-cols-2 gap-2 p-2">
                      <span class="col-span-2 ml-2 mt-2 text-sm font-bold tracking-wide">{{ t('settings.general.groupSettings') }}
                        <label v-tooltip="t('settings.general.groupSettingsTip')" class="text-text-dim ml-1 cursor-help italic underline hover:text-text-main">?</label>
                      </span>
                      <CommonSwitch :label="t('settings.general.groupIndex')" v-model="formData.ui.show_group_index" :description="t('settings.general.groupIndexDesc')" />
                      <CommonSwitch :label="t('settings.general.groupIcon')" v-model="formData.ui.show_group_icon" :description="t('settings.general.groupIconDesc')" />
                    </div>
                    <div class="modal-section col-span-2 grid grid-cols-2 gap-2 p-2">
                      <span class="col-span-2 ml-2 mt-2 text-sm font-bold tracking-wide">{{ t('settings.general.homeLayout') }}
                        <label v-tooltip="t('settings.general.layoutDragTip')" class="text-text-dim ml-1 cursor-help italic underline hover:text-text-main">?</label>
                      </span>
                      <div class="col-span-2 flex gap-1">
                        <div v-for="item, index in formData.ui.main_layout" :key="item.id"
                          class="flex items-center transition-transform duration-150"
                          :class="getLayoutDragClass('main_layout', index)"
                          draggable="true"
                          @dragstart="handleLayoutDragStart('main_layout', index, $event)"
                          @dragover.prevent="handleLayoutDragOver('main_layout', index)"
                          @drop.prevent="handleLayoutDrop('main_layout', index)"
                          @dragend="handleLayoutDragEnd">
                          <CommonSwitch class="flex-1 cursor-move" :key="item.id" :label="appStore.MAIN_LAYOUT_MAPS[item.id].label" v-model="item.visible" :description="appStore.MAIN_LAYOUT_MAPS[item.id].desc" />
                        </div>
                      </div>
                      
                    </div>

                    <div class="modal-section col-span-2 grid grid-cols-2 gap-2 p-2">
                      <CommonSwitch class="col-span-2 px-2 pt-2" mini :label="t('settings.general.modDetailsPanel')" v-model="getDataById('details', formData.ui.main_layout).visible" :description="t('settings.general.modDetailsPanelDesc')" />
                      <CommonSwitch :disabled="!getDataById('details', formData.ui.main_layout).visible" :label="t('settings.general.iconsCloud')" v-model="formData.ui.show_icons_cloud" :description="t('settings.general.iconsCloudDesc')" />
                      <CommonNumber :label="t('settings.general.detailDelay')" :description="t('settings.general.detailDelayDesc')" v-model="formData.ui.detail_delay" :step="10" :min="0" :max="5000" />
                      <span class="col-span-2 text-xs ml-2 mt-2">{{ t('settings.general.modDetailsLayout') }}
                        <label v-tooltip="t('settings.general.layoutDragTip')" class="text-text-dim ml-1 cursor-help italic underline hover:text-text-main">?</label>
                      </span>
                      <div class="col-span-2 flex flex-col gap-1 p-2 rounded-xl bg-bg-deep/10 border border-border-base/10"
                        :class="{ 'pointer-events-none opacity-50': !getDataById('details', formData.ui.main_layout).visible }">
                        <div v-for="item, index in formData.ui.mod_details_layout" :key="item.id"
                          class="flex items-center transition-transform duration-150"
                          :class="getLayoutDragClass('mod_details_layout', index)"
                          :draggable="getDataById('details', formData.ui.main_layout).visible"
                          @dragstart="handleLayoutDragStart('mod_details_layout', index, $event)"
                          @dragover.prevent="handleLayoutDragOver('mod_details_layout', index)"
                          @drop.prevent="handleLayoutDrop('mod_details_layout', index)"
                          @dragend="handleLayoutDragEnd">
                          <span class="p-1 mr-1 rounded-md bg-accent-primary/30">{{ index }}</span>
                          <CommonSwitch class="flex-1 cursor-move" :disabled="!getDataById('details', formData.ui.main_layout).visible" :key="item.id" :label="appStore.DETAILS_LAYOUT_MAPS[item.id].label" v-model="item.visible" :description="appStore.DETAILS_LAYOUT_MAPS[item.id].desc" />
                        </div>
                      </div>
                      
                    </div>
                    
                  </div>
                </div>
              </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import CommonSwitch from '../../../shared/components/input/CommonSwitch.vue'
import CommonNumber from '../../../shared/components/input/CommonNumber.vue'
import CommonSelect from '../../../shared/components/input/CommonSelect.vue'
import ThemeSelect from '../theme/ThemeSelect.vue'
import { DEFAULT_THEME_ID, applyTheme, createEditableThemeFrom, findThemeById, normalizeTheme } from '../theme/themeManager'
import { useAppStore } from '../../../app/stores/appStore'
import { useConfirmStore } from '../../../shared/components/modal/confirmStore'
import { useGuideStore } from '../../guide/guideStore'
import { setLocale } from '../../../app/i18n'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  formData: { type: Object, required: true },
})

const appStore = useAppStore()
const guideStore = useGuideStore()
const confirmStore = useConfirmStore()
const { t } = useI18n()

const languageOptions = computed(() => [
  { label: t('settings.general.simplifiedChinese'), value: 'zh-CN' },
  { label: 'English', value: 'en' },
])

const languageModel = computed({
  get: () => props.formData.language || 'zh-CN',
  set: async (language) => {
    props.formData.language = language || 'zh-CN'
    setLocale(props.formData.language)
    await appStore.saveSetting('language', props.formData.language)
  },
})

const layoutDragState = ref({ key: '', fromIndex: -1, overIndex: -1 })

const selectedFormTheme = computed(() => {
  return findThemeById(appStore.themes, currentThemeId.value)
})

// 主题选择需要立即生效，保存按钮只负责提交设置表单里的其它改动。
const currentThemeId = computed({
  get: () => appStore.settings.ui?.theme_id || DEFAULT_THEME_ID,
  set: async (themeId) => {
    if (!appStore.settings.ui) appStore.settings.ui = {}
    appStore.settings.ui.theme_id = themeId || DEFAULT_THEME_ID
    applyTheme(findThemeById(appStore.themes, appStore.settings.ui.theme_id))
    await appStore.saveSetting('ui', appStore.settings.ui)
  },
})

const openThemeCreate = () => {
  appStore.themeEditor.theme = createEditableThemeFrom(selectedFormTheme.value)
  appStore.themeEditor.isOpen = true
}

const openThemeEdit = (theme) => {
  if (!theme || theme.builtin) return
  appStore.themeEditor.theme = normalizeTheme(theme)
  appStore.themeEditor.isOpen = true
}

const handleThemeDelete = async (theme) => {
  if (!theme || theme.builtin) return
  const ok = await confirmStore.confirmAction(
    t('settings.general.deleteThemeTitle'),
    t('settings.general.deleteThemeMessage', { name: theme.name }),
    { type: 'error' },
  )
  if (!ok) return
  const deleted = await appStore.deleteUserTheme(theme.id)
  if (deleted && currentThemeId.value === theme.id) {
    currentThemeId.value = DEFAULT_THEME_ID
  }
}

const getDataById = (id, datas) => datas.find(item => item.id === id)

// 布局排序只修改当前设置表单副本，最终仍由设置面板的保存流程统一提交。
const getLayoutList = (layoutKey) => {
  const list = props.formData?.ui?.[layoutKey]
  return Array.isArray(list) ? list : []
}

const handleLayoutDragStart = (layoutKey, index, event) => {
  const list = getLayoutList(layoutKey)
  if (!list[index]) return
  layoutDragState.value = { key: layoutKey, fromIndex: index, overIndex: index }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', `${layoutKey}:${index}`)
}

const handleLayoutDragOver = (layoutKey, index) => {
  if (layoutDragState.value.key !== layoutKey) return
  layoutDragState.value = { ...layoutDragState.value, overIndex: index }
}

const handleLayoutDrop = (layoutKey, toIndex) => {
  const { key, fromIndex } = layoutDragState.value
  const list = getLayoutList(layoutKey)
  if (key !== layoutKey || fromIndex < 0 || toIndex < 0 || fromIndex === toIndex || !list[fromIndex]) {
    handleLayoutDragEnd()
    return
  }
  const nextList = [...list]
  const [moving] = nextList.splice(fromIndex, 1)
  nextList.splice(toIndex, 0, moving)
  props.formData.ui[layoutKey] = nextList
  handleLayoutDragEnd()
}

const handleLayoutDragEnd = () => {
  layoutDragState.value = { key: '', fromIndex: -1, overIndex: -1 }
}

const getLayoutDragClass = (layoutKey, index) => {
  if (layoutDragState.value.key !== layoutKey) return ''
  if (layoutDragState.value.fromIndex === index) return 'opacity-50 scale-[0.98]'
  if (layoutDragState.value.overIndex === index) return 'translate-y-0 ring-1 ring-accent-primary/60 rounded-xl'
  return ''
}
</script>
