import { toast, checkResult } from '../../../shared/lib/common'
import { useConfirmStore } from '../../../shared/components/modal/confirmStore'
import { usePromptQueueStore } from '../../../features/ai/promptQueueStore'
import { t } from '../../i18n'

export const useUpdateActions = ({
  updateState,
  upgradeContext,
  isLoading,
  uiState,
  logMaintenanceCheck,
} = {}) => {
  // 检查更新
  const checkUpdate = async (manual = true) => {
    updateState.isChecking = true
    logMaintenanceCheck('api_start', { id: 'app-update', name: t('appUpdate.name'), manual })
    try {
      const res = await window.pywebview.api.update_check(manual)
      if (checkResult(res, t('appUpdate.checkUpdate'))) {
        const info = res.data
        logMaintenanceCheck('api_result', { id: 'app-update', name: t('appUpdate.name'), manual, status: res.status, hasUpdate: !!info?.has_update, version: info?.version || '', localStatus: info?.local_status || '' })
        if (info.has_update) {
          updateState.hasUpdate = true
          updateState.info = info
          const promptQueue = usePromptQueueStore()
          await promptQueue.enqueue({
            category: 'startup-app-update',
            title: t('appUpdate.newVersionTitle', { version: info.version }),
            message: t('appUpdate.newVersionMessage', { source: info.source_name || t('common.unknown'), size: info.file_size || t('common.unknown') }),
            type: 'success',
            priority: manual ? 20 : 50,
            items: [{
              id: info.version || 'app-update',
              title: `RimModManager v${info.version}`,
              description: info.changelog || t('appUpdate.updateAvailable'),
              raw: info,
              actions: [
                { id: 'update', label: t('appUpdate.updateNow'), kind: 'primary' },
                { id: manual ? 'skip' : 'ignore', label: manual ? t('appUpdate.later') : t('appUpdate.ignoreVersion'), kind: 'secondary' },
              ],
            }],
            bulkActions: [
              { id: 'update_all', label: t('appUpdate.updateNow'), kind: 'primary' },
              { id: manual ? 'skip_all' : 'ignore_all', label: manual ? t('appUpdate.later') : t('appUpdate.ignoreVersion'), kind: 'secondary' },
            ],
            onItemAction: async (_item, actionId) => {
              if (actionId === 'update') {
                await _performUpdateAction()
              } else if (actionId === 'ignore' && !manual) {
                await window.pywebview.api.update_ignore_version(info.version)
              }
            },
            onBulkAction: async (actionId) => {
              if (actionId === 'update_all') {
                await _performUpdateAction()
              } else if (actionId === 'ignore_all' && !manual) {
                await window.pywebview.api.update_ignore_version(info.version)
              }
            },
          })
        } else if (manual) {
          toast.success(t('appUpdate.alreadyLatest'))
        }
      } else {
        logMaintenanceCheck('api_result', { id: 'app-update', name: t('appUpdate.name'), manual, status: res?.status || 'error', message: res?.message || '' }, 'warn')
      }
    } catch (error) {
      logMaintenanceCheck('api_error', { id: 'app-update', name: t('appUpdate.name'), manual, message: error?.message || String(error || '') }, 'error')
      throw error
    } finally {
      updateState.isChecking = false
    }
  }

  const showChangelog = async () => {
    // 1. 如果当前没有日志数据（比如是从设置面板点进来的），主动从后端拉取
    if (!upgradeContext.value.changelog || upgradeContext.value.changelog.length === 0) {
      isLoading.value = true // 开启加载动画
      try {
        const res = await window.pywebview.api.get_changelog()
        if (res.status === 'success') {
          upgradeContext.value.changelog = res.data
        }
      } catch (e) {
          console.error(t('appUpdate.changelogFetchFailed'), e)
      } finally {
          isLoading.value = false
      }
    }
    // 2. 显示弹窗
    uiState.showUpdateModal = true
  }

  const _showInstallPrompt = async (data) => {
    const confirmStore = useConfirmStore()
    const ok = await confirmStore.confirmAction(
      t('appUpdate.confirmInstallTitle'),
      t('appUpdate.confirmInstallMessage', { path: data.path }),
      { confirmText: t('appUpdate.confirmInstall'), cancelText: t('common.cancel'), type: 'warning' }
    )
    if (!ok) return toast.info(t('appUpdate.installCancelled'))
    await _performUpdateAction()
  }

  // 触发操作 (下载 OR 安装)
  const _performUpdateAction = async () => {
    const info = updateState.info
    if (!info) return
    // 如果是 Ready 状态，弹出最后确认框 (因为会重启)
    if (info.local_status === 'ready') {
      const confirmStore = useConfirmStore()
      const ok = await confirmStore.confirmAction(
        t('appUpdate.readyRestartTitle'),
        t('appUpdate.readyRestartMessage'),
        { confirmText: t('appUpdate.restartInstallNow'), type: 'warning' }
      )
      if (!ok) return
    }

    // 调用统一接口
    const res = await window.pywebview.api.update_trigger_action()
    if (checkResult(res, t('appUpdate.startDownloadPackage'))) {
      // 如果后端开始下载，这里不需要做什么，因为 EventListener 会接管进度条
      if (res.data && res.data.status === 'downloading') {
        toast.info(t('appUpdate.downloadingPackage'))
      }
    } else {
      toast.error(res.message)
    }
  }

  return {
    // 更新检查与展示
    checkUpdate, showChangelog,
    // 下载完成安装提示
    _showInstallPrompt,
  }
}
