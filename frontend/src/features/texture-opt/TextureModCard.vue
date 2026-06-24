<template>
  <div class="group flex min-h-24 flex-col justify-between rounded-lg border border-border-base/2 px-3 py-2 transition-colors hover:bg-bg-overlay/5"
    @contextmenu.prevent="emit('open-mod-menu', $event, mod)">
    <div class="flex min-w-0 items-center justify-between gap-4">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <span class="truncate text-sm font-bold text-text-main">{{ mod.mod_name }}</span>
        <span v-if="storeLabel" class="shrink-0 rounded border border-border-base/10 bg-bg-overlay/5 px-1.5 py-0.5 text-xs font-bold text-text-dim">
          {{ storeLabel }}
        </span>
        <span v-if="mod.unsupported_source_count > 0" v-tooltip="unsupportedTooltip"
          class="shrink-0 rounded border border-accent-warning/20 bg-accent-warning/10 px-1.5 py-0.5 text-xs font-bold text-accent-warning">
          {{ t('textureOpt.invalidPng') }} {{ mod.unsupported_source_count }}
        </span>
        <span v-for="tag in scaleTags" :key="`${tag.kind}-${tag.label}`" v-tooltip="tag.tooltip"
          class="shrink-0 rounded border px-1.5 py-0.5 text-xs font-bold" :class="tag.className" >
          {{ tag.text }}
        </span>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <div class="text-right text-xs font-mono text-text-dim">
          <span>{{ t('textureOpt.pending') }} {{ mod.generate_required_count || 0 }}</span>
          <span class="mx-2 opacity-40">|</span>
          <span>{{ t('textureOpt.existingDds') }} {{ mod.dds_output_count || 0 }}</span>
          <span v-if="mod.zstd_output_count" class="mx-2 opacity-40">|</span>
          <span v-if="mod.zstd_output_count">ZSTD {{ mod.zstd_output_count }}</span>
        </div>
        <button v-if="mod.package_id" class="rounded-lg border px-1 py-0.5 text-xs font-bold transition-colors"
          :class="isExcluded ? 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger' : 'border-border-base/10 bg-bg-overlay/5 text-text-dim hover:text-text-main'"
          @click.stop="emit('toggle-mod-exclusion', mod)" >
          {{ isExcluded ? t('textureOpt.excluded') : t('textureOpt.excludeMod') }}
        </button>
        <button class="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-bg-overlay/10 hover:text-text-main"
          @click.stop="emit('open-mod-menu', $event, mod)" v-tooltip="t('textureOpt.modTextureActions')">
          <MoreVertical class="w-4 h-4" />
        </button>
        <button class="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-bg-overlay/10 hover:text-text-main"
          @click.stop="openModPath" v-tooltip="mod.mod_path || t('textureOpt.openModPath')" >
          <FolderOpen class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="my-1 space-y-1 text-xs">
      <div v-show="viewMode === 'ALL' || viewMode === 'PNG'" class="grid grid-cols-[2rem_minmax(0,1fr)_3rem] items-center gap-2">
        <div class="font-bold text-accent-tip/80">PNG</div>
        <div class="relative h-1.5 overflow-hidden rounded-full bg-bg-inset/80">
          <div class="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-accent-tip/60 to-accent-tip transition-all duration-500 ease-out" :style="{ width: pngWidth }"></div>
        </div>
        <div class="text-right font-mono text-text-dim">{{ formatPercent(mod.source_bytes_share_pct || 0) }}</div>
      </div>

      <div v-show="viewMode === 'ALL' || viewMode === 'DDS'" class="grid grid-cols-[2rem_minmax(0,1fr)_3rem] items-center gap-2">
        <div class="font-bold text-accent-primary/80">DDS</div>
        <div class="relative h-1.5 overflow-hidden rounded-full bg-bg-inset/80">
          <div class="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-accent-primary/60 to-accent-primary transition-all duration-500 ease-out" :style="{ width: ddsWidth }"></div>
        </div>
        <div class="text-right font-mono text-text-dim">{{ formatPercent(mod.dds_output_bytes_share_pct || 0) }}</div>
      </div>

      <div v-show="viewMode === 'ALL' || viewMode === 'ZSTD'" class="grid grid-cols-[2rem_minmax(0,1fr)_3rem] items-center gap-2">
        <div class="font-bold text-accent-secondary/80">ZSTD</div>
        <div class="relative h-1.5 overflow-hidden rounded-full bg-bg-inset/80">
          <div class="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-accent-secondary/60 to-accent-secondary transition-all duration-500 ease-out" :style="{ width: zstdWidth }"></div>
        </div>
        <div class="text-right font-mono text-text-dim">{{ formatPercent(mod.zstd_output_bytes_share_pct || 0) }}</div>
      </div>
    </div>


    <div class="grid grid-cols-4 items-center gap-x-4 text-xs text-text-dim">
      <div class="truncate"><span class="font-bold text-text-main">PNG</span> {{ formatBytes(mod.source_total_bytes) }} / {{ t('textureOpt.imageCount', { count: mod.source_total_count || 0 }) }}</div>
      <div class="truncate">
        <span class="font-bold text-text-main">DDS</span> {{ formatBytes(mod.dds_output_bytes) }} / {{ t('textureOpt.imageCount', { count: mod.dds_output_count || 0 }) }}
        <span v-if="mod.zstd_output_count" class="ml-2"><span class="font-bold text-text-main">ZSTD</span> {{ formatBytes(mod.zstd_output_bytes) }} / {{ t('textureOpt.imageCount', { count: mod.zstd_output_count }) }}</span>
      </div>
      <div class="truncate"><span class="font-bold text-text-main">{{ t('textureOpt.combinedSizeShare') }}</span> {{ formatPercent(mod.combined_bytes_share_pct || 0) }}</div>
      <div class="truncate"><span class="font-bold text-text-main">{{ t('textureOpt.vramEstimate') }}</span> {{ formatBytes(mod.source_vram_bytes_est) }} → {{ formatBytes(mod.output_vram_bytes_est) }}</div>
    </div>
    <div class="truncate text-[0.8rem] text-text-subtle">{{ mod.mod_path }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FolderOpen, MoreVertical } from 'lucide-vue-next'
import { useAppStore } from '../../app/stores/appStore'
import { STORE_TYPE_MAP } from '../../shared/lib/constants'

const props = defineProps({
  mod: { type: Object, required: true },
  viewMode: { type: String, default: 'ALL' },
  maxBytes: { type: Number, default: 1 },
  isExcluded: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-mod-exclusion', 'open-mod-menu'])

const appStore = useAppStore()
const { t } = useI18n()

const unsupportedTooltip = computed(() => {
  const preview = Array.isArray(props.mod?.engine_unsupported_preview) ? props.mod.engine_unsupported_preview : []
  if (!preview.length) {
    return t('textureOpt.invalidPngTooltip')
  }
  return [
    t('textureOpt.invalidPngListTitle'),
    ...preview.map(item => `${item.rel_path}${item.reason ? ` - ${item.reason}` : ''}`),
  ].join('\n')
})

const storeLabel = computed(() => {
  const store = String(props.mod?.store || '').trim().toLowerCase()
  if (store in STORE_TYPE_MAP) {
    return STORE_TYPE_MAP[store]
  }
  return store ? store : ''
})

const scaleTags = computed(() => {
  const breakdown = Array.isArray(props.mod?.scale_breakdown) ? props.mod.scale_breakdown : []
  return breakdown
    .filter(item => Number(item?.count || 0) > 0)
    .map(item => {
      const kind = String(item?.kind || 'keep_original')
      const label = String(item?.label || t('textureOpt.originalSize'))
      const count = Number(item?.count || 0)
      if (kind === 'fallback') {
        return {
          kind,
          label,
          text: t('textureOpt.fallbackTag', { label, count }),
          tooltip: t('textureOpt.fallbackTagTooltip', { label }),
          className: 'border-accent-secondary/20 bg-accent-secondary/10 text-accent-secondary',
        }
      }
      if (kind === 'scaled') {
        return {
          kind,
          label,
          text: t('textureOpt.scaledTag', { label, count }),
          tooltip: t('textureOpt.scaledTagTooltip', { label }),
          className: 'border-accent-tip/20 bg-accent-tip/10 text-accent-tip',
        }
      }
      return {
        kind,
        label,
        text: t('textureOpt.noScaleTag', { count }),
        tooltip: t('textureOpt.noScaleTagTooltip'),
        className: 'border-border-base/10 bg-bg-overlay/5 text-text-dim',
      }
    })
})

const formatBytes = (bytes) => {
  const value = Number(bytes || 0)
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  const precision = size >= 100 || index === 0 ? 0 : size >= 10 ? 1 : 2
  return `${size.toFixed(precision)} ${units[index]}`
}

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`

const pngWidth = computed(() => {
  const percent = (Number(props.mod.source_total_bytes || 0) / Number(props.maxBytes || 1)) * 100
  return `${Math.min(100, Math.max(0.5, percent))}%`
})

const ddsWidth = computed(() => {
  const percent = (Number(props.mod.dds_output_bytes || 0) / Number(props.maxBytes || 1)) * 100
  return `${Math.min(100, Math.max(0.5, percent))}%`
})

const zstdWidth = computed(() => {
  const percent = (Number(props.mod.zstd_output_bytes || 0) / Number(props.maxBytes || 1)) * 100
  return `${Math.min(100, Math.max(0.5, percent))}%`
})

const openModPath = async () => {
  if (!props.mod?.mod_path) return
  await appStore.openPath(props.mod.mod_path)
}
</script>
