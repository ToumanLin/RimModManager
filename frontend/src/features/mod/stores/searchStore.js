import { defineStore } from 'pinia'
import { shallowRef, watch } from 'vue'
import { useModStore } from './modStore'
import { TagSearchEngine, TAG_FIELD_TYPES } from '../../../shared/components/tag-search/tagSearchEngine'
import { MOD_SIGN_COLOR_MAP } from '../../../shared/lib/constants'
import { useAppStore } from '../../../app/stores/appStore'
import { t } from '../../../app/i18n'

export const useSearchStore = defineStore('search', () => {
  const modStore = useModStore()
  const appStore = useAppStore()
  const STORE_MAP = {
    local: () => t('searchStore.local'),
    self: () => t('searchStore.manager'),
    workshop: () => t('searchStore.workshop'),
  }

  // 统一声明 Mod 列表可搜索字段。这里只放用户能理解、且适合 key:value 检索的字段；
  // 路径、描述、规则等长文本不进入语法字段，避免建议列表变脏、搜索结果难解释。
  const searchSchema = {
    // 基础信息
    name: { type: TAG_FIELD_TYPES.STRING, defaultSearch: true, label: t('searchStore.name') },
    alias_name: { type: TAG_FIELD_TYPES.STRING, defaultSearch: true, label: t('searchStore.alias') },
    author: { type: TAG_FIELD_TYPES.STRING, suggest: true, defaultSearch: true, label: t('searchStore.author') },
    package_id: { type: TAG_FIELD_TYPES.STRING, label: t('searchStore.packageId') },
    workshop_id: { type: TAG_FIELD_TYPES.STRING, label: t('searchStore.workshopId') },

    // 用户标记
    sign_color: {
      type: TAG_FIELD_TYPES.STRING,
      suggest: true,
      label: t('searchStore.color'),
      label_getter: (color) => MOD_SIGN_COLOR_MAP[color] || color || t('common.none'),
      color_getter: (color) => color || 'var(--color-text-main)',
    },
    tags: { type: TAG_FIELD_TYPES.LIST, suggest: true, label: t('searchStore.tags') },
    groups: { type: TAG_FIELD_TYPES.LIST, suggest: true, label: t('searchStore.groups') },

    // 来源与类型
    mod_type: {
      type: TAG_FIELD_TYPES.STRING,
      suggest: true,
      label: t('searchStore.type'),
      getter: (mod) => modStore.displayModType(mod)
    },
    source: {
      type: TAG_FIELD_TYPES.STRING,
      suggest: true,
      label: t('searchStore.source'),
    },
    store: {
      type: TAG_FIELD_TYPES.STRING,
      suggest: true,
      label: t('searchStore.location'),
      label_getter: (store) => STORE_MAP[store]?.() || t('common.unknown')
    },

    // 支持信息
    supported_versions: { type: TAG_FIELD_TYPES.LIST, suggest: true, label: t('searchStore.supportedVersions') },
    supported_languages: { type: TAG_FIELD_TYPES.LIST, suggest: true, label: t('searchStore.supportedLanguages') },
    ignored_issues: { type: TAG_FIELD_TYPES.LIST, suggest: true, label: t('searchStore.ignoredIssues') },

    // 状态判断
    last_active: {
      type: TAG_FIELD_TYPES.BOOLEAN,
      label: t('searchStore.recentlyEnabled'),
      getter: (mod) => mod.last_active_time > appStore.settings.last_run_time
    },
    coexist_variant: {
      type: TAG_FIELD_TYPES.BOOLEAN,
      label: t('searchStore.hasCoexistence'),
      getter: (mod) => !!mod.coexist_workshop_variant
    },
    shadow_paths: { type: TAG_FIELD_TYPES.BOOLEAN, label: t('searchStore.hasDisabledCopy') },
    replacement: { type: TAG_FIELD_TYPES.BOOLEAN, label: t('searchStore.hasReplacement') },
    save_breaking: { type: TAG_FIELD_TYPES.BOOLEAN, label: t('searchStore.saveBreaking') },
  }

  // 引擎内部持有 Map/Set 索引，只需要在重建时替换实例，不需要深层响应式代理。
  const engine = shallowRef(null)

  const rebuildEngine = () => {
    const allMods = Array.from(modStore.allModsMap.values())

    // Mod 列表的两个搜索框共用同一个索引；数据版本变化时重建，输入变化时只执行匹配。
    engine.value = new TagSearchEngine(allMods, {
      schema: searchSchema,
      autoDetect: false,
      excludeFields: [
        // 这些规则主要保护未来误开 autoDetect 时不会暴露内部字段；当前显式 schema 不受影响。
        /mods?$/i, /stats?$/i, /time$/i,
        /urls?$/i, /paths?$/i, /colors?$/i,
        'description', 'descriptions_by_version', 'notes',
        'version', 'id', 'mod_id', 'path_hash', 'rules', 'disabled',
        'package_id_raw', 'language_pack_owner_result', 'file_size',
      ],
    })
  }

  watch(() => modStore.dataVersion, () => {
    rebuildEngine()
  }, { immediate: true })

  return {
    // 搜索引擎
    engine, rebuildEngine,
  }
})
