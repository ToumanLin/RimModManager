import { toast, checkResult } from '../../../shared/lib/common'
import { useWorkspaceStore } from '../../../features/workspace/workspaceStore'
import { usePromptQueueStore } from '../../../features/ai/promptQueueStore'
import { t } from '../../i18n'

export const useMaintenanceActions = ({
  settings,
  waitForDownload,
  refreshData,
  refreshModsData,
  downloadWorkshopItems,
} = {}) => {
  const isTimedCheckDue = (enabled, lastCheckTime, intervalDays, fallbackDays = 1) => {
    if (!enabled) return false
    const last = Number(lastCheckTime || 0)
    const interval = Math.max(1, Number(intervalDays || fallbackDays)) * 24 * 60 * 60 * 1000
    const duration = Date.now() - last
    return !last || duration > interval || duration < 0
  }

  const buildTimedCheckDecision = ({ enabled, lastCheckTime, intervalDays, fallbackDays = 1 } = {}) => {
    const last = Number(lastCheckTime || 0)
    const interval = Math.max(1, Number(intervalDays || fallbackDays)) * 24 * 60 * 60 * 1000
    const elapsed = Date.now() - last
    const due = !!enabled && (!last || elapsed > interval || elapsed < 0)
    const reason = !enabled ? 'disabled' : (!last ? 'never_checked' : (elapsed < 0 ? 'clock_rollback' : (due ? 'interval_due' : 'interval_not_due')))
    return { due, reason, enabled: !!enabled, lastCheckTime: last, intervalDays: Math.round(interval / 24 / 60 / 60 / 1000), elapsedMs: elapsed }
  }

  const logMaintenanceCheck = (event, payload = {}, level = 'info') => {
    // 统一启动/维护检测日志格式，排查“为什么没自动检查”时只需要搜索这个前缀。
    const method = level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'info'
    console[method]('[RMM][maintenance-check]', { event, ...payload })
  }

  const formatDateTime = (timestamp) => {
    const value = Number(timestamp || 0)
    if (!value) return t('maintenance.unknown')
    try {
      return new Date(value).toLocaleString(globalThis.__RMM_UI_FORMAT_LOCALE__ || 'zh-CN')
    } catch {
      return t('maintenance.unknown')
    }
  }

  const installToolIssues = async (issues = []) => {
    if (!window.pywebview || !Array.isArray(issues) || issues.length === 0) return false
    let started = false
    const hasSteamCmdIssue = issues.some(item => item?.tool_id === 'steamcmd')
    const hasToddsIssue = issues.some(item => item?.tool_id === 'todds')
    const hasRipgrepIssue = issues.some(item => item?.tool_id === 'ripgrep')

    if (hasSteamCmdIssue) {
      const res = await window.pywebview.api.steam_tools_install()
      if (checkResult(res, t('maintenance.handleSteamcmd'))) {
        started = true
        if (Array.isArray(res.data?.pending_tasks) && res.data.pending_tasks.length > 0) {
          toast.info(t('maintenance.steamcmdTasksStarted'))
        }
      }
    }

    if (hasToddsIssue) {
      const res = await window.pywebview.api.texture_prepare_download(settings.value.texture_opt)
      if (checkResult(res, t('maintenance.handleTodds'))) {
        started = true
        if (!res.data?.already_ready) {
          toast.info(t('maintenance.toddsDownloadStarted'))
        }
      }
    }

    if (hasRipgrepIssue) {
      const ripgrepIssue = issues.find(item => item?.tool_id === 'ripgrep') || {}
      const res = await window.pywebview.api.ripgrep_prepare_download(ripgrepIssue?.maintenance_action === 'upgrade')
      if (checkResult(res, t('maintenance.handleRipgrep'))) {
        started = true
        if (!res.data?.already_ready) {
          toast.info(t('maintenance.ripgrepDownloadStarted'))
        }
      }
    }
    return started
  }

  const getToolIssueActionLabel = (item = {}) => {
    // 后端会把存在性、初始化、升级判断统一成 maintenance_action，前端只负责显示用户能理解的动作。
    const action = String(item?.maintenance_action || '').trim()
    if (action === 'upgrade') return t('maintenance.upgrade')
    if (action === 'initialize') return t('maintenance.initialize')
    if (action === 'install') return t('maintenance.install')
    return t('maintenance.handle')
  }

  const triggerGithubManagedModUpdate = async (item = {}) => {
    if (!window.pywebview || !item?.repo_url) return false
    const targetVersion = String(item.target_version || item.latest_version || '').trim()
    const res = await window.pywebview.api.github_trigger_download(item.repo_url, item.install_type || 'source', targetVersion)
    if (!checkResult(res, t('maintenance.updateGitRepoMod', { title: item.title || '' }).trim())) return false
    toast.info(t('maintenance.gitDeployStarted'), { timeout: 4000 })
    const workspaceStore = useWorkspaceStore()
    workspaceStore.startGithubTimelinePolling(item.repo_url, { intervalMs: 4000, maxPolls: 15 })
    return true
  }

  const updateManagedModItems = async (items = []) => {
    // 批量动作按来源拆分：SteamCMD 支持合并下载，Git 仓库订阅逐项启动部署任务。
    const normalizedItems = Array.isArray(items) ? items : []
    const workshopIds = [...new Set(
      normalizedItems
        .filter(item => String(item?.source || '').toLowerCase() === 'steamcmd')
        .map(item => String(item?.workshop_id || '').trim())
        .filter(Boolean)
    )]
    if (workshopIds.length > 0) await downloadWorkshopItems(workshopIds)

    for (const item of normalizedItems.filter(item => String(item?.source || '').toLowerCase() === 'github')) {
      await triggerGithubManagedModUpdate(item)
    }
    return workshopIds.length > 0 || normalizedItems.some(item => String(item?.source || '').toLowerCase() === 'github')
  }

  // 维护检查的时间戳统一在前端落到 settings，避免每个检查函数重复处理“何时算检查成功”。
  const persistMaintenanceCheckedAt = (settingKey, data, shouldPersist = null) => {
    const checkedAt = Number(data?.checked_at || 0)
    if (!settingKey || !checkedAt) return
    if (typeof shouldPersist === 'function' && !shouldPersist(data)) return
    settings.value[settingKey] = checkedAt
  }

  // 维护类接口都遵循同一返回格式：手动触发走 checkResult 给用户反馈，启动期静默触发只接受 success。
  const fetchMaintenanceData = async ({
    apiName,
    workName,
    manual = true,
    lastCheckKey = '',
    shouldPersistCheckedAt = null,
    overrides = null,
  } = {}) => {
    if (!window.pywebview) return null
    const caller = window.pywebview.api?.[apiName]
    if (typeof caller !== 'function') return null

    const res = overrides ? await caller(overrides) : await caller()
    if (manual ? !checkResult(res, workName) : res?.status !== 'success') {
      logMaintenanceCheck('api_result', { apiName, workName, manual, status: res?.status || 'missing', message: res?.message || '' }, manual ? 'warn' : 'error')
      return null
    }

    const data = res.data || {}
    persistMaintenanceCheckedAt(lastCheckKey, data, shouldPersistCheckedAt)
    logMaintenanceCheck('api_result', { apiName, workName, manual, status: res.status, checkedAt: data.checked_at || 0, count: data.count ?? data.issues?.length ?? data.updates?.length ?? 0 })
    return data
  }

  // 工具环境可能涉及外部下载，因此只做检查本身静默；发现问题后统一进入提示队列交给用户决定。
  const checkToolMaintenance = async ({ manual = true, prompt = true, overrides = null } = {}) => {
    const data = await fetchMaintenanceData({
      apiName: 'maintenance_check_tools',
      workName: t('maintenance.checkToolEnvironment'),
      manual,
      lastCheckKey: 'last_tool_check_time',
      overrides,
    })
    if (!data) return null

    const issues = Array.isArray(data.issues) ? data.issues : []
    if (!prompt) return data
    if (issues.length === 0) {
      if (manual) toast.success(t('maintenance.toolsReady'))
      return data
    }

    const promptQueue = usePromptQueueStore()
    await promptQueue.enqueue({
      category: 'startup-tools',
      title: t('maintenance.toolsNeedActionTitle'),
      message: t('maintenance.toolsNeedActionMessage'),
      type: 'warning',
      priority: manual ? 30 : 60,
      items: issues.map(item => ({
        id: item.tool_id || item.name,
        title: item.name || item.tool_id || t('maintenance.tool'),
        description: item.message || t('maintenance.needsAction'),
        meta: [
          item.resolved_path,
          item.current_version ? t('maintenance.currentVersion', { version: item.current_version }) : '',
          item.latest_version ? t('maintenance.latestVersion', { version: item.latest_version }) : '',
        ].filter(Boolean),
        raw: item,
        actions: [
          { id: 'install', label: getToolIssueActionLabel(item), kind: 'primary' },
          { id: 'skip', label: t('maintenance.later'), kind: 'secondary' },
        ],
      })),
      bulkActions: [
        { id: 'install_all', label: t('maintenance.handleAll'), kind: 'primary' },
        { id: 'skip_all', label: t('maintenance.laterAll'), kind: 'secondary' },
      ],
      onItemAction: async (item, actionId) => {
        if (actionId === 'install') await installToolIssues([item])
      },
      onBulkAction: async (actionId, items) => {
        if (actionId === 'install_all') await installToolIssues(items)
      },
    })
    return data
  }

  // 外部库更新属于网络下载动作：启动期可以静默检查，但实际更新必须经由队列弹窗确认。
  const checkExternalDataUpdates = async ({ manual = true, prompt = true, overrides = null } = {}) => {
    const data = await fetchMaintenanceData({
      apiName: 'maintenance_check_external_data',
      workName: t('maintenance.checkExternalDataUpdates'),
      manual,
      lastCheckKey: 'last_external_data_update_check_time',
      overrides,
      // 整轮远端状态都没拿到时，不要把失败记录成一次成功检查。
      shouldPersistCheckedAt: (payload) => {
        const items = Array.isArray(payload?.items) ? payload.items : []
        const failed = Array.isArray(payload?.failed) ? payload.failed : []
        return items.length === 0 || failed.length < items.length
      },
    })
    if (!data) return null

    const updates = Array.isArray(data.updates) ? data.updates : []
    const failed = Array.isArray(data.failed) ? data.failed : []
    if (!prompt) return data
    if (failed.length > 0 && updates.length === 0) {
      const summary = failed.slice(0, 3).map(item => item.name || item.data_type || t('maintenance.externalData')).join(t('maintenance.listSeparator'))
      const remain = failed.length > 3 ? t('maintenance.remainingItems', { count: failed.length }) : ''
      toast.warning(t('maintenance.externalDataCheckFailed', { summary, remain }), { timeout: 4500 })
      return data
    }
    if (updates.length === 0) {
      if (manual) toast.success(t('maintenance.externalDataLatest'))
      return data
    }

    const promptQueue = usePromptQueueStore()
    await promptQueue.enqueue({
      category: 'startup-external-data',
      title: t('maintenance.externalDataUpdatesTitle'),
      message: failed.length > 0
        ? t('maintenance.externalDataPartialFailed', { count: failed.length })
        : t('maintenance.externalDataUpdatesMessage'),
      type: 'warning',
      priority: manual ? 35 : 65,
      items: updates.map(item => ({
        id: item.data_type || item.name,
        title: item.name || item.data_type || t('maintenance.externalData'),
        description: item.message || t('maintenance.remoteVersionDiffers'),
        meta: [
          item.local_version ? t('maintenance.localVersion', { version: item.local_version }) : t('maintenance.localTime', { time: formatDateTime(item.local_mtime) }),
          item.remote_version ? t('maintenance.remoteSignature', { version: item.remote_version }) : t('maintenance.remoteTime', { time: formatDateTime(item.remote_updated_at) }),
        ],
        raw: item,
        actions: [
          { id: 'update', label: t('maintenance.update'), kind: 'primary' },
          { id: 'skip', label: t('maintenance.later'), kind: 'secondary' },
        ],
      })),
      bulkActions: [
        { id: 'update_all', label: t('maintenance.updateAll'), kind: 'primary' },
        { id: 'skip_all', label: t('maintenance.laterAll'), kind: 'secondary' },
      ],
      onItemAction: async (item, actionId) => {
        if (actionId === 'update') await updateExternalDB(item.data_type)
      },
      onBulkAction: async (actionId, items) => {
        if (actionId !== 'update_all') return
        for (const item of items) {
          // 顺序执行，避免同时刷新同一批缓存时互相打断。
          await updateExternalDB(item.data_type)
        }
      },
    })
    return data
  }

  // 管理器负责的模组更新包含 SteamCMD 工坊模组和 Git 仓库订阅模组，统一弹窗避免多来源重复打扰。
  const checkManagedModUpdates = async ({ manual = true, prompt = true } = {}) => {
    const data = await fetchMaintenanceData({
      apiName: 'maintenance_check_managed_mod_updates',
      workName: t('maintenance.checkManagedModUpdates'),
      manual,
      lastCheckKey: 'last_steamcmd_mod_update_check_time',
    })
    if (!data) return null

    const updates = Array.isArray(data.updates) ? data.updates : []
    if (!prompt) return data
    if (updates.length === 0) {
      if (manual) toast.success(t('maintenance.managedModsLatest'))
      return data
    }

    const promptQueue = usePromptQueueStore()
    await promptQueue.enqueue({
      category: 'startup-managed-mods',
      title: t('maintenance.managedModUpdatesTitle'),
      message: t('maintenance.managedModUpdatesMessage', { count: updates.length }),
      type: 'warning',
      priority: manual ? 40 : 70,
      items: updates.map(item => ({
        id: `${item.source || 'mod'}:${item.workshop_id || item.repo_url || item.title}`,
        title: item.title || item.workshop_id || t('maintenance.unknownMod'),
        description: item.message || (item.workshop_id ? `Workshop ID: ${item.workshop_id}` : item.repo_url || ''),
        meta: [
          item.source_label || item.source,
          item.installed_version ? t('maintenance.currentVersion', { version: item.installed_version }) : '',
          item.latest_version ? t('maintenance.latestVersion', { version: item.latest_version }) : '',
        ].filter(Boolean),
        raw: item,
        actions: [
          { id: 'update', label: t('maintenance.update'), kind: 'primary' },
          { id: 'skip', label: t('maintenance.later'), kind: 'secondary' },
        ],
      })),
      bulkActions: [
        { id: 'update_all', label: t('maintenance.updateAll'), kind: 'primary' },
        { id: 'skip_all', label: t('maintenance.laterAll'), kind: 'secondary' },
      ],
      onItemAction: async (item, actionId) => {
        if (actionId === 'update') await updateManagedModItems([item])
      },
      onBulkAction: async (actionId, items) => {
        if (actionId === 'update_all') await updateManagedModItems(items)
      },
    })
    return data
  }
  const checkSteamcmdModUpdates = checkManagedModUpdates

  // 启动后的维护检查只做轻量描述表，不引入任务引擎；以后新增检查时只追加一项配置。
  const getScheduledMaintenanceChecks = () => [
    {
      id: 'tools',
      name: t('maintenance.externalTools'),
      enabled: settings.value.enable_auto_tool_check,
      lastCheckTime: settings.value.last_tool_check_time,
      intervalDays: settings.value.tool_check_interval_days,
      fallbackDays: 3,
      run: () => checkToolMaintenance({ manual: false, prompt: true }),
    },
    {
      id: 'external-data',
      name: t('maintenance.externalData'),
      enabled: settings.value.enable_auto_external_data_update_check,
      lastCheckTime: settings.value.last_external_data_update_check_time,
      intervalDays: settings.value.external_data_update_check_interval_days,
      fallbackDays: 1,
      run: () => checkExternalDataUpdates({ manual: false, prompt: true }),
    },
    {
      id: 'managed-mods',
      name: t('maintenance.managedModUpdates'),
      enabled: settings.value.enable_auto_steamcmd_mod_update_check,
      lastCheckTime: settings.value.last_steamcmd_mod_update_check_time,
      intervalDays: settings.value.steamcmd_mod_update_check_interval_days,
      fallbackDays: 1,
      run: () => checkManagedModUpdates({ manual: false, prompt: true }),
    },
  ]

  const runScheduledMaintenanceChecks = async () => {
    for (const check of getScheduledMaintenanceChecks()) {
      const decision = buildTimedCheckDecision(check)
      logMaintenanceCheck('schedule_decision', { id: check.id, name: check.name, ...decision })
      if (!decision.due) continue
      try {
        logMaintenanceCheck('schedule_run', { id: check.id, name: check.name })
        await check.run()
        logMaintenanceCheck('schedule_done', { id: check.id, name: check.name })
      } catch (error) {
        logMaintenanceCheck('schedule_error', { id: check.id, name: check.name, message: error?.message || String(error || '') }, 'error')
        throw error
      }
    }
  }

  // 兼容旧调用名：手动检查工具环境并按需弹窗。
  const checkSteamTools = async () => checkToolMaintenance({ manual: true, prompt: true })

  // 更新外置数据库
  const updateExternalDB = async (type) => {
    try {
      const workNameMap = {
        community_rules: t('maintenance.updateCommunityRules'),
        workshop_db: t('maintenance.updateWorkshopDb'),
        instead_db: t('maintenance.updateInsteadDb'),
      }
      // 调用 API
      const res = await window.pywebview.api.update_external_db(type)
      if (checkResult(res, workNameMap[type] || t('maintenance.updateExternalDb', { type }))) {
        const task_id = res.data.task_id
        await waitForDownload(task_id)
        // 重新获取数据
        const historyLabel = t('maintenance.syncModDataAfter', { action: workNameMap[type] || t('maintenance.externalDbUpdate') })
        if (refreshModsData) await refreshModsData(historyLabel)
        else await refreshData(false, historyLabel)
        return true
      }
      return false
    } catch (error) {
      toast.error(t('maintenance.updateCommunityDbFailed', { message: error.message }))
      return false
    }
  }

  return {
    // 日志与调度
    isTimedCheckDue, logMaintenanceCheck, runScheduledMaintenanceChecks,
    // 检查入口
    checkSteamTools, checkToolMaintenance, checkExternalDataUpdates, checkManagedModUpdates, checkSteamcmdModUpdates,
    // 更新动作
    updateExternalDB,
  }
}
