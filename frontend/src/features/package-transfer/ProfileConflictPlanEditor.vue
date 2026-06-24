<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs font-bold uppercase tracking-wide text-text-dim">{{ t('packageTransfer.bulkHandling') }}</span>
      <label v-for="option in strategyOptions" :key="option.value" class="rounded-full flex items-center border px-2 py-1 text-xs"
        :class="strategy === option.value ? 'border-accent-primary/35 bg-accent-primary/10 text-accent-primary' : 'border-border-base/10 bg-bg-inset/55 text-text-dim'" >
        <input class="mr-1 accent-accent-primary" type="radio" :checked="strategy === option.value" @change="strategy = option.value" >
        {{ option.label }}
      </label>
    </div>

    <div v-for="row in rows" :key="row.archive_key" class="modal-section-subtle p-3" >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-sm font-bold text-text-main">{{ row.name || row.archive_key }}</div>
        <span class="text-[0.68rem] text-text-dim">
          {{ row.conflicts.length > 0 ? t('packageTransfer.localDuplicateProfilesFound', { count: row.conflicts.length }) : t('packageTransfer.noLocalDuplicateProfiles') }}
        </span>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-3">
        <div class="text-xs text-text-dim">
          <CommonSelect v-model="row.mode" :label="t('packageTransfer.handlingMode')" :options="buildModeOptions(row)" />
        </div>
        <div v-if="row.mode === 'overwrite'" class="col-span-2 text-xs text-text-dim">
          <CommonSelect v-model="row.target_profile_id" :label="t('packageTransfer.overwriteTo')" :options="buildConflictOptions(row)" />
        </div>

        <div v-else-if="row.mode === 'create'" class="col-span-2 text-xs text-text-dim">
          <CommonSelect v-model="row.game_install_path" :label="t('packageTransfer.gameDirectoryToUse')" :options="availableInstallOptions" />
        </div>

        <div v-else class="col-span-2 rounded-lg border border-border-base/10 bg-bg-inset/45 px-3 py-2 text-xs text-text-dim">
          {{ t('packageTransfer.thisItemWillBeSkipped') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CommonSelect from '../../shared/components/input/CommonSelect.vue'

const props = defineProps({
  rows: { type: Array, required: true },
  availableInstalls: { type: Array, default: () => [] },
})

const emit = defineEmits(['strategy'])
const { t } = useI18n()

const strategy = ref('per_item')

const strategyOptions = computed(() => [
  { value: 'overwrite_all', label: t('packageTransfer.overwriteAll') },
  { value: 'create_all', label: t('packageTransfer.createAll') },
  { value: 'skip_all', label: t('packageTransfer.skipAll') },
  { value: 'per_item', label: t('packageTransfer.perItem') },
])

const availableInstallOptions = computed(() => props.availableInstalls.map(item => ({
  value: String(item.install_path || ''),
  label: `${item.game_version || t('packageTransfer.unknownVersion')} | ${item.install_path || t('packageTransfer.unknownPath')}`,
})))

const buildModeOptions = (row) => [
  { value: 'create', label: t('packageTransfer.createProfile') },
  { value: 'overwrite', label: t('packageTransfer.overwriteExistingProfile') },
  { value: 'skip', label: t('packageTransfer.skip') },
].filter(option => option.value !== 'overwrite' || row.conflicts.length > 0)

const buildConflictOptions = (row) => [
  { value: '', label: t('packageTransfer.selectProfileToOverwrite') },
  ...(row.conflicts || []).map(item => ({
    value: String(item.profile_id || ''),
    label: `${item.name || t('packageTransfer.unnamedProfile')} | ${item.game_version || t('packageTransfer.unknownVersion')} | ${item.game_install_path || t('packageTransfer.noBoundGameDirectory')}`,
  })),
]

watch(strategy, (value) => emit('strategy', value))
</script>
