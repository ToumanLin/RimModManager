<!-- frontend/src/components/utils/AiDiagnosticSidebar.vue -->
<template>
  <transition name="slide-right">
    <div v-if="modelValue" class="w-[450px] shrink-0 bg-bg-surface/90 backdrop-blur-xl border-l border-text-main/10 flex flex-col h-full z-40 relative shadow-2xl">
      
      <!-- 1. 标题栏 -->
      <div class="h-12 border-b border-text-main/10 flex items-center justify-between px-4 shrink-0 bg-black/20">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-accent-special/20 flex items-center justify-center text-accent-special">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span class="font-bold text-sm text-text-main">AI 诊断专家</span>
        </div>
        
        <div class="flex items-center gap-2">
          <button @click="clearChat" class="p-1.5 text-text-dim hover:text-accent-danger transition-colors rounded" v-tooltip="'清空会话'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button @click="closeSidebar" class="p-1.5 text-text-dim hover:text-text-main transition-colors rounded">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <!-- 2. 聊天消息流 -->
      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar" ref="chatContainer">
        
        <!-- 欢迎/引导消息 -->
        <div v-if="chatHistory.length === 0" class="flex flex-col items-center justify-center h-full text-center opacity-70">
          <svg class="w-12 h-12 text-accent-special mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <p class="text-sm font-bold text-text-main mb-1">需要排错帮助吗？</p>
          <p class="text-xs text-text-dim max-w-[250px]">
            在左侧勾选红字，你可以直接要求我分析，也可以在下方输入补充说明。
          </p>
        </div>

        <!-- 消息气泡渲染 -->
        <div v-for="(msg, idx) in chatHistory" :key="idx" class="flex flex-col" :class="msg.role === 'user' ? 'items-end' : 'items-start'">
          
          <div class="text-[10px] text-text-dim mb-1 ml-1 mr-1">
            {{ msg.role === 'user' ? '你' : 'AI' }}
          </div>
          
          <div class="max-w-[90%] rounded-xl px-3 py-2 text-sm"
              :class="msg.role === 'user' ? 'bg-accent-primary text-white rounded-tr-none' : 'bg-black/30 border border-text-main/10 text-text-main rounded-tl-none'">
            
            <!-- 如果是用户发的日志包 -->
            <div v-if="msg.isLogPayload" class="flex items-center gap-2 bg-black/20 rounded p-1.5 mb-1.5 opacity-90 text-xs border border-white/20 w-fit">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>附件: {{ msg.logCount }} 条日志记录</span>
            </div>
            
            <!-- AI 调用工具状态渲染区 -->
            <div v-if="msg.tools && msg.tools.length > 0" class="mb-3 flex flex-col gap-1.5">
              <div v-for="t in msg.tools" :key="t.id" class="flex items-center gap-2 text-xs bg-black/40 px-2 py-1.5 rounded border border-text-main/10">
                <svg v-if="t.status === 'running'" class="w-3.5 h-3.5 animate-spin text-accent-special" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <svg v-else class="w-3.5 h-3.5 text-accent-success" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span class="text-text-dim">正在检索: <code class="text-accent-cool text-[11px]">{{ t.name }}</code></span>
              </div>
            </div>
            <!-- 普通文本 -->
            <div v-if="msg.role === 'assistant'" 
                class="prose prose-sm prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 max-w-none" 
                v-html="renderMarkdown(msg.content)">
            </div>
            <!-- <div v-else class="whitespace-pre-wrap leading-relaxed">{{ msg.content }}</div> -->
            <div v-else-if="msg.content" class="whitespace-pre-wrap leading-relaxed" v-html="formatMessage(msg.content)"></div>

            <!-- 【核心】富文本卡片：Actionable JSON 渲染 -->
            <div v-if="msg.actions && msg.actions.length > 0" class="mt-3 flex flex-col gap-2">
              <div v-for="(action, aIdx) in msg.actions" :key="aIdx" class="bg-bg-deep/50 border border-text-main/10 rounded-lg p-2.5">
                <div class="flex items-start justify-between mb-1">
                  <span class="font-bold text-accent-special text-xs">{{ action.title }}</span>
                </div>
                <p class="text-[11px] text-text-dim mb-2">{{ action.description }}</p>
                <button @click="executeAction(action)" class="w-full py-1.5 rounded bg-text-main/10 hover:bg-accent-primary hover:text-white transition-colors text-xs font-bold border border-text-main/5">
                  {{ getActionLabel(action.type) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 思考中动画：只有当 AI 还没开始说话且还没调用工具时才显示点点点 -->
        <div v-if="isThinking && shouldShowThinkingDots" class="flex items-start mt-2">
          <div class="bg-black/30 border border-text-main/10 rounded-xl rounded-tl-none px-4 py-3 flex gap-1">
            <span class="w-1.5 h-1.5 bg-accent-special rounded-full animate-bounce"></span>
            <span class="w-1.5 h-1.5 bg-accent-special rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
            <span class="w-1.5 h-1.5 bg-accent-special rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
          </div>
        </div>
      </div>

      <!-- 3. 输入区 -->
      <div class="p-3 bg-bg-deep/80 border-t border-text-main/10 shrink-0">
        
        <div class="relative bg-black/40 border border-text-main/10 rounded-lg transition-all focus-within:border-accent-special/50 flex flex-col">
          
          <!-- 【核心修改】悬浮附件 (Payload Indicator) -->
          <div v-if="pendingLogs.length > 0" class="px-3 pt-2 pb-1">
            <div class="flex items-center justify-between bg-accent-primary/10 border border-accent-primary/20 rounded px-2 py-1">
              <div class="flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span class="text-xs text-accent-primary font-bold">待分析: {{ pendingLogs.length }} 条日志</span>
                <span v-if="!tokenInfo.isLoading" class="text-[10px] text-text-dim ml-1">
                  (约 {{ tokenInfo.estimated }} Tokens)
                </span>
                <span v-else class="text-[10px] text-text-dim ml-1">计算中...</span>
              </div>
              <button @click="$emit('clear-selection')" class="text-text-dim hover:text-accent-danger p-0.5 rounded-full" v-tooltip="'移除附件'">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div v-if="tokenInfo.isOverLimit" class="text-[10px] text-accent-danger mt-1 pl-1">
              ⚠ 数据过大，建议取消部分勾选。
            </div>
          </div>

          <textarea v-model="userInput" 
                    @keydown.enter.exact.prevent="sendMessage"
                    placeholder="输入问题或直接点击右下角发送..." 
                    class="w-full bg-transparent border-none rounded-lg py-2 px-3 text-sm text-text-main focus:outline-none resize-none h-14 custom-scrollbar placeholder:text-text-dim/50"></textarea>
          
          <div class="absolute right-2 bottom-2">
            <button @click="sendMessage" :disabled="isSendDisabled"
                    class="p-1.5 rounded-md transition-colors flex items-center justify-center"
                    :class="isSendDisabled ? 'text-text-dim/30 bg-transparent' : 'bg-accent-special text-white hover:bg-accent-highlight shadow-lg'">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useAppStore } from '../../stores/appStore'
import { useModStore } from '../../stores/modStore'
import { useRuleStore } from '../../stores/ruleStore'
import { useConfirmStore } from '../../stores/confirmStore'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  modelValue: { type: Boolean, default: false }, // 控制侧边栏显隐
  // 从父组件(LogViewer)直接接收处理好的状态
  pendingLogs: { type: Array, default: () => [] },
  filename: { type: String, default: '' }, // 从父组件接收文件名
  tokenInfo: { type: Object, default: () => ({ isLoading: false, condensedData: null }) }
})
const emit = defineEmits(['update:modelValue', 'clear-selection'])

const appStore = useAppStore()
const modStore = useModStore()
const toast = useToast()

const chatContainer = ref(null)
const chatHistory = ref([])
const userInput = ref('')
const isThinking = ref(false)


const closeSidebar = () => emit('update:modelValue', false)
const clearChat = () => { chatHistory.value =[] }

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 核心判断：发送按钮何时置灰
const isSendDisabled = computed(() => {
  if (isThinking.value) return true
  if (props.tokenInfo.isLoading) return true // Token 计算中不准发
  // 如果没有挂载日志附件，且没输入文字，不能发
  if (props.pendingLogs.length === 0 && userInput.value.trim() === '') return true
  return false
})
// 初始化 Markdown-it
const md = new MarkdownIt({
  html: false, // 安全起见，禁用 HTML 标签
  linkify: true, // 自动转换 URL 为链接
  typographer: true,
})
const renderMarkdown = (text) => {
  if (text == null) return ''
  // 【新增】如果传入的是对象，安全提取 analysis 字段
  if (typeof text === 'object') {
    return md.render(text.analysis || '')
  }
  // 强制转为字符串防止崩溃
  return md.render(String(text))
}


// 简单格式化消息文本（处理加粗、换行等）
const formatMessage = (text) => {
  if (!text) return ''
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent-special">$1</strong>')
             .replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 rounded text-accent-cool text-xs">$1</code>')
}

// ====== 新增：生命周期监听后端流事件 ======
const handleStream = (e) => {
  const { session_id, chunk } = e.detail
  const msg = chatHistory.value.find(m => m.session_id === session_id)
  if (msg) {
    if (typeof msg.content === 'object') {
      msg.content.analysis += chunk
    } else {
      msg.content += chunk
    }
    scrollToBottom()
  }
}

const handleToolCall = (e) => {
  const { session_id, tool_id, name } = e.detail
  const msg = chatHistory.value.find(m => m.session_id === session_id)
  if (msg) {
    if (!msg.tools) msg.tools = []
    msg.tools.push({ id: tool_id, name, status: 'running' })
    scrollToBottom()
  }
}

const handleToolResult = (e) => {
  const { session_id, tool_id } = e.detail
  const msg = chatHistory.value.find(m => m.session_id === session_id)
  if (msg && msg.tools) {
    const tool = msg.tools.find(t => t.id === tool_id)
    if (tool) tool.status = 'done'
    scrollToBottom()
  }
}

onMounted(() => {
  window.addEventListener('ai-chat-stream', handleStream)
  window.addEventListener('ai-tool-call', handleToolCall)
  window.addEventListener('ai-tool-result', handleToolResult)
})

onUnmounted(() => {
  window.removeEventListener('ai-chat-stream', handleStream)
  window.removeEventListener('ai-tool-call', handleToolCall)
  window.removeEventListener('ai-tool-result', handleToolResult)
})

// ====== 逻辑改造 ======

// 只有当最后一个消息是 AI，且它的文字为空、且没有调用工具时，才显示发呆的三个点
const shouldShowThinkingDots = computed(() => {
  if (chatHistory.value.length === 0) return false
  const lastMsg = chatHistory.value[chatHistory.value.length - 1]
  if (lastMsg.role !== 'assistant') return true
  
  const hasText = typeof lastMsg.content === 'object' ? lastMsg.content.analysis.length > 0 : lastMsg.content.length > 0
  const hasTools = lastMsg.tools && lastMsg.tools.length > 0
  return !hasText && !hasTools
})


// ================== 发送与处理逻辑 ==================

// 发送选中日志
const sendMessage = async () => {
  if (isSendDisabled.value || !window.pywebview) return
  isThinking.value = true

  let questionText = userInput.value.trim()
  const hasAttachment = props.pendingLogs.length > 0 && props.tokenInfo.condensedData
  
  // 如果用户啥都没写，但是有日志附件，就补一个默认提示词
  if (hasAttachment && questionText === '') {
    questionText = "请分析我提交的日志数据。"
  }

  // 1. 生成会话 ID 绑定流
  const sessionId = `chat_${Date.now()}`
  const requestPayload = {
    session_id: sessionId,
    log_source_type: props.sourceType,
    filename: props.filename, // 让后端知道去哪个文件捞行号
    history: chatHistory.value,
    question: questionText
  }

  // 2. 将数据推入本地聊天气泡以供展示
  chatHistory.value.push({ 
    role: 'user', 
    content: questionText === '请分析我提交的日志数据。' ? '' : questionText, // UI上隐藏多余的套话
    isLogPayload: hasAttachment,
    logCount: props.pendingLogs.length
  })
  // 3. 【核心新增】立即为 AI 推入一个空的占位气泡，用来接收流式打字和工具状态
  const aiMsg = {
    role: 'assistant',
    session_id: sessionId,
    tools: [],
    content: { analysis: '', actions: [] },
    actions: [] // 把 actions 提到外层方便渲染判断
  }
  chatHistory.value.push(aiMsg)
  userInput.value = ''

  // 3. 如果有附件，将浓缩数据合并进去，并清空父组件的选择状态
  if (hasAttachment) {
    requestPayload.condensed_data = props.tokenInfo.condensedData
    // 触发清空
    emit('clear-selection')
  }

  // 4. 发起网络请求
  await nextTick()
  scrollToBottom()
  try {
    const res = await window.pywebview.api.ai_diagnostic_chat(requestPayload)
    if (res.status === 'success') {
      aiMsg.actions = res.data.actions || res.data.solutions || []
      // 容错处理：如果因为某些网络原因导致没收到流，在这里把完整文本补齐
      if (!aiMsg.content.analysis && res.data.analysis) {
        aiMsg.content.analysis = res.data.analysis
      }
    } else {
      throw new Error(res.message)
    }
  } catch(e) {
    aiMsg.content.analysis += `\n\n⚠️ 分析过程中发生错误: ${e.message}`
  } finally {
    isThinking.value = false
    scrollToBottom()
  }
}

// ================== 动作执行 (Actionable JSON) ==================

const getActionLabel = (type) => {
  switch (type) {
    case 'ENABLE_MOD': return '一键启用 Mod'
    case 'DISABLE_MOD': return '一键停用 Mod'
    case 'ADD_RULE': return '应用排序规则'
    case 'REPORT_BUG': return '复制反馈模板'
    default: return '执行操作'
  }
}

const executeAction = async (action) => {
  const payload = action.payload || {}
  
  try {
    switch (action.action || action.type) {
      case 'ENABLE_MOD':
        if (payload.mod_id) {
          modStore.changeModsActive([payload.mod_id], true)
          toast.success(`已启用: ${payload.mod_id}`)
        }
        break;
        
      case 'DISABLE_MOD':
        const ids = payload.mod_ids || (payload.mod_id ? [payload.mod_id] :[])
        if (ids.length > 0) {
          modStore.changeModsActive(ids, false)
          toast.success(`已停用选中 Mod`)
        }
        break;
        
      case 'ADD_RULE':
        // 调用 ruleStore 写入动态规则
        const ruleStore = useRuleStore()
        const newRule = {
          rule_id: `ai_fix_${Date.now()}`,
          name: `AI 修复: ${payload.mod_id} -> ${payload.target_id}`,
          enabled: true, logic: 'AND',
          filters:[{ field: 'package_id', operator: 'equals', value: payload.mod_id }],
          action: { type: payload.rule_type || 'load_after', value: payload.target_id }
        }
        await ruleStore.saveDynamicRule(newRule)
        
        // 询问用户是否立刻重新排序
        const confirmStore = useConfirmStore()
        if (await confirmStore.confirmAction('规则已应用', '是否立即重新执行自动排序以使规则生效？', {type: 'success'})) {
          await modStore.autoSortMods()
        }
        break;
        
      case 'REPORT_BUG':
        if (payload.report_text) {
          await navigator.clipboard.writeText(payload.report_text)
          toast.success("反馈模板已复制到剪贴板")
        }
        break;
        
      default:
        toast.warning(`暂不支持的操作类型: ${action.type}`)
    }
  } catch (e) {
    toast.error(`操作执行失败: ${e.message}`)
  }
}
</script>

<style scoped>
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }
</style>