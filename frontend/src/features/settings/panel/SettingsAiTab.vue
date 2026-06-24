<template>
              <section data-tour="settings-ai-section" class="animate-in fade-in slide-in-from-right-4">
                <div class="mb-6 flex items-center justify-between">
                  <h3 class="text-lg font-bold text-text-main flex items-center gap-2">
                    {{ t('settings.aiPanel.title') }}
                    <span class="px-2 py-0.5 rounded bg-accent-special/20 text-accent-special text-xs font-black uppercase">{{ t('settings.aiPanel.experimental') }}</span>
                  </h3>

                  <button v-if="formData.ai.enabled" @click="appStore.uiState.showAIDefinitionManager = true"
                    class="px-4 py-1.5 rounded-lg bg-accent-special/10 hover:bg-accent-special/20 text-accent-special border border-accent-special/30 text-xs font-bold transition-colors flex items-center gap-2">
                    <Drama class="size-4" /> {{ t('settings.aiPanel.definitionManager') }}
                  </button>
                </div>
                <div class="space-y-6">
                  <div data-tour="settings-ai-enable">
                    <CommonSwitch :label="t('settings.aiPanel.enable')" v-model="formData.ai.enabled" :description="t('settings.aiPanel.enableDesc')" />
                  </div>
                  <div v-if="formData.ai.enabled" class="space-y-6 animate-in slide-in-from-top-2">
                      
                    <!-- 2. 动态表单区 -->
                    <div data-tour="settings-ai-connection" class="p-4 rounded-xl bg-bg-overlay/5 border border-border-base/10 space-y-5">
                      <div class="grid grid-cols-2 gap-3">
                        <!-- 厂商/协议选择 -->
                        <CommonSelect :label="t('settings.aiPanel.protocol')" :description="t('settings.aiPanel.protocolDesc')"
                          v-model="formData.ai.provider" :options="currentAiProviders" @change="handleProviderChange"/>
                        <!-- 模型选择 (带刷新动作) -->
                        <div class="relative flex items-end gap-2">
                          <div class="flex-1">
                            <!-- 加上 editable 允许用户手输未被探测到的模型名 -->
                            <CommonSelect :label="t('settings.aiPanel.model')" editable v-model="formData.ai.model" :options="currentAiModels" 
                              :placeholder="t('settings.aiPanel.modelPlaceholder')" @visible-change="(val) => val && fetchAiModels({ silent: true })"/>
                          </div>
                          <!-- 对于自定义模式，提供显式的刷新按钮让用户主动拉取 -->
                          <button @click="fetchAiModels({ forceRefresh: true, warnOnEmpty: true, silent: false })" v-tooltip="t('settings.aiPanel.refreshModels')"
                            class="h-9 px-3 bg-bg-inset/70 hover:bg-accent-special/20 text-accent-special border border-accent-special/30 rounded-lg flex items-center justify-center transition-colors">
                            <svg class="size-4" :class="{'animate-spin': aiStore.isLoading}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                          </button>
                        </div>

                        <!-- Base URL (自定义必填，官方高级选填) -->
                        <CommonInput label="Base URL" v-model="formData.ai.base_url" class="col-span-2"
                          :placeholder="t('settings.aiPanel.baseUrlPlaceholder')"
                          :description="t('settings.aiPanel.baseUrlDesc')"
                        />
                        <!-- API Key -->
                        <CommonInput label="API Key" v-model="formData.ai.api_key" is-password class="col-span-2" 
                          :placeholder="t('settings.aiPanel.apiKeyPlaceholder')" 
                        />
                      </div>

                    </div>

                    <!-- 3. 测试与高级参数区 -->
                    <div data-tour="settings-ai-advanced" class="">
                      <div class="grid grid-cols-3 gap-2">
                        <CommonNumber :label="t('settings.aiPanel.maxConcurrency')" v-model="formData.ai.max_concurrency" :step="1" :min="1" :max="100" :description="t('settings.aiPanel.maxConcurrencyDesc')" />
                        <CommonNumber :label="t('settings.aiPanel.temperature')" v-model="formData.ai.temperature" :step="0.1" :min="0" :max="2.0" :description="t('settings.aiPanel.temperatureDesc')" />
                        <CommonNumber :label="t('settings.aiPanel.contextWindow')" v-model="formData.ai.context_window_tokens" :step="1024" :min="0"
                          :description="t('settings.aiPanel.contextWindowDesc')" />
                        <CommonNumber :label="t('settings.aiPanel.maxInput')" v-model="formData.ai.max_input_tokens" :step="1024" :min="0"
                          :description="t('settings.aiPanel.maxInputDesc')" />
                        <CommonNumber :label="t('settings.aiPanel.maxOutput')" v-model="formData.ai.max_output_tokens" :step="512" :min="0"
                          :description="t('settings.aiPanel.maxOutputDesc')" />
                        <CommonSelect v-if="formData.ai.provider === 'openai_compatible'"
                          :label="t('settings.aiPanel.endpointMode')" v-model="formData.ai.endpoint_mode"
                          :description="t('settings.aiPanel.endpointModeDesc')"
                          :options="[
                            { label: 'Auto', value: 'auto' },
                            { label: 'Chat Completions API', value: 'chat_completions' },
                            { label: 'Responses API', value: 'responses' }
                          ]" />
                      </div>

                      <!-- 测试区 -->
                      <div data-tour="settings-ai-test" class="pt-4 flex gap-3">
                        <CommonInput :label="t('settings.aiPanel.testContent')" class="flex-1" v-model="testPrompt" :placeholder="t('settings.aiPanel.testPlaceholder')" @keydown.enter="testModel"></CommonInput>
                        <button class="mt-[1.3rem] flex items-center justify-center bg-accent-special/70 hover:bg-accent-special hover:text-text-main text-text-dim px-6 py-2 rounded-lg font-bold transition-all" 
                          :class="[aiStore.isLoading?'cursor-not-allowed pointer-events-none opacity-50':'cursor-pointer']"
                          @click="testModel">
                          <svg v-if="aiStore.isLoading" class="animate-spin size-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          {{ t('settings.aiPanel.startTest') }}
                        </button>
                      </div>

                      <div v-if="testResponse" class="p-4 mt-2 rounded-xl text-text-soft bg-accent-special/10 border border-border-base/10 relative">
                        <button @click="clearTestResult" class="absolute top-2 right-2 text-text-dim hover:text-text-main">×</button>
                        <div class="text-xs text-text-dim mb-1 font-bold">{{ t('settings.aiPanel.responseResult') }}</div>
                        <div class="text-sm whitespace-pre-wrap leading-relaxed">{{ testResponse }}</div>
                        <details v-if="testRawResponse" class="modal-section-subtle mt-3 p-3 text-xs text-text-dim">
                          <summary class="cursor-pointer font-bold text-text-main">{{ t('settings.aiPanel.rawResponse') }}</summary>
                          <pre class="mt-2 whitespace-pre-wrap break-all rounded-lg border border-border-base/10 bg-bg-inset/70 p-3 text-xs text-text-main">{{ prettyTestRawResponse }}</pre>
                        </details>
                      </div>

                    </div>
                  </div>
                </div>
              </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Drama } from 'lucide-vue-next'
import CommonSwitch from '../../../shared/components/input/CommonSwitch.vue'
import CommonInput from '../../../shared/components/input/CommonInput.vue'
import CommonNumber from '../../../shared/components/input/CommonNumber.vue'
import CommonSelect from '../../../shared/components/input/CommonSelect.vue'
import { toast } from '../../../shared/lib/common'
import { useAppStore } from '../../../app/stores/appStore'
import { useAiStore } from '../../ai/aiStore'

const props = defineProps({
  formData: { type: Object, required: true },
})

const appStore = useAppStore()
const aiStore = useAiStore()
const { t } = useI18n()

const testPrompt = ref(t('settings.aiPanel.defaultTestPrompt'))
const testResponse = ref('')
const testRawResponse = ref(null)

// 每个协议保留一份连接草稿，用户来回切换协议时不会丢失已填写的 URL、Key 和模型名。
const aiProviderDrafts = ref({})
const activeAiProvider = ref('')

const DEFAULT_AI_BASE_URLS = {
  openai_compatible: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  ollama: 'http://127.0.0.1:11434',
}

const currentAiProviders = computed(() => aiStore.listAiProviders())
const currentAiModels = computed(() => aiStore.getCachedAiModelOptions(props.formData?.ai || {}))

// 原始响应可能是对象或字符串，统一转成可读文本，便于排查模型兼容问题。
const prettyTestRawResponse = computed(() => {
  if (testRawResponse.value == null) return ''
  try {
    return JSON.stringify(testRawResponse.value, null, 2)
  } catch {
    return String(testRawResponse.value)
  }
})

const normalizeAiProvider = (provider = '') => {
  const normalized = String(provider || '').trim().toLowerCase()
  if (['openai', 'custom_openai'].includes(normalized)) return 'openai_compatible'
  return normalized || 'openai_compatible'
}

// 协议名作为草稿 key，避免 OpenAI-compatible 的历史别名生成多份重复草稿。
const createAiProviderDraft = (ai = {}, providerOverride = undefined) => ({
  provider: normalizeAiProvider(providerOverride ?? ai.provider),
  base_url: String(ai.base_url || '').trim(),
  api_key: String(ai.api_key || '').trim(),
  model: String(ai.model || '').trim(),
  endpoint_mode: String(ai.endpoint_mode || 'auto').trim().toLowerCase() || 'auto',
})

const syncAiProviderDraft = (provider = activeAiProvider.value) => {
  const ai = props.formData?.ai
  if (!ai) return
  const normalizedProvider = normalizeAiProvider(provider || ai.provider)
  aiProviderDrafts.value[normalizedProvider] = createAiProviderDraft(ai, normalizedProvider)
}

const hydrateAiProviderDrafts = () => {
  const ai = props.formData?.ai
  if (!ai) return
  const provider = normalizeAiProvider(ai.provider)
  activeAiProvider.value = provider
  aiProviderDrafts.value = {
    [provider]: createAiProviderDraft(ai, provider),
  }
}

const applyAiDraftForProvider = (provider) => {
  const ai = props.formData?.ai
  if (!ai) return
  const normalizedProvider = normalizeAiProvider(provider)
  const hasDraft = Object.prototype.hasOwnProperty.call(aiProviderDrafts.value, normalizedProvider)
  const draft = hasDraft ? aiProviderDrafts.value[normalizedProvider] : null
  // 没有历史草稿时填入协议默认地址，让新协议切换后能直接看到合理的连接起点。
  ai.provider = normalizedProvider
  ai.base_url = draft ? String(draft.base_url || '') : (DEFAULT_AI_BASE_URLS[normalizedProvider] || '')
  ai.api_key = draft ? String(draft.api_key || '') : ''
  ai.model = draft ? String(draft.model || '') : ''
  ai.endpoint_mode = draft ? (String(draft.endpoint_mode || 'auto').trim().toLowerCase() || 'auto') : 'auto'
  activeAiProvider.value = normalizedProvider
}

const clearTestResult = () => {
  testResponse.value = ''
  testRawResponse.value = null
}

const testModel = async () => {
  clearTestResult()
  const res = await aiStore.chatWithAI(testPrompt.value, props.formData.ai)
  testRawResponse.value = res?.raw ?? null
  if (res?.ok) {
    testResponse.value = res.text
    toast.success(t('settings.aiPanel.testSuccess'))
    return
  }
  if (res?.isEmpty) {
    testResponse.value = t('settings.aiPanel.emptyResponseMessage')
    toast.warning(t('settings.aiPanel.emptyResponseToast'))
    return
  }
  testResponse.value = res?.error || t('settings.aiPanel.testFailed')
  toast.error(res?.error || t('settings.aiPanel.testFailed'))
}

// CommonSelect 会先更新 v-model 再触发 change，因此这里显式保存“上一个协议”的草稿。
const handleProviderChange = (selectedProvider) => {
  const previousProvider = activeAiProvider.value || normalizeAiProvider(props.formData?.ai?.provider)
  syncAiProviderDraft(previousProvider)
  const nextProvider = normalizeAiProvider(selectedProvider?.value ?? selectedProvider ?? props.formData?.ai?.provider)
  applyAiDraftForProvider(nextProvider)
}

const fetchAiModels = async ({ forceRefresh = false, warnOnEmpty = false, silent = true } = {}) => {
  const ai = props.formData?.ai
  if (!ai?.provider || !ai.enabled) return
  await aiStore.getAiModels(ai, { forceRefresh, warnOnEmpty, silent })
}

watch(() => props.formData?.ai, async (ai) => {
  if (!ai) return
  // 设置面板每次重新灌入表单对象时，同步当前协议草稿并预热已有模型缓存。
  hydrateAiProviderDrafts()
  if (ai.enabled && ai.provider) {
    await fetchAiModels({ silent: true })
  }
}, { immediate: true })
</script>
