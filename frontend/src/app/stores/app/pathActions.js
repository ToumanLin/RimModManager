import { toast, checkResult } from '../../../shared/lib/common'
import { useModStore } from '../../../features/mod/stores/modStore'
import { useConfirmStore } from '../../../shared/components/modal/confirmStore'
import { isBrowserRuntime, openManagedSubBrowserUrl } from '../../bridge/runtimeBridge'
import { t } from '../../i18n'

export const usePathActions = ({ settings } = {}) => {
  // 自动检测路径
  const autoDetectPaths = async (updateStore = false) => {
    if(!window.pywebview) return
    const res = await window.pywebview.api.auto_detect_paths(false)
    if (checkResult(res, t('pathActions.autoDetectPaths'), true) && res.data.paths) {
       // 更新本地 setting store
      if(updateStore) {
        Object.assign(settings.value, res.data.paths)
        toast.success(t('pathActions.pathsUpdated'))
      }
      return res.data.paths
    }
  }

  const getDefaultExternalPaths = async () => {
    if(!window.pywebview) return
    const res = await window.pywebview.api.get_default_external_paths()
    if (checkResult(res, t('pathActions.getDefaultExternalPaths'),true) && res.data.paths) {
      return res.data.paths
    }
  }

  // 检测路径信息
  const checkPath = async (path_type, path) => {
    if(!path_type || !path) return
    if(!window.pywebview) return
    const res = await window.pywebview.api.path_check(path_type, path)
    if (checkResult(res, t('pathActions.checkPathInfo'))) {
      return res.data
    }
  }

  // 检测路径信息
  const checkPaths = async (path_data) => {
    if(!path_data) return
    if(!window.pywebview) return
    const res = await window.pywebview.api.paths_check(path_data)
    if (checkResult(res, t('pathActions.checkPathsInfo'))) {
      return res.data
    }
  }

  // 打开路径
  const openPath = async (path) => {
    if(!window.pywebview) return
    if(!path) return
    console.log("打开路径:", path)
    const res = await window.pywebview.api.path_open(path)
    checkResult(res, t('pathActions.openPath'))
  }

  const openFile = async (path) => {
    if (!window.pywebview) return
    if (!path) return
    const res = await window.pywebview.api.path_open_file(path)
    checkResult(res, t('pathActions.openFile'))
  }

  const readTextFile = async (path, maxBytes = 2 * 1024 * 1024) => {
    if (!window.pywebview) return null
    if (!path) return null
    const res = await window.pywebview.api.path_read_text_file(path, maxBytes)
    if (checkResult(res, t('pathActions.readTextFile'), false)) {
      return res.data
    }
    return null
  }

  // 获取文件路径
  const getFilePath = async (home_path, file_types=('XML Files (*.xml;*.rws)', 'All Files (*.*)')) => {
    if(!window.pywebview) return
    // 调用后端 API
    const res = await window.pywebview.api.file_select_dialog(home_path, file_types)
    if (checkResult(res, t('pathActions.getFilePath'))) {
      return res.data
    } else return
  }

  // 获取文件夹路径
  const getFolderPath = async (home_path) => {
    if(!window.pywebview) return
    if(!home_path) home_path=''
    // 调用后端 API
    const res = await window.pywebview.api.folder_select_dialog(home_path)
    if (checkResult(res, t('pathActions.getFolderPath'))) {
        return res.data
    } else if (res.status === 'error') {
        console.error("获取文件夹路径异常:", res.message)
    }
  }

  // 删除文件/文件夹
  const deletePath = async (path, reScan=true) => {
    if(!window.pywebview) return
    const confirmStore = useConfirmStore()
    const decision = await confirmStore.confirmDeleteAction(
      t('pathActions.deleteConfirmTitle'), t('pathActions.deleteConfirmMessage', { path }),
      {
        trashOptionText: t('pathActions.moveToTrash'),
        forceOptionText: t('pathActions.forceDelete'),
      }
    );
    if(!decision?.confirmed) return
    const res = await window.pywebview.api.path_delete(path, !!decision.force)
    if (checkResult(res, t('pathActions.deletePath'))) {
      toast.success(t(decision.force ? 'pathActions.forceDeletedPath' : 'pathActions.movedToTrashPath', { path }))
      if(reScan){
        // 刷新Mod列表
        const modStore = useModStore()
        modStore.scanMods()
      }
      return true
    }
  }

  // 批量删除文件/文件夹
  const deletePaths = async (paths, options = {}) => {
    if(!window.pywebview) return
    const targetPaths = Array.isArray(paths) ? paths.filter(Boolean) : []
    if (!targetPaths.length) return false
    const {
      title = t('pathActions.deleteConfirmTitle'),
      message = t('pathActions.deleteManyConfirmMessage', { count: targetPaths.length }),
      trashOptionText = t('pathActions.moveToTrash'),
      forceOptionText = t('pathActions.forceDelete'),
      checkLabel = t('pathActions.deletePaths'),
      successMessage,
      reScan = true,
      allowWarning = false,
    } = options || {}
    const confirmStore = useConfirmStore()
    const decision = await confirmStore.confirmDeleteAction(
      title,
      message,
      { trashOptionText, forceOptionText }
    );
    if(!decision?.confirmed) return
    const res = await window.pywebview.api.paths_delete(targetPaths, !!decision.force)
    if (res?.status !== 'success' && !(allowWarning && res?.status === 'warning')) {
      checkResult(res, checkLabel)
      return false
    }
    if (res?.status === 'warning') {
      toast.warning(res?.message || t('pathActions.deletePathsPartialConfirm', { label: checkLabel }))
    } else {
      const messageText = typeof successMessage === 'function'
        ? successMessage({ paths: targetPaths, force: !!decision.force, res })
        : successMessage
      toast.success(messageText || t(decision.force ? 'pathActions.forceDeletedMany' : 'pathActions.movedToTrashMany', { count: targetPaths.length }))
    }
    if (reScan) {
      // 刷新Mod列表
      const modStore = useModStore()
      modStore.scanMods()
    }
    return true
  }

  // 打开Url
  const openUrl = (url) => {
    if(!url) { toast.warning(t('pathActions.emptyUrl')); return}
    if (isBrowserRuntime()) {
      openManagedSubBrowserUrl(url, 'RimModManager')
      return
    }
    if(settings.value.open_url_on_system){
      window.open(url, '_blank')
    }else{
      if (!window.pywebview) return
      window.pywebview.api.open_sub_browser(url)
    }
  }

  return {
    // 路径检测
    autoDetectPaths, getDefaultExternalPaths, checkPath, checkPaths,
    // 打开与选择
    openPath, openFile, readTextFile, getFilePath, getFolderPath, openUrl,
    // 删除
    deletePath, deletePaths,
  }
}
