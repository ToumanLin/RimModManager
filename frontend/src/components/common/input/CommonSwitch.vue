<!-- components/common/input/CommonSwitch.vue -->
<template>
  <div class="flex items-center justify-between p-2 input-glass">
    <div class="flex flex-col">
      <span class="text-xs font-bold text-white tracking-wide">{{ label }}</span>
      <span v-if="description" class="text-[10px] text-text-dim mt-0.5">{{ description }}</span>
    </div>

    <button @click="$emit('update:modelValue', !modelValue)"
      class="relative w-10 h-6 rounded-full transition-all duration-300 overflow-hidden border border-white/10"
      :class="modelValue ? 'bg-accent-primary/20 border-accent-primary/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-black/40'"
    >
      <!-- 滑块轨迹指示灯 -->
      <div class="absolute top-1 h-3.5 w-3.5 rounded-full transition-all duration-300 ease-out"
        :class="modelValue ? 'left-5 bg-accent-primary shadow-[0_0_8px_#06b6d4]' : 'left-1 bg-text-dim/40'">
      </div>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  description: String,
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const switchValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  }
})

</script>