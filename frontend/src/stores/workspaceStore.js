// frontend/src/stores/workspaceStore.js
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useAppStore } from './appStore'
import { checkResult } from '../utils/tools'
import { createToastInterface } from 'vue-toastification'

export const useWorkspaceStore = defineStore('workspace', () => {
  const appStore = useAppStore()
  const toast = createToastInterface()
  
  // 1. 三个库的数据
  const librariesMods = reactive({
    local: [],
    workshop: [],
    self: []
  })
  const isFetching = ref(false)

  // 2. 缓存工坊数据库搜索状态
  const nexusSearch = reactive({
    query: '',
    page: 1,
    results: [],
    total: 0,
    isLoading: false,
    selectedId: null,
    detailData: null,
    isDetailLoading: false
  })

  // 3. 时间线抽屉状态
  const timeline = reactive({
    isOpen: false,
    modId: null, // workshop_id
    modName: '',
    logs: [],
    isLoading: false
  })

  // GitHub 订阅状态
  const github = reactive({
    subscribedRepos: [],
    isLoading: false,
    activeRepo: null,     // 当前查看的 repo
    repoTimelines: [],    // 当前选中仓库的日志
    previewInfo: null,    // 解析新链接时的预览信息
  })

  const librariesSize = computed(() => {
    const results ={
      workshop: 0,
      self: 0,
      local: 0,
      total: 0,
    }
    results.workshop = librariesMods.workshop.length > 0 ? librariesMods.workshop.reduce((acc, mod) => acc + mod.file_size, 0) : 0
    results.self = librariesMods.self.length > 0 ? librariesMods.self.reduce((acc, mod) => acc + mod.file_size, 0) : 0
    results.local = librariesMods.local.length > 0 ? librariesMods.local.reduce((acc, mod) => acc + mod.file_size, 0) : 0
    results.total = results.workshop + results.self + results.local
    return results
  })

  // --- Actions ---
  // 初始化数据
  const initData = async () => {
    console.log("初始化 外置 数据...")
    await fetchLibrariesMods()
    await fetchGithubRepos()
    setupListeners()
  }

  // 监听后端推送
  const setupListeners = () => {
    window.addEventListener('workspace-online-update', (e) => {
      const onlineMap = e.detail // { "123": { title, time_updated, ... } }
      console.log("收到批量在线状态更新", onlineMap)
      
      // 在 workshop 和 self 列表中寻找匹配的 Mod 并更新
      const updateList = (list) => {
        list.forEach(mod => {
          const wid = String(mod.workshop_id)
          if (onlineMap[wid]) {
            const info = onlineMap[wid]
            mod.online_info = info
            
            // 实时计算更新标记
            const localTime = mod.steam_status?.time_downloaded || 
                              mod.steam_status?.installed_version_time || 0
            mod.has_update = info.time_updated > (localTime + 3600 * 1000)
          }
        })
      }
      updateList(librariesMods.workshop)
      updateList(librariesMods.self)
    })
  }
  
  // 拉取无遮蔽的三个库全量数据
  const fetchLibrariesMods = async () => {
    if (!window.pywebview) return
    isFetching.value = true
    try {
      const res = await window.pywebview.api.workspace_get_all_domains()
      if (checkResult(res, '获取三个库全量数据')) {
        librariesMods.local = res.data.local
        librariesMods.workshop = res.data.workshop
        librariesMods.self = res.data.self
        
        const needRefresh = res.data.need_refresh || []
        if (needRefresh && needRefresh.length > 0) {
          window.pywebview.api.workspace_trigger_online_refresh(needRefresh)
          // 立即启动异步在线更新检查
          // const allWids = [
          //   ...librariesMods.workshop.map(m => m.workshop_id),
          //   ...librariesMods.self.map(m => m.workshop_id)
          // ].filter(id => id && id !== 'None')
          // if (allWids.length > 0) {
          //   window.pywebview.api.workspace_trigger_online_refresh(allWids)
          // }
        }
      }
    } finally {
      isFetching.value = false
    }
  }

  // 搜索缓存工坊数据库
  const doNexusSearch = async (queryStr = nexusSearch.query, page = 1) => {
    if (!window.pywebview || queryStr.length < 2) return
    nexusSearch.isLoading = true
    try {
      nexusSearch.query = queryStr
      nexusSearch.page = page
      const res = await window.pywebview.api.nexus_search(queryStr, page)
      if (checkResult(res, '搜索缓存工坊数据库')) {
        nexusSearch.results = res.data.items
        nexusSearch.total = res.data.total
      }
    } finally {
      nexusSearch.isLoading = false
    }
  }

  // 获取云端详情
  const fetchNexusDetails = async (workshop_id) => {
    if (!window.pywebview) return
    nexusSearch.selectedId = workshop_id
    nexusSearch.isDetailLoading = true
    try {
      const res = await window.pywebview.api.nexus_get_details(workshop_id)
      if (checkResult(res, '获取云端详情')) {
        nexusSearch.detailData = res.data
      }
    } finally {
      nexusSearch.isDetailLoading = false
    }
  }

  // 打开并加载模组变更时间线
  const openTimeline = async (workshopId, modName, is_steamcmd=false) => {
    timeline.isOpen = true
    timeline.workshopId = workshopId
    timeline.modName = modName
    timeline.isLoading = true
    timeline.logs = []
    try {
      const res = await window.pywebview.api.workspace_get_mod_timeline(workshopId, is_steamcmd)
      if (checkResult(res, '获取模组变更时间线')) {
        timeline.logs = res.data
      }
    } finally {
      timeline.isLoading = false
    }
  }

  const openTimelineGithub = async (path) => {
    timeline.isOpen = true
    console.log("打开Github时间线", path, github.subscribedRepos)
    const repo = github.subscribedRepos.find(repo => repo.local_folder === path)
    if (!repo) {
      toast.warning('未找到该订阅')
      return
    }
    timeline.workshopId = repo.repo_url
    timeline.modName = repo.repo_name
    timeline.isLoading = true
    timeline.logs = []
    try {
      const res = await window.pywebview.api.github_get_timeline(url)
      if (checkResult(res, '获取Github模组时间线')) {
        timeline.logs = res.data
      }
    } finally {
      timeline.isLoading = false
    }
  }

  // 拉取 GitHub 订阅列表，拉取所有订阅记录
  const fetchGithubRepos = async () => {
    if (!window.pywebview) return
    github.isLoading = true
    try {
      const res = await window.pywebview.api.github_get_subscribed()
      if (res.status === 'success') {
        github.subscribedRepos = res.data
      }
    } finally {
      github.isLoading = false
    }
  }

  // 加载Github模组时间线
  const fetchGithubTimeline = async (url) => {
    if (!window.pywebview) return
    const res = await window.pywebview.api.github_get_timeline(url)
    if (checkResult(res, '获取Github模组时间线')) {
      github.repoTimelines = res.data
    }
  }


  return {
    librariesMods, isFetching, librariesSize,
    nexusSearch, timeline,
    fetchLibrariesMods, doNexusSearch, fetchNexusDetails, openTimeline, openTimelineGithub, setupListeners,
    github, fetchGithubRepos, fetchGithubTimeline, initData,
  }
})