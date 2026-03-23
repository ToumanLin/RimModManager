<!-- frontend/src/components/utils/AiDiagnosticSidebar.vue -->
<template>
  <transition name="slide-right">
    <div v-if="modelValue" class="w-[450px] shrink-0 bg-bg-surface/90 backdrop-blur-xl border-l border-text-main/10 flex flex-col h-full z-40 relative shadow-2xl">
      
      <!-- 1. 标题栏 (增加 Token 监控仪) -->
      <div class="h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-black/40">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded-lg bg-linear-to-br from-accent-special to-accent-primary flex items-center justify-center text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div class="flex flex-col">
            <span class="font-bold text-sm text-text-main leading-tight">AI 分析</span>
            <!-- 【新增】会话记忆指示器 -->
            <div class="flex items-center gap-1.5" v-tooltip="'当前会话累积消耗的 Token，过高会导致 AI 失忆'">
              <div class="w-1.5 h-1.5 rounded-full" :class="sessionTokens > 16000 ? 'bg-accent-danger animate-pulse' : 'bg-accent-success'"></div>
              <span class="text-[10px] text-text-dim font-mono">Memory: {{ (sessionTokens / 1000).toFixed(1) }}k token</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-1.5">
          <button @click="clearChat" class="p-1.5 text-text-dim hover:text-accent-danger hover:bg-white/5 transition-all rounded-md" v-tooltip="'清空记忆，开启新会话'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button @click="closeSidebar" class="p-1.5 text-text-dim hover:text-white hover:bg-white/5 transition-all rounded-md">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <!-- 2. 聊天消息流 -->
      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-5 custom-scrollbar" ref="chatContainer">
        
        <!-- 欢迎/引导消息 -->
        <div v-if="chatHistory.length === 0" class="flex flex-col items-center justify-center h-full text-center opacity-80 mt-10">
          <div class="w-16 h-16 rounded-2xl bg-linear-to-br from-accent-special/20 to-transparent flex items-center justify-center mb-4 border border-accent-special/20">
            <svg class="w-8 h-8 text-accent-special" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <p class="text-sm font-bold text-white mb-2">需要排错帮助吗？</p>
          <p class="text-xs text-text-dim max-w-[260px] leading-relaxed">
            在左侧勾选日志后，可以直接发送给 AI 做分析。
          </p>
        </div>

        <!-- 消息气泡渲染 -->
        <div v-for="(msg, idx) in chatHistory" :key="idx" class="flex flex-col group/msg" :class="msg.role === 'user' ? 'items-end' : 'items-start'">
          
          <div class="text-[10px] text-text-dim mb-1 ml-1 mr-1 flex items-center gap-1.5 transition-opacity">
            <span>{{ msg.role === 'user' ? '你' : 'AI' }}</span>
          </div>
          
          <div class="max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm"
              :class="msg.role === 'user' ? 'bg-bg-highlight text-text-main rounded-tr-xs' : 'bg-accent-special/15 backdrop-blur-md border border-white/5 text-text-main rounded-tl-xs'">
            
            <!-- 用户发送的附件标识 -->
            <div v-if="msg.isLogPayload" class="flex items-center gap-2 bg-black/30 rounded-lg p-2 mb-2 opacity-90 text-[11px] border border-white/10 w-fit backdrop-blur-sm shadow-inner">
              <svg class="w-3.5 h-3.5 text-accent-special" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>附件: {{ msg.logCount === 1 && msg._hidden_context ? '全局错误摘要' : msg.logCount + ' 条日志' }}</span>
            </div>
            
            <!-- AI 调用工具状态栏 (折叠与运行态) -->
            <div v-if="msg.tools && msg.tools.length > 0" class="mb-3 flex flex-col gap-1.5">
              <div v-for="t in msg.tools" :key="t.id" class="rounded-md border border-white/5 bg-black/40 overflow-hidden">
                <button
                  class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] text-left hover:bg-white/5 transition-colors"
                  @click="toggleToolExpanded(t)"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <svg v-if="t.status === 'running'" class="w-3.5 h-3.5 animate-spin text-accent-special shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    <svg v-else-if="t.status === 'error'" class="w-3.5 h-3.5 text-accent-danger shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    <svg v-else class="w-3.5 h-3.5 text-accent-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    <div class="min-w-0">
                      <div class="text-text-dim/90 font-mono truncate" v-html="formatToolName(t.name, t.arguments)"></div>
                      <div v-if="t.summary" class="text-[10px] text-text-dim/70 truncate">{{ t.summary }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span v-if="t.durationMs != null" class="text-[10px] text-text-dim/60 font-mono">{{ t.durationMs }}ms</span>
                    <svg class="w-3.5 h-3.5 text-text-dim transition-transform" :class="t.expanded ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                <div v-if="t.expanded" class="px-2.5 pb-2.5 pt-1 border-t border-white/5 bg-black/30 space-y-2">
                  <div>
                    <div class="text-[10px] text-text-dim/70 mb-1">调用参数</div>
                    <pre class="text-[10px] leading-relaxed whitespace-pre-wrap break-all bg-black/40 rounded-md p-2 border border-white/5 text-text-main/90">{{ prettyToolArguments(t.arguments) }}</pre>
                  </div>
                  <div>
                    <div class="text-[10px] text-text-dim/70 mb-1">返回详情</div>
                    <pre class="text-[10px] leading-relaxed whitespace-pre-wrap break-all bg-black/40 rounded-md p-2 border border-white/5" :class="t.status === 'error' ? 'text-accent-danger' : 'text-text-main/90'">{{ prettyToolResult(t.result) }}</pre>
                  </div>
                </div>
              </div>
            </div>
            <!-- 普通文本 -->
            <!-- 文本正文 (支持高级 Markdown 渲染) -->
            <template v-if="msg.role === 'assistant'">
              <div class="prose prose-sm prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 max-w-none relative">
                <div v-if="shouldShowAssistantLoading(msg)" class="flex items-center gap-2 py-1 text-text-dim/80">
                  <svg class="w-4 h-4 animate-spin text-accent-special shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span class="text-xs font-mono">Loading...</span>
                </div>
                <div v-else-if="hasAssistantText(msg)" v-html="renderMarkdown(msg.content)"></div>
              </div>
              <div v-if="msg.tokenUsage" class="mt-2 text-[10px] text-text-dim/70 font-mono flex items-center gap-3">
                <span>输入 {{ msg.tokenUsage.estimated_prompt_tokens || 0 }}</span>
                <span>输出 {{ msg.tokenUsage.estimated_completion_tokens || 0 }}</span>
                <span>总计 {{ msg.tokenUsage.estimated_total_tokens || 0 }}</span>
                <!-- 显示诊断调用的工具轮数 -->
                <span v-if="msg.tokenUsage.tool_rounds > 0" class="text-accent-special">
                  <svg class="w-3 h-3 inline-block mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  历经 {{ msg.tokenUsage.tool_rounds }} 轮检测
                </span>
              </div>
            </template>
            
            <div v-else-if="msg.content" class="whitespace-pre-wrap leading-relaxed text-[13.5px]">{{ msg.content }}</div>

            <!-- 【优雅的 Actionable JSON 渲染】 -->
            <div v-if="msg.actions && msg.actions.length > 0" class="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <p class="text-[11px] text-text-dim font-bold flex items-center gap-1.5 mb-1">
                <svg class="w-3.5 h-3.5 text-accent-special" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                AI 建议操作
              </p>
              
              <div v-for="(action, aIdx) in msg.actions" :key="aIdx" 
                   class="group/action bg-linear-to-b from-white/5 to-transparent border border-white/10 hover:border-accent-special/50 rounded-xl p-3 transition-all duration-300">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-bold text-accent-special text-xs">{{ action.title }}</span>
                </div>
                <p class="text-[11px] text-text-dim leading-relaxed mb-3">{{ action.description }}</p>
                <button @click="executeAction(action)" 
                        class="w-full py-1.5 rounded-lg bg-accent-special/10 hover:bg-accent-special text-accent-special hover:text-white transition-all duration-300 text-xs font-bold border border-accent-special/20 hover:border-transparent flex items-center justify-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {{ getActionLabel(action.type) }}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 3. 输入区 -->
      <div class="p-3 bg-black/60 backdrop-blur-xl border-t border-white/5 shrink-0">
        
        <div class="relative bg-white/5 border border-white/10 rounded-xl transition-all duration-300 focus-within:border-accent-special/50 focus-within:bg-black/50 flex flex-col shadow-inner">
          
          <!-- 【核心修改】悬浮附件 (Payload Indicator) -->
          <transition name="fade-up">
            <div v-if="pendingLogs.length > 0" class="px-3 pt-2 pb-1">
              <div class="flex items-center justify-between bg-accent-special/10 border border-accent-special/20 rounded-lg px-2.5 py-1.5">
                <div class="flex items-center gap-2">
                  <svg class="w-3.5 h-3.5 text-accent-special" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  <span class="text-xs text-accent-special font-bold">附件: {{ pendingLogs[0]?.id === 'global_mock' ? '全局错误摘要' : pendingLogs.length + ' 条日志' }}</span>
                  <span v-if="!tokenInfo.isLoading" class="text-[10px] text-text-dim ml-1">
                    (约 {{ (tokenInfo.estimated/1000).toFixed(1) }}k token)
                  </span>
                  <span v-else class="text-[10px] text-text-dim ml-1">计算中...</span>
                </div>
                <button @click="$emit('clear-selection')" class="text-text-dim hover:text-accent-danger p-0.5 rounded-full bg-white/5 transition-colors" v-tooltip="'移除附件'">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div v-if="tokenInfo.isOverLimit" class="text-[10px] text-accent-danger mt-1.5 pl-1 flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                数据过大，建议取消部分勾选。
              </div>
            </div>
          </transition>

          <textarea v-model="userInput" 
                    @keydown.enter.exact.prevent="sendMessage"
                    placeholder="输入其它要求或直接点击右下角发送分析..." 
                    class="w-full bg-transparent border-none py-3 px-3.5 text-sm text-text-main focus:outline-none resize-none h-14 custom-scrollbar placeholder:text-text-dim/40"></textarea>
          
          <div class="absolute right-2 bottom-2">
            <button @click="sendMessage" :disabled="isSendDisabled"
                    class="p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center"
                    :class="isSendDisabled ? 'text-text-dim/30 bg-transparent' : 'bg-linear-to-b from-accent-special to-accent-primary text-white hover:shadow-[0_0_15px_rgba(139,92,246,0.5)]'">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useAppStore } from '../../stores/appStore'
import { useModStore } from '../../stores/modStore'
import { useRuleStore } from '../../stores/ruleStore'
import { useConfirmStore } from '../../stores/confirmStore'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css' // 引入酷炫的暗黑代码高亮主题

const props = defineProps({
  modelValue: { type: Boolean, default: false }, // 控制侧边栏显隐
  // 从父组件(LogViewer)直接接收处理好的状态
  pendingLogs: { type: Array, default: () => [] },
  filename: { type: String, default: '' }, // 从父组件接收文件名
  tokenInfo: { type: Object, default: () => ({ isLoading: false, condensedData: null }) },
  autoStartRequest: { type: Object, default: null }, // 父组件发来的自动诊断触发信号
  sourceType: { type: String, default: 'game' }
})
const emit = defineEmits(['update:modelValue', 'clear-selection'])

const appStore = useAppStore()
const modStore = useModStore()
const toast = useToast()

const chatContainer = ref(null)
const chatHistory = ref([])
const userInput = ref('')
const isThinking = ref(false)
const currentDiagnosisContext = ref(null)
const consumedAutoStartNonce = ref(null)


const closeSidebar = () => emit('update:modelValue', false)
const clearChat = () => {
  chatHistory.value = []
  userInput.value = ''
  currentDiagnosisContext.value = null
  isThinking.value = false
}

watch(
  () => `${props.sourceType}:${props.filename}`,
  (newKey, oldKey) => {
    if (oldKey !== undefined && newKey !== oldKey) {
      clearChat()
      consumedAutoStartNonce.value = null
    }
  }
)

watch(
  [
    () => props.autoStartRequest?.nonce,
    () => props.modelValue,
  ],
  async ([nonce, isOpen]) => {
    // 只认 nonce，因为只要 nonce 变了，就算没有 PendingLogs 我们也强制让AI跑起来
    if (!nonce || consumedAutoStartNonce.value === nonce) return
    if (!isOpen || isThinking.value) return 

    consumedAutoStartNonce.value = nonce
    clearChat()
    userInput.value = props.autoStartRequest?.question || '请深度分析我提交的日志数据，并给出修复建议。'
    await nextTick()
    await sendMessage() // ✅ 这下肯定能发送了
  }
)

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 【新增】会话 Token 粗略估算 (用于 UI 顶部指示器)
// 中英文混合，1 Token 约等于 2.5 字符
const sessionTokens = computed(() => {
  // 1. 如果有来自后端的准确数据，直接信赖最后一个准确的 AI 上下文大小
  const lastAiMsg = chatHistory.value.slice().reverse().find(m => m.role === 'assistant' && m.tokenUsage?.current_context_tokens);
  
  let exactTokens = 0;
  if (lastAiMsg) {
    exactTokens = Number(lastAiMsg.tokenUsage.current_context_tokens);
  }

  // 2. 对于那些前端刚写入、还没发给后端的最新文字或刚挂载的全局大对象，我们需要用公式粗略补充
  let uncalculatedChars = 0;
  // 计算在 lastAiMsg 之后产生的用户消息长度
  const indexOfLastAi = chatHistory.value.lastIndexOf(lastAiMsg);
  const newMessages = chatHistory.value.slice(indexOfLastAi + 1);
  
  newMessages.forEach(m => {
    uncalculatedChars += (m.content || '').length;
    if (m._hidden_context) {
       if (!m._hidden_context_len) m._hidden_context_len = JSON.stringify(m._hidden_context).length;
       uncalculatedChars += m._hidden_context_len;
    }
  });

  // 如果连第一句话都没发（历史还没有 AI 回复），检查当前是否挂载了附件
  if (exactTokens === 0) {
      if (props.pendingLogs.length > 0) {
          exactTokens += Number(props.tokenInfo?.estimated || 0);
      }
      exactTokens += Math.round(userInput.value.length / 2.5);
  } else {
      exactTokens += Math.round(uncalculatedChars / 2.5);
  }

  return exactTokens;
});
// 核心判断：发送按钮何时置灰
const isSendDisabled = computed(() => {
  if (isThinking.value) return true
  if (props.tokenInfo.isLoading) return true // Token 计算中不准发
  if (props.pendingLogs.length > 0 && !props.tokenInfo.condensedData) return true
  // 如果没有挂载日志附件，且没输入文字，不能发
  if (props.pendingLogs.length === 0 && userInput.value.trim() === '') return true
  return false
})
// 初始化 Markdown-it
const md = new MarkdownIt({
  html: false, // 安全起见，禁用 HTML 标签
  linkify: true, // 自动转换 URL 为链接
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs p-3 rounded-lg text-xs overflow-x-auto custom-scrollbar my-2 border border-white/5 bg-black/50"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch (__) {}
    }
    return `<pre class="hljs p-3 rounded-lg text-xs overflow-x-auto custom-scrollbar my-2 border border-white/5 bg-black/50"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})
// 统一提取 AI 文本，避免对象内容被模板直接渲染成空 JSON/对象字面量
const getAssistantText = (content) => {
  if (content == null) return ''
  return typeof content === 'object' ? String(content.analysis || '') : String(content)
}

const hasAssistantText = (msg) => getAssistantText(msg?.content).trim().length > 0

const shouldShowAssistantLoading = (msg) => {
  // 仅让当前仍在等待结果的最后一条 AI 消息显示 loading，避免旧消息误显示占位态
  const isLatestMessage = chatHistory.value[chatHistory.value.length - 1] === msg
  return isLatestMessage && isThinking.value && !hasAssistantText(msg)
}

const renderMarkdown = (text) => {
  const content = getAssistantText(text)
  // Markdown 处理后，针对普通内联 code 进行一点样式增强
  return md.render(content).replace(/<code>/g, '<code class="bg-black/30 text-accent-special px-1.5 py-0.5 rounded text-[12px] font-mono border border-white/5">')
}

// 工具名称格式化，解析 arguments 让界面更友好
const formatToolName = (name, argsStr) => {
  let args = {}
  try { args = argsStr ? JSON.parse(argsStr) : {} } catch(e){}
  
  switch(name) {
    case 'get_log_context':
      return `读取日志 <code>行号 #${args.target_line || '?'}</code>`
    case 'get_active_mod_list':
      return `核对全局排序规则`
    case 'get_mod_info':
      return `检索模组元数据 <code>${args.package_id || ''}</code>`
    case 'get_load_order_context':
      return `分析局部冲突 <code>${args.package_id || ''}</code>`
    default:
      return `调用系统工具 <code>${name}</code>`
  }
}

const toggleToolExpanded = (tool) => {
  tool.expanded = !tool.expanded
}

const prettyToolArguments = (argsStr) => {
  if (!argsStr) return '无参数'
  try {
    return JSON.stringify(JSON.parse(argsStr), null, 2)
  } catch (e) {
    return String(argsStr)
  }
}

const prettyToolResult = (result) => {
  if (!result) return '暂无结果'
  try {
    return JSON.stringify(JSON.parse(result), null, 2)
  } catch (e) {
    return String(result)
  }
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
  const { session_id, tool_id, name, arguments: args } = e.detail
  const msg = chatHistory.value.find(m => m.session_id === session_id)
  if (msg) {
    if (!msg.tools) msg.tools = []
    // 【修改】存入 arguments 以供前端解析展示
    msg.tools.push({
      id: tool_id,
      name,
      arguments: args,
      status: 'running',
      summary: '',
      result: '',
      durationMs: null,
      expanded: false
    })
    scrollToBottom()
  }
}

const handleToolResult = (e) => {
  const { session_id, tool_id, status, summary, result, duration_ms } = e.detail
  const msg = chatHistory.value.find(m => m.session_id === session_id)
  if (msg && msg.tools) {
    const tool = msg.tools.find(t => t.id === tool_id)
    if (tool) {
      tool.status = status || 'done'
      tool.summary = summary || ''
      tool.result = result || ''
      tool.durationMs = duration_ms ?? null
    }
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


// ================== 发送与处理逻辑 ==================

// 发送选中日志
const sendMessage = async () => {
  if (isSendDisabled.value || !window.pywebview) return
  isThinking.value = true

  let questionText = userInput.value.trim()
  const hasAttachment = props.pendingLogs.length > 0 && props.tokenInfo.condensedData
  const shouldKeepAttachment = hasAttachment && props.pendingLogs.some(log => log.id === 'global_mock')
  
  // 如果用户啥都没写，但是有日志附件，就补一个默认提示词
  if (hasAttachment && questionText === '') {
    questionText = "请深度分析我提交的日志数据，并给出修复建议。"
  }

  const displayQuestionText = questionText === '请深度分析我提交的日志数据，并给出修复建议。' ? '' : questionText

  // 1. 生成会话 ID 绑定流
  const sessionId = `chat_${Date.now()}`

  // 2. 将数据推入本地聊天气泡以供展示
  chatHistory.value.push({ 
    role: 'user', 
    content: displayQuestionText,
    requestContent: questionText,
    isLogPayload: hasAttachment,
    logCount: props.pendingLogs.length,
    _hidden_context: hasAttachment ? props.tokenInfo.condensedData : null
  })
  if (hasAttachment) {
    currentDiagnosisContext.value = props.tokenInfo.condensedData
  }

  // 构造发给后端的 history；诊断上下文走独立字段，避免逐轮塞回历史
  const historyForBackend = chatHistory.value.map(m => {
    let finalContent = m.role === 'user'
      ? (m.requestContent ?? m.content ?? "")
      : (m.content || "")
    // 对于 AI 消息，如果是对象，提取 analysis
    if (m.role === 'assistant' && typeof finalContent === 'object') {
      finalContent = finalContent.analysis || ""
    }
    return { role: m.role, content: finalContent }
  })

  // 移除最后一条刚才 push 的 user 消息，因为它等下会被包含在 historyForBackend 中
  // 但为了不让 historyForBackend 最后一项变成 user 导致对话错乱，其实我们可以直接传
  // 但是后端的逻辑是把 question 独立处理，所以我们把最后一项 pop 出来
  const lastUserMsg = historyForBackend.pop()

  const requestPayload = {
    session_id: sessionId,
    log_source_type: props.sourceType, // 【修复 1】传入正确的源类型
    filename: props.filename,          // 【修复 1】传入文件名
    diagnosis_context: currentDiagnosisContext.value,
    history: historyForBackend,        // 带有完整记忆的历史
    question: lastUserMsg.content      // 组装好的当前问题（含隐藏附件）
  }

  const aiMsg = {
    role: 'assistant',
    session_id: sessionId,
    tools: [],
    content: { analysis: '', actions: [] },
    actions: [],
    tokenUsage: null
  }
  chatHistory.value.push(aiMsg)
  userInput.value = ''

  if (hasAttachment && !shouldKeepAttachment) {
    emit('clear-selection')
  }

  await nextTick()
  scrollToBottom()
  try {
    const res = await window.pywebview.api.ai_diagnostic_chat(requestPayload)
    if (res.status === 'success') {
      aiMsg.actions = res.data.actions || res.data.solutions || []
      aiMsg.tokenUsage = res.data.token_usage || null
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
        // 调用 ruleStore 写入用户规则
        const ruleStore = useRuleStore()
        await ruleStore.addUserModRule(payload.mod_id, 'load_after', payload.target_id)
        
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
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); opacity: 0; }

.fade-up-enter-active, .fade-up-leave-active { transition: all 0.3s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(10px); }

/* 代码块外层的自适应 */
:deep(.prose) {
  line-height: 1.6;
}
:deep(.prose pre) {
  margin: 0.5rem 0;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
}
:deep(.prose code) {
  font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 0.85em;
}
</style>
