import { defineStore } from 'pinia'
import { ref } from 'vue'
import { toast } from '../utils/common'
import { useConfirmStore } from './confirmStore'

// 队列只接收规范化后的动作，避免不同检查模块各自拼 Confirm 参数造成弹窗行为不一致。
const normalizeAction = (action = {}) => ({
  id: String(action.id || action.value || '').trim(),
  label: String(action.label || '').trim(),
  kind: String(action.kind || 'secondary').trim(),
})

// 每个条目保留 raw 原始对象，按钮回调可以继续使用后端返回的完整业务数据。
const normalizePromptItem = (item = {}) => ({
  id: String(item.id || item.key || '').trim(),
  title: String(item.title || item.name || '').trim(),
  description: String(item.description || item.message || '').trim(),
  meta: Array.isArray(item.meta) ? item.meta.map(value => String(value || '').trim()).filter(Boolean) : [],
  status: '',
  statusMessage: '',
  actions: (item.actions || []).map(normalizeAction).filter(action => action.id && action.label),
  raw: item.raw || item,
})

// prompt 代表一个“类别弹窗”，例如工具环境、外部库更新、SteamCMD 模组更新。
const normalizePrompt = (prompt = {}) => ({
  id: String(prompt.id || `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
  category: String(prompt.category || 'general'),
  title: String(prompt.title || '系统提示'),
  message: String(prompt.message || ''),
  type: String(prompt.type || 'warning'),
  priority: Number(prompt.priority || 100),
  items: (prompt.items || []).map(normalizePromptItem).filter(item => item.id && item.title),
  bulkActions: (prompt.bulkActions || []).map(normalizeAction).filter(action => action.id && action.label),
  onItemAction: typeof prompt.onItemAction === 'function' ? prompt.onItemAction : null,
  onBulkAction: typeof prompt.onBulkAction === 'function' ? prompt.onBulkAction : null,
})

// 统一启动期/维护期提示入口：同一时间只打开一个 Confirm，后续提示按优先级排队。
export const usePromptQueueStore = defineStore('promptQueue', () => {
  const queue = ref([])
  const activePrompt = ref(null)
  const isDraining = ref(false)

  const sortQueue = () => {
    queue.value = [...queue.value].sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority
      return left.id.localeCompare(right.id)
    })
  }

  // 入队：将一个类别弹窗添加到队列，按优先级排序。
  const enqueue = (prompt) => {
    const normalized = normalizePrompt(prompt)
    if (normalized.items.length === 0) return Promise.resolve('')
    // 返回 Promise 方便调用方等待本类别弹窗被处理完，但不会要求业务方直接控制弹窗生命周期。
    return new Promise((resolve) => {
      normalized.resolve = resolve
      queue.value = [...queue.value, normalized]
      sortQueue()
      void drain()
    })
  }

  // 处理单项操作：根据类别弹窗回调函数执行具体操作，更新状态并通知外部。
  const runItemAction = async (prompt, item, actionId) => {
    const targetAction = item.actions.find(action => action.id === actionId)
    if (!targetAction) return false
    item.status = 'running'
    item.statusMessage = '处理中...'
    try {
      if (prompt.onItemAction) {
        await prompt.onItemAction(item.raw, actionId, item)
      }
      item.status = 'success'
      item.statusMessage = targetAction.label === '跳过' ? '已跳过' : '已提交处理'
      return true
    } catch (error) {
      item.status = 'failed'
      item.statusMessage = error?.message || '处理失败'
      toast.error(item.statusMessage)
      return false
    }
  }

  // 处理批量操作：根据类别弹窗回调函数执行具体操作，更新状态并通知外部。
  const runBulkAction = async (prompt, actionId) => {
    const targetAction = prompt.bulkActions.find(action => action.id === actionId)
    if (!targetAction) return
    try {
      if (prompt.onBulkAction) {
        await prompt.onBulkAction(actionId, prompt.items.map(item => item.raw), prompt)
      }
    } catch (error) {
      toast.error(error?.message || `${targetAction.label}失败`)
    }
  }

  // 打开类别弹窗：根据类别弹窗回调函数执行具体操作，更新状态并通知外部。
  const openPrompt = async (prompt) => {
    const confirmStore = useConfirmStore()
    const result = await confirmStore.open({
      title: prompt.title,
      message: prompt.message,
      type: prompt.type,
      mode: 'confirm',
      promptItems: prompt.items,
      // 单项操作在 Confirm 内完成，不关闭整个队列；成功后移除条目，失败则保留并显示失败状态。
      onPromptItemAction: async (itemId, actionId) => {
        const itemIndex = prompt.items.findIndex(candidate => candidate.id === itemId)
        const item = prompt.items[itemIndex]
        if (!item || item.status === 'running') return
        const handled = await runItemAction(prompt, item, actionId)
        if (!handled) return

        // 单项处理完成后立即从当前弹窗移除；全部处理完则关闭弹窗并继续队列。
        prompt.items.splice(itemIndex, 1)
        if (prompt.items.length === 0) {
          confirmStore.chooseAction({ scope: 'prompt-complete' })
        }
      },
      // 底部按钮是窗口级操作：点击后关闭当前弹窗，再执行批量动作并继续处理队列。
      actionButtons: prompt.bulkActions.map(action => ({
        label: action.label,
        kind: action.kind,
        value: { scope: 'bulk', action: action.id },
      })),
    })
    if (result?.scope === 'bulk') {
      await runBulkAction(prompt, result.action)
    }
  }

  // 处理队列：从队列中取一个类别弹窗，打开并处理，直到队列为空。
  const drain = async () => {
    if (isDraining.value) return
    isDraining.value = true
    try {
      while (queue.value.length > 0) {
        // 每轮只取一个弹窗，保证多个启动提示不会互相覆盖。
        const [nextPrompt, ...remaining] = queue.value
        queue.value = remaining
        activePrompt.value = nextPrompt
        await openPrompt(nextPrompt)
        nextPrompt.resolve?.(nextPrompt.id)
        activePrompt.value = null
      }
    } finally {
      activePrompt.value = null
      isDraining.value = false
    }
  }

  return {
    queue, activePrompt, isDraining,
    enqueue, drain,
  }
})
