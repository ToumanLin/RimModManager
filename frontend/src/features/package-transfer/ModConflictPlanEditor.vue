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

    <div v-for="row in rows" :key="row.folder_name" class="modal-section-subtle p-3" >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-sm font-bold text-text-main">{{ row.folder_name }}</div>
        <div class="text-[0.68rem] text-text-dim">{{ row.existing_path }}</div>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-3">
        <div class="text-xs text-text-dim">
          <CommonSelect v-model="row.mode" :label="t('packageTransfer.handlingMode')" :options="modeOptions" />
        </div>
        <div v-if="row.mode === 'rename'" class="col-span-2 text-xs text-text-dim">
          <CommonInput v-model="row.rename_to" :label="t('packageTransfer.newFolderName')" :placeholder="t('packageTransfer.newFolderNamePlaceholder')" />
        </div>
        <div v-else class="col-span-2 rounded-lg border border-border-base/10 bg-bg-inset/45 px-3 py-2 text-xs text-text-dim">
          {{ row.mode === 'overwrite' ? t('packageTransfer.overwriteLocalFolderDesc') : t('packageTransfer.thisItemWillBeSkipped') }}
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CommonInput from '../../shared/components/input/CommonInput.vue'
import CommonSelect from '../../shared/components/input/CommonSelect.vue'

defineProps({
  rows: { type: Array, required: true },
})

const emit = defineEmits(['strategy'])
const { t } = useI18n()

const strategy = ref('per_item')

const strategyOptions = computed(() => [
  { value: 'overwrite_all', label: t('packageTransfer.replaceAll') },
  { value: 'skip_all', label: t('packageTransfer.skipAll') },
  { value: 'rename_all', label: t('packageTransfer.renameAll') },
  { value: 'per_item', label: t('packageTransfer.perItem') },
])

const modeOptions = computed(() => [
  { value: 'overwrite', label: t('packageTransfer.replaceOriginalFile') },
  { value: 'skip', label: t('packageTransfer.skip') },
  { value: 'rename', label: t('packageTransfer.saveAsNewFolder') },
])

watch(strategy, (value) => emit('strategy', value))
</script>
