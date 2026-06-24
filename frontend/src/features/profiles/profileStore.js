// stores/profileStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from '../../app/stores/appStore'
import { useModStore } from '../mod/stores/modStore'
import { useGroupStore } from '../mod/stores/groupStore'
import { useConfirmStore } from '../../shared/components/modal/confirmStore'
import { toast, checkResult } from '../../shared/lib/common'
import { useOrderStore } from '../load-order/orderStore'
import { t } from '../../app/i18n'


export const useProfileStore = defineStore('profile', () => {
  const appStore = useAppStore()

  // === State ===
  const profiles = ref([])      // 所有环境配置
  const currentProfileId = ref('default')
  const orphanedProfiles = ref([]) // 磁盘上存在但数据库没记录的配置
  const isLoading = ref(false)   // 环境列表加载状态

  // 当前激活的严格上下文 (Active Context)
  const activeContext = ref({
    profile_id: '',
    game_install_path: '',
    user_data_path: '',
    game_version: '',
    prefer_steam_launch: false,
    use_workshop_mods: false,
    use_self_mods: false,
    is_steam: false,
    is_steam_managed: false,
    runtime_capabilities: {},
    run_commands: [],

    local_mods_path: '',
    game_dlc_path: '',
    game_config_path: '',
    game_saves_path: '',
    mods_config_file: '',
    backup_dir: '',

    // 健康哨兵状态
    is_healthy: true,
    health_report: {}
  })

  // === Getters ===
  const currentProfile = computed(() =>
    profiles.value.find(p => p.id === currentProfileId.value) || null
  )

  const applyLastPlayedTime = (profileId, lastPlayedTime) => {
    const normalizedProfileId = String(profileId || '').trim()
    const normalizedPlayedTime = Number(lastPlayedTime || 0)
    if (!normalizedProfileId || !normalizedPlayedTime) return

    const profile = profiles.value.find(item => item.id === normalizedProfileId)
    if (profile) profile.last_played_time = normalizedPlayedTime
  }

  // === Actions ===
  const sleep = (ms) => new Promise(resolve => window.setTimeout(resolve, ms))

  const buildSteamShortcutProgressMessage = (steps) => (
    [
      t('profiles.steamShortcutSteps'),
      ...steps.map(step => `${step.done ? '√' : step.active ? '&gt;' : '-'} ${step.label}`)
    ].join('<br>')
  )

  // 获取环境列表
  const fetchProfiles = async () => {
    if (!window.pywebview) return
    const res = await window.pywebview.api.profiles_get()
    if (checkResult(res, t('profiles.fetchProfiles'))) {
      profiles.value = res.data
    }
  }

  // 创建新环境
  const createProfile = async (data, copyCurrentData = false) => {
    isLoading.value = true
    try {
      const res = await window.pywebview.api.profile_create(data, copyCurrentData)
      if (checkResult(res, t('profiles.createProfile', { name: data.name }),true)) {
        await fetchProfiles()
        return true
      }
    } finally {
      isLoading.value = false
    }
    return false
  }

  // 切换环境 (核心逻辑)
  const switchProfile = async (profileId) => {
    // if (profileId === currentProfileId.value) return
    appStore.isLoading = true
    isLoading.value = true
    try {
      const orderStore = useOrderStore()
      await orderStore.saveInactiveOrder();  // 先保存停用列表顺序
      const res = await window.pywebview.api.profile_activate(profileId)
      if (checkResult(res, t('profiles.switchProfile'))) {
        currentProfileId.value = res?.data?.profile?.id || profileId
        // 【关键逻辑】环境切换后，重置并刷新所有数据
        const groupStore = useGroupStore()
        // 1. 清空当前前端的缓存，防止数据交叉
        const modStore = useModStore()
        modStore.reset()
        groupStore.reset()
        // 2. 先立即拉取一次新环境上下文，确保停用列表等持久化状态即时恢复
        await appStore.refreshData()
        // 3. 当前环境链接已由后端即时收敛；仅在开启自动扫描时再补磁盘事实
        if (appStore.settings.enable_auto_scan !== false && activeContext.value?.is_healthy !== false) {
          await appStore.requestModScan()
        }
        toast.success(t('profiles.switchedProfile', { name: currentProfile.value?.name || currentProfileId.value }))
      } else {
        const fallbackProfileId = String(res?.data?.fallback_profile_id || '').trim()
        if (fallbackProfileId) {
          currentProfileId.value = fallbackProfileId
          await appStore.refreshData()
          await fetchProfiles()
        }
      }
    } finally {
      appStore.isLoading = false
      isLoading.value = false
    }
  }

  // 更新环境信息
  const updateProfile = async (profileId, updates) => {
    const res = await window.pywebview.api.profile_update(profileId, updates)
    if (checkResult(res, t('profiles.updateProfile', { id: profileId }), true)) {
      await fetchProfiles()
      if (profileId === currentProfileId.value) {
        await appStore.refreshData()
      }
    }
  }

  // 删除环境
  const deleteProfile = async (profileId, force = false) => {
    const res = await window.pywebview.api.profile_delete(profileId, !!force)
    if (checkResult(res, t('profiles.deleteProfile'))) {
      await fetchProfiles()
      // 如果删的是当前的，后端会自动切回 default，前端需要同步
      if (profileId === currentProfileId.value) {
        currentProfileId.value = 'default'
        switchProfile('default')
      }
    }
  }

  // 创建环境桌面快捷方式
  const createDesktopShortcut = async (profileId) => {
    const profile = profiles.value.find(item => item.id === profileId)
    const res = await window.pywebview.api.profile_create_desktop_shortcut(profileId)
    if (res?.status === 'warning' && res?.data?.shortcut_kind === 'steam_vdf_flow_required') {
      if (!profile) return null
      return await createSteamVdfDesktopShortcut(profile)
    }
    if (checkResult(res, t('profiles.createDesktopShortcut'), true)) {
      return res.data
    }
    return null
  }

  const createSteamVdfDesktopShortcut = async (profile) => {
    const confirmStore = useConfirmStore()
    const steps = [
      { label: t('profiles.shortcutStepCloseSteam'), done: false, active: true },
      { label: t('profiles.shortcutStepWriteConfig'), done: false, active: false },
      { label: t('profiles.shortcutStepLaunchSteam'), done: false, active: false },
      { label: t('profiles.shortcutStepFinalize'), done: false, active: false },
    ]

    const updateProgress = () => {
      confirmStore.state.title = t('profiles.createSteamShortcut')
      confirmStore.state.message = buildSteamShortcutProgressMessage(steps)
      confirmStore.state.isHtml = true
      confirmStore.state.mode = 'confirm'
      confirmStore.state.type = 'warning'
      confirmStore.state.confirmText = t('common.confirm')
      confirmStore.state.cancelText = t('common.cancel')
      confirmStore.state.actionButtons = [{ label: t('common.cancel'), value: 'cancel', kind: 'secondary' }]
    }

    const setActiveStep = (index) => {
      steps.forEach((step, idx) => {
        step.active = idx === index
      })
      updateProgress()
    }

    const completeStep = (index) => {
      steps[index].done = true
      steps[index].active = false
      updateProgress()
    }

    let cancelled = false
    confirmStore.open({
      title: t('profiles.createSteamShortcut'),
      message: buildSteamShortcutProgressMessage(steps),
      isHtml: true,
      mode: 'confirm',
      type: 'warning',
      actionButtons: [{ label: t('common.cancel'), value: 'cancel', kind: 'secondary' }],
    }).then(() => {
      cancelled = true
      return null
    })

    try {
      setActiveStep(0)
      while (!cancelled) {
        const statusRes = await window.pywebview.api.steam_process_status()
        if (statusRes?.status === 'success' && !statusRes?.data?.running) break
        await sleep(1000)
      }
      if (cancelled) return null
      completeStep(0)

      setActiveStep(1)
      const registerRes = await window.pywebview.api.profile_register_steam_shortcut(profile.id)
      if (!checkResult(registerRes, t('profiles.writeSteamShortcutConfig'))) return null
      const logProbe = registerRes?.data?.log_probe || null
      completeStep(1)

      setActiveStep(2)
      const steamLaunchRes = await window.pywebview.api.steam_launch_client()
      if (!checkResult(steamLaunchRes, t('profiles.launchSteamClient'))) return null
      completeStep(2)

      setActiveStep(3)
      const finalizeRes = await window.pywebview.api.profile_finalize_steam_shortcut(profile.id, logProbe)
      if (cancelled) return null

      if (finalizeRes?.status === 'success') {
        completeStep(3)
        confirmStore.closeSilently()
        checkResult(finalizeRes, t('profiles.createDesktopShortcut'), true)
        return finalizeRes.data
      }

      confirmStore.closeSilently()
      if (finalizeRes) {
        checkResult(finalizeRes, t('profiles.createDesktopShortcut'))
      }
      return null
    } finally {
      if (confirmStore.isVisible) confirmStore.closeSilently()
    }
  }

  // 扫描孤立配置
  const scanOrphans = async () => {
    const res = await window.pywebview.api.profiles_scan_orphaned()
    if (checkResult(res, t('profiles.scanOrphans'))) {
      orphanedProfiles.value = res.data
    }
  }

  // 导入孤立配置
  const importOrphan = async (profileData) => {
    const res = await window.pywebview.api.profile_import_orphaned(profileData)
    if (checkResult(res, t('profiles.importProfile'))) {
      toast.success(t('profiles.profileRestored'))
      await fetchProfiles()
      await scanOrphans()
    }
  }

  return {
    // 状态
    profiles, currentProfileId, orphanedProfiles, currentProfile, isLoading, activeContext,
    // 环境管理
    fetchProfiles, createProfile, switchProfile, updateProfile, deleteProfile, createDesktopShortcut,
    // 运行记录与孤立环境
    applyLastPlayedTime,
    scanOrphans, importOrphan,
  }
})
