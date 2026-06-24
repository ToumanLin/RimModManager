import { toast, checkResult } from '../../../shared/lib/common'
import { useWorkspaceStore } from '../../../features/workspace/workspaceStore'
import { normalizeInstallSource, normalizeInstallSources } from '../../../features/mod/lib/modIdentity'
import { useConfirmStore } from '../../../shared/components/modal/confirmStore'
import { useTaskStore } from '../taskStore'
import { t } from '../../i18n'

export const useSteamWorkshopActions = ({
  openUrl,
} = {}) => {
  const showSteamNotReadyHint = (res) => {
    const statusHint = res?.data?.steam_status?.user_hint
    if (res?.data?.action === 'steam_not_ready' && statusHint?.message) {
      toast.warning(`${statusHint.title || t('steamWorkshop.steamNotReady')}\n${statusHint.message}`, { timeout: 6000 })
    }
  }

  // 下载创意工坊项目
  const downloadWorkshopItems = async (workshop_ids) => {
    if (!window.pywebview) return
    const res = await window.pywebview.api.steamcmd_download(workshop_ids)
    if (checkResult(res, t('steamWorkshop.downloadWorkshopItems'))) {
      toast.success(t('steamWorkshop.downloadStarted', { count: workshop_ids.length }))
    }
  }

  // 打开Steam创意工坊
  const openSteamWorkshopUrl = (url) => {
    if(url) {
      const steamUrl = url.replace('https://steamcommunity.com/sharedfiles/filedetails/?id=', 'steam://url/CommunityFilePage/')
      window.open(steamUrl, '_blank')
    }
  }

  const openSteamWorkshopById = (id, openInSteam = true) => {
    if(id) {
      const steamUrl = openInSteam ? `steam://url/CommunityFilePage/${id}` : `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`
      window.open(steamUrl, '_blank')
    }
  }

  const openInstallSource = (source) => {
    const normalizedSource = normalizeInstallSource(source, source?.packageId || source?.package_id)
    if (!normalizedSource) return false
    if (normalizedSource.kind === 'workshop') {
      openSteamWorkshopById(normalizedSource.workshopId)
      return true
    }
    openUrl(normalizedSource.url)
    return true
  }

  const subscribeInstallSources = async (sources = []) => {
    const normalizedSources = normalizeInstallSources(sources)
    const workshopIds = [...new Set(
      normalizedSources
        .filter(source => source.kind === 'workshop')
        .map(source => source.workshopId)
        .filter(Boolean)
    )]
    const skippedUrlCount = normalizedSources.filter(source => source.kind === 'url').length
    if (workshopIds.length === 0) {
      if (skippedUrlCount > 0) {
        toast.info(t('steamWorkshop.urlSubscribeUnsupported'))
      }
      return false
    }
    const success = await subscribeWorkshopIds(workshopIds)
    if (success && skippedUrlCount > 0) {
      toast.info(t('steamWorkshop.skippedUrlSubscriptions', { count: skippedUrlCount }))
    }
    return success
  }

  const downloadInstallSources = async (sources = []) => {
    const normalizedSources = normalizeInstallSources(sources)
    const workshopIds = [...new Set(
      normalizedSources
        .filter(source => source.kind === 'workshop')
        .map(source => source.workshopId)
        .filter(Boolean)
    )]
    const urlSources = normalizedSources.filter(source => source.kind === 'url' && source.url)
    if (workshopIds.length === 0 && urlSources.length === 0) return false
    if (workshopIds.length > 0) {
      await downloadWorkshopItems(workshopIds)
    }
    if (urlSources.length > 0) {
      urlSources.forEach(source => openUrl(source.url))
      toast.info(t('steamWorkshop.openedExternalSources', { count: urlSources.length }))
    }
    return true
  }

  const resolveWorkshopIdsFromPackageIds = async (packageIds) => {
    if (!packageIds) return []
    const workshopStore = useWorkspaceStore()
    return await workshopStore.resolvePackageIdsToWorkshopIds(packageIds)
  }

  // 根据包名下载Mod
  const downloadPackageIds = async (packageIds) => {
    const workshopIds = await resolveWorkshopIdsFromPackageIds(packageIds)
    if (workshopIds.length === 0) return false
    // 调用下载函数
    await downloadWorkshopItems(workshopIds)
    return true
  }

  // 根据包名订阅Mod
  const subscribePackageIds = async (packageIds) => {
    const workshopIds = await resolveWorkshopIdsFromPackageIds(packageIds)
    if (workshopIds.length === 0) return false
    // 调用订阅函数
    await subscribeWorkshopIds(workshopIds)
    return true
  }

  // 订阅模组
  const subscribeWorkshopIds = async (workshop_ids) => {
    if (!window.pywebview) return
    if (!workshop_ids || workshop_ids.length === 0) return
    const res = await window.pywebview.api.steam_subscribe(workshop_ids)
    if (res?.status === 'success') {
      toast.info(t('steamWorkshop.subscribeRequestSent', { count: workshop_ids.length }), { timeout: 2500 })
      return true
    }
    if (res?.status === 'warning') {
      showSteamNotReadyHint(res)
      return false
    }
    toast.error(t('steamWorkshop.subscribeFailed', { message: res?.message || t('common.unknown') }))
    return false
  }

  // 取消订阅模组
  const unsubscribeWorkshopIds = async (workshop_ids, deletePathHashes = null, deleteOptions = {}) => {
    if (!window.pywebview) return false
    if (!workshop_ids || workshop_ids.length === 0) return
    const options = deleteOptions || {}
    const normalizedDeleteHashes = Array.isArray(deletePathHashes)
      ? deletePathHashes.filter(Boolean)
      : []
    const shouldDeleteFiles = normalizedDeleteHashes.length > 0 && options.deleteFiles !== false
    const shouldCleanupRecordsOnly = normalizedDeleteHashes.length > 0 && options.deleteFiles === false
    // 纯取消订阅必须等 Steam 完成处理；主动删除文件的流程由本函数后续删除步骤负责。
    const shouldWaitForSteamTask = options.waitForTask !== false && !shouldDeleteFiles
    if (!options.skipConfirm) {
      const confirmStore = useConfirmStore()
      const message = shouldDeleteFiles
        ? t('steamWorkshop.unsubscribeAndDeleteMessage', { count: workshop_ids.length })
        : t('steamWorkshop.unsubscribeMessage', { count: workshop_ids.length })
      const ok = await confirmStore.confirmAction(t('steamWorkshop.unsubscribeTitle'), message, {
        type: shouldDeleteFiles ? 'error' : 'warning',
        confirmText: t('steamWorkshop.confirmUnsubscribe'),
      })
      if (!ok) return false
    }
    toast.info(t('steamWorkshop.connectingSteam'), { timeout: 2500 })
    const res = await window.pywebview.api.steam_unsubscribe(workshop_ids)
    if (res?.status === 'success') {
      const taskId = String(res?.data?.task_id || '')
      let task = null
      toast.info(
        shouldDeleteFiles
          ? t('steamWorkshop.unsubscribeSubmittedDeleting')
          : t('steamWorkshop.unsubscribeSubmittedWaiting'),
        { timeout: 3500 }
      )
      if (shouldWaitForSteamTask && taskId) {
        try {
          task = await useTaskStore().waitForTaskCompletion(taskId)
        } catch (e) {
          toast.error(t('steamWorkshop.unsubscribeIncomplete', { message: e.message }))
          return false
        }
        toast.success(t('steamWorkshop.unsubscribeSucceeded'), { timeout: 2500 })
      }
      if (shouldDeleteFiles || shouldCleanupRecordsOnly) {
        const deleteRes = await window.pywebview.api.mods_delete(normalizedDeleteHashes, !!options.force, shouldDeleteFiles)
        if (deleteRes?.status !== 'success') {
          const actionName = shouldDeleteFiles ? t('steamWorkshop.localFileDelete') : t('steamWorkshop.inventoryRecordCleanup')
          toast.error(t('steamWorkshop.unsubscribeSubmittedButActionFailed', { action: actionName, message: deleteRes?.message || t('common.unknown') }))
          return false
        }
        toast.info(
          shouldDeleteFiles
            ? t('steamWorkshop.unsubscribeAndDeletedFiles', { count: deleteRes.data?.success_count || normalizedDeleteHashes.length })
            : t('steamWorkshop.unsubscribeAndCleanedRecords', { count: deleteRes.data?.success_count || normalizedDeleteHashes.length }),
          { timeout: 2500 }
        )
        return { success: true, taskId, task }
      }
      return { success: true, taskId, task }
    }
    if (res?.status === 'warning') {
      showSteamNotReadyHint(res)
      return false
    }
    toast.error(t('steamWorkshop.unsubscribeFailed', { message: res?.message || t('common.unknown') }))
    return false
  }

  // 获取订阅合集列表
  const getCollectionItems = async (collection_id) => {
    if (!window.pywebview) return
    const res = await window.pywebview.api.steam_collection_items_get(collection_id)
    if (checkResult(res, t('steamWorkshop.getCollectionItems', { id: collection_id }))) {
      return res.data
    }
  }

  return {
    // 工坊打开
    openSteamWorkshopUrl, openSteamWorkshopById, openInstallSource,
    // 订阅与下载
    downloadWorkshopItems, subscribeInstallSources, downloadInstallSources,
    downloadPackageIds, subscribePackageIds, subscribeWorkshopIds, unsubscribeWorkshopIds,
    // 合集
    getCollectionItems,
  }
}
