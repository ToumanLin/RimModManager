import { toast, checkResult } from '../../../shared/lib/common'
import { useModStore } from '../../../features/mod/stores/modStore'
import { useProfileStore } from '../../../features/profiles/profileStore'
import { setLocale, t } from '../../i18n'
import { ensurePywebviewBridge } from '../../bridge/pywebviewBridge'

const SETTING_KEYS_REQUIRING_LIST_SCAN = [
  'workshop_mods_path',
  'self_mods_path',
  'steamcmd_mods_path',
]

const takeModListSettingsSnapshot = (settings = {}, context = {}) => ({
  settings: Object.fromEntries(
    SETTING_KEYS_REQUIRING_LIST_SCAN.map(key => [key, settings?.[key] ?? null])
  ),
  context: {
    profile_id: context?.profile_id || '',
    game_install_path: context?.game_install_path || '',
    user_data_path: context?.user_data_path || '',
    use_workshop_mods: !!context?.use_workshop_mods,
    use_self_mods: !!context?.use_self_mods,
  },
})

const shouldRefreshModListAfterSettingsSave = (before, after) => {
  return (
    SETTING_KEYS_REQUIRING_LIST_SCAN.some(key => before.settings[key] !== after.settings[key])
    || Object.keys(before.context).some(key => before.context[key] !== after.context[key])
  )
}

export const useSettingsActions = ({
  settings,
  uiState,
  isLoading,
  userThemes,
  applyCurrentTheme,
  syncRemoteImageCache,
  refreshData,
} = {}) => {
  // 打开/关闭设置页面
  const openSettingsPanel = () => { uiState.showSettingsPanel = true }
  const closeSettingsPanel = () => { uiState.showSettingsPanel = false }

  // 保存单项设置
  const saveSetting = async (key, value) => {
    if (!await ensurePywebviewBridge()) return
    isLoading.value = true
    try {
      const res = await window.pywebview.api.save_setting(key, value)
      if (checkResult(res, t('settingsActions.saveSetting'), true)) {
        const nextSettings = res.data?.settings || null
        if (nextSettings) Object.assign(settings.value, nextSettings)
        else settings.value[key] = value
        if (key === 'language' || nextSettings?.language) setLocale(settings.value.language)
      }
    } catch (e) {
      console.error("保存单项设置异常:", e)
      toast.error(t('settingsActions.saveSettingError', { message: e.message }))
    } finally {
      isLoading.value = false
    }
  }

  const refreshUserThemes = async () => {
    if (!await ensurePywebviewBridge()) return userThemes.value
    const res = await window.pywebview.api.theme_list_user()
    if (checkResult(res, t('settingsActions.loadUserThemes'), true)) {
      userThemes.value = res.data?.themes || []
      applyCurrentTheme()
    }
    return userThemes.value
  }

  const saveUserTheme = async (theme) => {
    if (!await ensurePywebviewBridge()) return null
    const res = await window.pywebview.api.theme_save_user(theme)
    if (!checkResult(res, t('settingsActions.saveUserTheme'))) return null
    const savedTheme = res.data?.theme
    if (savedTheme) {
      const nextThemes = userThemes.value.filter(item => item.id !== savedTheme.id)
      userThemes.value = [...nextThemes, savedTheme]
      applyCurrentTheme()
    }
    return savedTheme
  }

  const deleteUserTheme = async (themeId) => {
    if (!await ensurePywebviewBridge()) return false
    const res = await window.pywebview.api.theme_delete_user(themeId)
    if (!checkResult(res, t('settingsActions.deleteUserTheme'))) return false
    userThemes.value = userThemes.value.filter(item => item.id !== themeId)
    applyCurrentTheme()
    return !!res.data?.deleted
  }

  // 应用全部设置（保存到后端并更新本地）
  const applySettings = async (newSettings) => {
    if (!await ensurePywebviewBridge()) return
    isLoading.value = true
    try {
      const profileStore = useProfileStore()
      const previousListSnapshot = takeModListSettingsSnapshot(settings.value, profileStore.activeContext)
      const res = await window.pywebview.api.save_all_settings(newSettings)
      if (checkResult(res, t('settingsActions.applySettings'))) {
        const nextSettings = res.data.settings || {}
        const nextContext = res.data.active_context || profileStore.activeContext
        // 更新本地 store
        Object.assign(settings.value, nextSettings)
        setLocale(settings.value.language)
        applyCurrentTheme()
        syncRemoteImageCache(res.data.remote_image_cache)
        profileStore.activeContext = nextContext

        closeSettingsPanel()

        const nextListSnapshot = takeModListSettingsSnapshot(settings.value, nextContext)
        if (!shouldRefreshModListAfterSettingsSave(previousListSnapshot, nextListSnapshot)) {
          return
        }

        if (settings.value.enable_auto_scan && nextContext?.is_healthy) {
          const modStore = useModStore()
          await modStore.scanMods(null, false)
        } else{
          await refreshData()
        }
        // await initialize()
      }
    } catch (e) {
      console.error("应用设置异常:", e)
      toast.error(t('settingsActions.applySettingsError', { message: e.message }))
    } finally {
      isLoading.value = false
    }
  }

  return {
    // 面板
    openSettingsPanel, closeSettingsPanel,
    // 设置保存
    saveSetting, applySettings,
    // 用户主题
    refreshUserThemes, saveUserTheme, deleteUserTheme,
  }
}
