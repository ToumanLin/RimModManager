import { checkResult, normalizeText, toast } from '../../../shared/lib/common'
import { t } from '../../../app/i18n'

const PENDING_REASONING_CAPABILITIES = {
  supports_reasoning: false,
  supports_reasoning_effort: false,
  reasoning_mode_kind: 'pending',
  reasoning_options: [
    { value: 'off', label: t('common.disabled') },
    { value: 'auto', label: t('common.auto') },
  ],
  default_session_reasoning_mode: 'auto',
}

const UNSUPPORTED_REASONING_CAPABILITIES = {
  supports_reasoning: false,
  supports_reasoning_effort: false,
  reasoning_mode_kind: 'unsupported',
  reasoning_options: [
    { value: 'off', label: t('common.disabled') },
  ],
  default_session_reasoning_mode: 'off',
}

const DEFAULT_AI_BASE_URLS = {
  openai_compatible: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  ollama: 'http://127.0.0.1:11434',
}

const resolveAiProviderBaseUrl = (provider = '', baseUrl = '') => {
  const normalizedProvider = normalizeText(provider, 'openai_compatible').toLowerCase()
  const explicitBaseUrl = normalizeText(baseUrl).replace(/\/+$/, '')
  return explicitBaseUrl || DEFAULT_AI_BASE_URLS[normalizedProvider] || ''
}

const normalizeReasoningCapabilityResult = (payload = {}, fallback = UNSUPPORTED_REASONING_CAPABILITIES) => ({
  supports_reasoning: !!payload?.supports_reasoning,
  supports_reasoning_effort: !!payload?.supports_reasoning_effort,
  reasoning_mode_kind: normalizeText(payload?.reasoning_mode_kind, fallback.reasoning_mode_kind || 'unsupported'),
  reasoning_options: Array.isArray(payload?.reasoning_options) && payload.reasoning_options.length > 0
    ? payload.reasoning_options.map(item => ({
      value: normalizeText(item?.value),
      label: normalizeText(item?.label, normalizeText(item?.value)),
    })).filter(item => item.value)
    : [...(fallback.reasoning_options || [{ value: 'off', label: t('common.disabled') }])],
  default_session_reasoning_mode: normalizeText(
    payload?.default_session_reasoning_mode,
    fallback.default_session_reasoning_mode || 'off',
  ).toLowerCase(),
})

export const useModelConfigActions = ({
  isLoading,
  runtimeAiConfig,
  modelListCache,
  providerDefinitions,
  capabilityMeta,
} = {}) => {
  const buildAiModelCacheKey = (tempConfig = {}) => JSON.stringify({
    provider: normalizeText(tempConfig?.provider),
    base_url: resolveAiProviderBaseUrl(tempConfig?.provider, tempConfig?.base_url),
    api_key: normalizeText(tempConfig?.api_key),
  })

  const getAiConfig = async () => {
    if (!window.pywebview) return
    const res = await window.pywebview.api.ai_get_config()
    if (checkResult(res, t('aiStore.loadAiConfig'))) {
      runtimeAiConfig.value = res.data || null
      return res.data
    }
  }

  const saveAIConfig = async (configData) => {
    if (!window.pywebview) return
    const res = await window.pywebview.api.ai_save_config(configData)
    if (checkResult(res, t('aiStore.saveAiConfig'), true)) {
      return true
    }
  }

  const listAiProviders = () => providerDefinitions.value || []

  const getCachedAiModels = (tempConfig = {}) => {
    const cacheKey = buildAiModelCacheKey(tempConfig)
    const models = modelListCache[cacheKey]
    return Array.isArray(models) ? [...models] : []
  }

  const getCachedAiModelOptions = (tempConfig = {}) => (
    getCachedAiModels(tempConfig).map(model => ({ value: model, label: model }))
  )

  const getAiModels = async (tempConfig, { forceRefresh = false, warnOnEmpty = false, silent = false } = {}) => {
    if (!window.pywebview) return []
    if (!tempConfig || !tempConfig.provider) {
      return []
    }
    const cacheKey = buildAiModelCacheKey(tempConfig)
    if (!forceRefresh) {
      const cachedModels = getCachedAiModels(tempConfig)
      if (cachedModels.length > 0) {
        return cachedModels
      }
    }
    isLoading.value = true
    try {
      const res = await window.pywebview.api.ai_get_models(tempConfig)
      if (checkResult(res, t('aiStore.loadAiModels'), false, { silent })) {
        const models = Array.isArray(res.data) ? res.data.map(item => normalizeText(item)).filter(Boolean) : []
        modelListCache[cacheKey] = [...new Set(models)].sort((a, b) => a.localeCompare(b))
        if (warnOnEmpty && modelListCache[cacheKey].length === 0) {
          const provider = normalizeText(tempConfig?.provider, 'unknown')
          const baseUrl = resolveAiProviderBaseUrl(tempConfig?.provider, tempConfig?.base_url)
          toast.warning(t('aiStore.noModelListWarning', { provider, baseUrl }), { timeout: 8000 })
        }
        return getCachedAiModels(tempConfig)
      }
    } finally {
      isLoading.value = false
    }
    return getCachedAiModels(tempConfig)
  }

  const resolveAiModelCapabilities = (tempConfig = {}) => {
    const provider = normalizeText(tempConfig?.provider)
    const model = normalizeText(tempConfig?.model)
    const baseUrl = normalizeText(tempConfig?.base_url)
    if (!provider || !model) {
      return {
        provider,
        model,
        base_url: baseUrl,
        policy_name: '',
        ...PENDING_REASONING_CAPABILITIES,
      }
    }
    const meta = capabilityMeta.value || {}
    const providerScope = normalizeText(meta?.provider_scope, 'openai_compatible')
    const unsupported = normalizeReasoningCapabilityResult(meta?.unsupported, UNSUPPORTED_REASONING_CAPABILITIES)
    if (provider !== providerScope) {
      return {
        provider,
        model,
        base_url: baseUrl,
        policy_name: '',
        ...unsupported,
      }
    }
    const policies = Array.isArray(meta?.policies) ? meta.policies : []
    const matchedPolicy = policies.find((policy) => {
      const patterns = Array.isArray(policy?.matches) ? policy.matches : []
      return patterns.some((pattern) => {
        try {
          return new RegExp(String(pattern || ''), 'i').test(model)
        } catch {
          return false
        }
      })
    }) || null
    const resolved = matchedPolicy
      ? normalizeReasoningCapabilityResult(matchedPolicy, unsupported)
      : unsupported
    return {
      provider,
      model,
      base_url: baseUrl,
      policy_name: normalizeText(matchedPolicy?.name),
      requires_reasoning_replay: !!matchedPolicy?.requires_reasoning_replay,
      prefer_responses: !!matchedPolicy?.prefer_responses,
      ...resolved,
    }
  }

  const getAiModelCapabilities = async (tempConfig = {}) => resolveAiModelCapabilities(tempConfig)

  const chatWithAI = async (prompt, tempConfig) => {
    if (!window.pywebview) {
      return { ok: false, text: '', error: t('aiStore.uiNotInitialized'), isEmpty: false }
    }
    isLoading.value = true
    try {
      const res = await window.pywebview.api.ai_chat(prompt, tempConfig)
      if (checkResult(res, t('aiStore.testAiResponse'))) {
        const payload = res.data
        const text = typeof payload === 'string'
          ? payload
          : String(payload?.text ?? payload ?? '')
        return {
          ok: text.trim().length > 0,
          text,
          error: text.trim().length > 0 ? '' : t('aiStore.emptyModelResponse'),
          isEmpty: text.trim().length === 0,
          raw: payload,
        }
      }
      return {
        ok: false,
        text: '',
        error: String(res?.message || t('aiStore.aiRequestFailed')),
        isEmpty: false,
      }
    } catch (error) {
      console.error(t('aiStore.aiChatRequestError'), error)
      return {
        ok: false,
        text: '',
        error: error?.message || String(error),
        isEmpty: false,
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    // 配置
    getAiConfig, saveAIConfig, listAiProviders,
    // 模型列表
    getAiModels, getCachedAiModels, getCachedAiModelOptions,
    // 能力与测试
    resolveAiModelCapabilities, getAiModelCapabilities, chatWithAI,
  }
}
