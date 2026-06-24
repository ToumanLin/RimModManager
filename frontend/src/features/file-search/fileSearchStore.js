import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { checkResult, toast } from '../../shared/lib/common'

import { useAppStore } from '../../app/stores/appStore'
import { useTaskStore } from '../../app/stores/taskStore'
import { t } from '../../app/i18n'

const DEFAULT_FILE_TYPES = ['.xml']
const DEFAULT_EXCLUDE_OPTIONS = {
  skip_hidden: true,
  skip_git: true,
  skip_languages: true,
  skip_source: true,
  skip_textures: true,
  skip_binary_like: true,
}

export const FILE_SEARCH_SCOPE_OPTIONS = [
  { value: 'current-effective', labelKey: 'fileSearch.scopeCurrentEffective', descKey: 'fileSearch.scopeCurrentEffectiveDesc' },
  { value: 'current-active', labelKey: 'fileSearch.scopeCurrentActive', descKey: 'fileSearch.scopeCurrentActiveDesc' },
  { value: 'workshop', labelKey: 'fileSearch.scopeWorkshop', descKey: 'fileSearch.scopeWorkshopDesc' },
  { value: 'local', labelKey: 'fileSearch.scopeLocal', descKey: 'fileSearch.scopeLocalDesc' },
  { value: 'self', labelKey: 'fileSearch.scopeSelf', descKey: 'fileSearch.scopeSelfDesc' },
]

export const FILE_SEARCH_EXCLUDE_OPTIONS = [
  { key: 'skip_languages', labelKey: 'fileSearch.excludeLanguages', descKey: 'fileSearch.excludeLanguagesDesc' },
  { key: 'skip_source', labelKey: 'fileSearch.excludeSource', descKey: 'fileSearch.excludeSourceDesc' },
  { key: 'skip_textures', labelKey: 'fileSearch.excludeTextures', descKey: 'fileSearch.excludeTexturesDesc' },
]

export const useFileSearchStore = defineStore('fileSearch', () => {
  const appStore = useAppStore()
  const taskStore = useTaskStore()

  const form = reactive({
    query: '',
    scope: 'current-active',
    effective_only: true,
    use_regex: false,
    case_sensitive: false,
    file_types: [...DEFAULT_FILE_TYPES],
    custom_file_types_text: '',
    exclude_options: { ...DEFAULT_EXCLUDE_OPTIONS },
  })

  const currentTaskId = ref('')
  const isLaunching = ref(false)
  const results = ref([])
  const resultFilter = ref('')
  const fileCache = ref(new Map())
  const activeMatchId = ref('')
  const viewerState = reactive({
    filePath: '',
    modPath: '',
    modName: '',
    fileName: '',
    lineNumber: 0,
    content: '',
    loading: false,
    error: '',
    truncated: false,
    encoding: '',
    fileSize: 0,
  })
  const searchState = reactive({
    status: 'idle',
    message: t('fileSearch.readyToSearch'),
    matchedCount: 0,
    done: false,
  })

  const currentTask = computed(() => (
    currentTaskId.value
      ? taskStore.getTask(currentTaskId.value)
      : taskStore.getLatestTaskByType('file-search')
  ))

  const isRunning = computed(() => ['pending', 'running'].includes(String(currentTask.value?.status || '')))
  const isBusy = computed(() => isLaunching.value || isRunning.value)
  const filteredResults = computed(() => {
    const keyword = String(resultFilter.value || '').trim().toLowerCase()
    if (!keyword) return results.value
    return results.value.filter((row) => {
      return String(row._filter_text || '').includes(keyword)
    })
  })

  const scopeLabel = computed(() => {
    const option = FILE_SEARCH_SCOPE_OPTIONS.find(item => item.value === form.scope)
    return option ? t(option.labelKey) : t('fileSearch.unknownScope')
  })

  const resetResults = () => {
    results.value = []
    resultFilter.value = ''
    activeMatchId.value = ''
    fileCache.value = new Map()
    viewerState.filePath = ''
    viewerState.modPath = ''
    viewerState.modName = ''
    viewerState.fileName = ''
    viewerState.lineNumber = 0
    viewerState.content = ''
    viewerState.loading = false
    viewerState.error = ''
    viewerState.truncated = false
    viewerState.encoding = ''
    viewerState.fileSize = 0
    searchState.status = 'idle'
    searchState.message = t('fileSearch.readyToSearch')
    searchState.matchedCount = 0
    searchState.done = false
  }

  const startSearch = async () => {
    if (!window.pywebview) return false
    if (isBusy.value) return false
    const query = String(form.query || '').trim()
    if (!query) {
      toast.warning(t('fileSearch.enterSearchTerm'))
      return false
    }
    const requestedFileTypes = buildRequestedFileTypes()
    if (!Array.isArray(requestedFileTypes) || requestedFileTypes.length === 0) {
      toast.warning(t('fileSearch.selectFileType'))
      return false
    }

    results.value = []
    searchState.status = 'pending'
    searchState.message = t('fileSearch.searchSubmitted')
    searchState.matchedCount = 0
    searchState.done = false

    isLaunching.value = true
    try {
      const payload = {
        query,
        scope: form.scope,
        effective_only: form.effective_only,
        use_regex: form.use_regex,
        case_sensitive: form.case_sensitive,
        file_types: [...requestedFileTypes],
        exclude_options: { ...form.exclude_options },
      }

      const res = await window.pywebview.api.search_files_start(payload)
      if (!checkResult(res, t('fileSearch.startFileSearch'))) {
        searchState.status = 'failed'
        searchState.message = res?.message || t('fileSearch.startFailed')
        return false
      }

      const taskId = String(res?.data?.task_id || '')
      if (!taskId) {
        searchState.status = 'failed'
        searchState.message = t('fileSearch.noTaskId')
        return false
      }

      currentTaskId.value = taskId
      taskStore.createPlaceholderTask({
        id: taskId,
        type: 'file-search',
        status: 'pending',
        progress: 0,
        message: t('fileSearch.taskQueued'),
        metrics: {
          title: t('fileSearch.title'),
          query,
          scope: form.scope,
          effective_only: form.effective_only,
        },
      })
      return true
    } catch (error) {
      searchState.status = 'failed'
      searchState.message = error?.message || t('fileSearch.startFailed')
      toast.error(searchState.message)
      return false
    } finally {
      isLaunching.value = false
    }
  }

  const cancelSearch = async () => {
    if (!currentTask.value) return false
    return await appStore.cancelTaskByProgress(currentTask.value)
  }

  const handleResultsEvent = (detail = {}) => {
    const taskId = String(detail.task_id || '')
    if (!taskId || taskId !== currentTaskId.value) return

    const incoming = Array.isArray(detail.results) ? detail.results : []
    if (incoming.length > 0) {
      results.value.push(...incoming.map((item, index) => {
        const normalized = {
          ...item,
          _row_id: `${taskId}:${results.value.length + index}:${item.file_path}:${item.line_number}`,
        }
        normalized._filter_text = [
          normalized.mod_name,
          normalized.file_name,
          normalized.file_path,
          normalized.matched_line,
        ].join('\n').toLowerCase()
        return normalized
      }))
      if (!activeMatchId.value) {
        selectMatch(results.value[0])
      }
    }

    searchState.status = String(detail.status || searchState.status || 'running')
    searchState.message = String(detail.message || searchState.message || '')
    searchState.matchedCount = Number(detail.matched_count || results.value.length)
    searchState.done = !!detail.done
  }

  const openResultFile = async (row) => {
    if (!row?.file_path) return
    await appStore.openFile(row.file_path)
  }

  const openResultFolder = async (row) => {
    if (!row?.file_path) return
    await appStore.openPath(row.file_path)
  }

  const openResultModFolder = async (row) => {
    const targetPath = String(row?.mod_path || '').trim() || String(row?.file_path || '').trim()
    if (!targetPath) return
    await appStore.openPath(targetPath)
  }

  const readResultFile = async (filePath) => {
    const normalizedPath = String(filePath || '').trim()
    if (!normalizedPath) return null
    if (fileCache.value.has(normalizedPath)) {
      return fileCache.value.get(normalizedPath) || null
    }
    const data = await appStore.readTextFile(normalizedPath)
    if (!data) return null
    fileCache.value.set(normalizedPath, data)
    return data
  }

  const showFileInViewer = async (row, options = {}) => {
    if (!row?.file_path) return false
    const lineNumber = Number(options.lineNumber || row.line_number || 1)
    const nextFilePath = String(row.file_path || '')
    const previousFilePath = String(viewerState.filePath || '')
    const isSameFile = previousFilePath && previousFilePath === nextFilePath
    activeMatchId.value = String(options.rowId || row._row_id || '')
    viewerState.filePath = nextFilePath
    viewerState.modPath = row.mod_path || ''
    viewerState.modName = row.mod_name || ''
    viewerState.fileName = row.file_name || ''
    viewerState.lineNumber = lineNumber
    viewerState.error = ''
    if (!isSameFile) {
      viewerState.content = ''
      viewerState.truncated = false
      viewerState.encoding = ''
      viewerState.fileSize = 0
    }

    if (isSameFile && viewerState.content) {
      return true
    }

    viewerState.loading = true
    try {
      const data = await readResultFile(row.file_path)
      if (!data) {
        viewerState.error = t('fileSearch.cannotReadFile')
        viewerState.content = ''
        return false
      }
      viewerState.content = String(data.content || '')
      viewerState.truncated = !!data.truncated
      viewerState.encoding = String(data.encoding || '')
      viewerState.fileSize = Number(data.file_size || 0)
      return true
    } finally {
      viewerState.loading = false
    }
  }

  const selectMatch = async (row) => {
    if (!row) return false
    return await showFileInViewer(row, {
      lineNumber: row.line_number,
      rowId: row._row_id,
    })
  }

  const openWorkbench = () => {
    appStore.uiState.showFileSearchWorkbench = true
  }

  const closeWorkbench = () => {
    appStore.uiState.showFileSearchWorkbench = false
  }

  const toggleFileType = (ext) => {
    const normalized = String(ext || '').trim().toLowerCase()
    if (!normalized) return
    const current = new Set(form.file_types)
    if (current.has(normalized)) {
      current.delete(normalized)
    } else {
      current.add(normalized)
    }
    form.file_types = DEFAULT_FILE_TYPES.filter(item => current.has(item))
  }

  const setCustomFileTypesText = (value) => {
    form.custom_file_types_text = String(value || '')
  }

  function parseCustomFileTypes(text) {
    const rawText = String(text || '').trim()
    if (!rawText) return []
    const tokens = rawText
      .split(/[\s,，;；|]+/)
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean)

    const result = []
    const seen = new Set()
    for (const token of tokens) {
      if (['.', '*', '*.*'].includes(token)) {
        return ['.']
      }
      let normalized = token
      if (normalized.startsWith('*')) normalized = normalized.replace(/^\*+/, '')
      if (!normalized.startsWith('.')) normalized = `.${normalized}`
      if (seen.has(normalized)) continue
      seen.add(normalized)
      result.push(normalized)
    }
    return result
  }

  function buildRequestedFileTypes() {
    const selected = new Set(form.file_types)
    const customTypes = parseCustomFileTypes(form.custom_file_types_text)
    if (customTypes.includes('.')) {
      return ['.']
    }
    for (const ext of customTypes) {
      selected.add(ext)
    }
    return [...DEFAULT_FILE_TYPES.filter(item => selected.has(item))]
      .concat([...selected].filter(item => !DEFAULT_FILE_TYPES.includes(item)).sort())
  }

  const setExcludeOption = (key, value) => {
    const normalized = String(key || '').trim()
    if (!normalized) return
    form.exclude_options = {
      ...form.exclude_options,
      [normalized]: !!value,
    }
  }

  return {
    // 表单与任务状态
    form, currentTaskId, currentTask, isLaunching, isRunning, isBusy,
    // 搜索结果与查看器
    results, filteredResults, resultFilter, activeMatchId, viewerState, searchState, scopeLabel,
    // 搜索流程
    resetResults, startSearch, cancelSearch, handleResultsEvent,
    // 结果操作
    openResultFile, openResultFolder, openResultModFolder, readResultFile, showFileInViewer, selectMatch,
    // 工作台与筛选项
    openWorkbench, closeWorkbench, toggleFileType, setCustomFileTypesText, setExcludeOption,
  }
})
