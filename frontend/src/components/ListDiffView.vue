<template>
  <div class="flex flex-col h-full bg-bg-surface/80 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
    
    <!-- 1. 顶部工具栏 -->
    <div class="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5 z-20 shrink-0">
      <!-- 图例 -->
      <div class="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded bg-accent-danger"></span>缺失</div>
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded bg-accent-success"></span>新增</div>
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded bg-accent-warn"></span>移动</div>
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded bg-yellow-100"></span>偏移</div>
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded bg-text-dim"></span>一致</div>
      </div>
      
      <!-- 开关组 -->
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-[10px] text-text-dim cursor-pointer hover:text-white transition-colors">
          <input type="checkbox" v-model="colorfulBlocks" class="rounded bg-white/10 border-white/20 text-accent-special focus:ring-0">
          多彩区块
        </label>
        <label class="flex items-center gap-2 text-[10px] text-text-dim cursor-pointer hover:text-white transition-colors">
          <input type="checkbox" v-model="hideIdentical" class="rounded bg-white/10 border-white/20 text-accent-primary focus:ring-0">
          折叠长区块
        </label>
      </div>
    </div>

    <!-- 2. 标题栏 -->
    <div class="flex items-center border-b border-white/5 bg-black/20 text-[10px] font-bold text-text-dim py-1 z-20 shrink-0">
      <div class="flex-1 px-2 text-center border-r border-white/5 truncate">{{ titleA }} ({{ listA.length }})</div>
      
      <div class="flex-1 px-2 text-center truncate">{{ titleB }} ({{ listB.length }})</div>
    </div>

    <!-- 3. 核心对比区 -->
    <div class="flex-1 overflow-y-auto custom-scrollbar relative w-full" ref="scrollContainer">
      <div class="flex min-h-full relative w-full">
        
        <!-- 左侧列表 (List A) -->
        <div class="flex-1 flex flex-col min-w-0" ref="listARef">
          <template v-for="item in displayListA" :key="item.uiKey">
            
            <!-- 普通项 -->
            <div v-if="!item.isPlaceholder" :data-id="item.id" @click="targetItem(item.id)"
                 class="flex items-center h-7 px-2 border-b border-x border-white/5 transition-colors relative cursor-pointer"
                 :style="{ backgroundColor: getBgColor(item) }"
            >
              <!-- 指示条 (仅在有色时显示) -->
              <div v-if="shouldShowIndicator(item)" 
                   class="absolute right-0 top-0 bottom-0 w-0.5" 
                   :style="{ backgroundColor: getRenderColor(item) }">
              </div>

              <span class="w-6 text-[9px] font-mono text-text-main text-right mr-2 select-none shrink-0 opacity-80">{{ item.originalIndex + 1 }}</span>
              
              <!-- 文字颜色逻辑 -->
              <div class="flex-1 truncate text-[11px] font-medium" 
                   :class="getTextClass(item)"
                   v-tooltip="displayNameById(item.id)">
                {{ displayNameById(item.id) }}
              </div>
            </div>

            <!-- 折叠项 -->
            <div v-else class="h-7 flex items-center justify-center border-b border-x border-white/5 select-none relative"
              :style="{ backgroundColor: getBgColor(item) }">
              <span class="absolute left-4 text-xl text-text-dim" style="writing-mode: vertical-rl;">···</span>
              <!-- 指示条也继承 -->
              <div v-if="shouldShowIndicator(item)" class="absolute right-0 w-0.5 h-full" 
                   :style="{ backgroundColor: getRenderColor(item) }">
              </div>
              <span class="text-[9px] text-text-dim/60 tracking-widest scale-90">
                ··· 已折叠{{ item.count }}项 ···
              </span>
            </div>

          </template>
        </div>

        <!-- 中间画布 (SVG) -->
        <div class="w-12 shrink-0 relative z-10 bg-black/20">
          <svg class="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
             <!-- 绘制区块 (fill) -->
             <path v-for="block in renderBlocks" :key="block.id"
               :d="block.path"
               :fill="block.renderColor"
               fill-opacity="0.15" 
               stroke="none"
               class="transition-all duration-300"
             />
             <!-- 绘制线条 (stroke) -->
             <path v-for="line in renderLines" :key="line.id"
               :d="line.path"
               fill="none"
               :stroke="line.renderColor"
               stroke-width="1.5"
               stroke-opacity="0.5"
             />
          </svg>
        </div>

        <!-- 右侧列表 (List B) -->
        <div class="flex-1 flex flex-col min-w-0" ref="listBRef">
          <template v-for="item in displayListB" :key="item.uiKey">
            
            <div v-if="!item.isPlaceholder" :data-id="item.id" class="flex items-center h-7 px-2 border-b border-x border-white/5 transition-colors relative"
                :style="{ backgroundColor: getBgColor(item) }">
              <div v-if="shouldShowIndicator(item)" 
                   class="absolute left-0 top-0 bottom-0 w-0.5" 
                   :style="{ backgroundColor: getRenderColor(item) }">
              </div>

              <span class="w-6 text-[9px] font-mono text-text-main text-right mr-2 select-none shrink-0 opacity-80">{{ item.originalIndex + 1 }}</span>
              
              <div class="flex-1 truncate text-[11px] font-medium"
                   :class="getTextClass(item)"
                   v-tooltip="displayNameById(item.id)">
                 {{ displayNameById(item.id) }}
              </div>
            </div>

            <div v-else class="h-7 flex items-center justify-center border-b border-x border-white/5 select-none relative"
              :style="{ backgroundColor: getBgColor(item) }">
              <span class="absolute left-4 text-xl text-text-dim" style="writing-mode: vertical-rl;">···</span>
              <!-- 指示条也继承 -->
              <div v-if="shouldShowIndicator(item)" class="absolute left-0 w-0.5 h-full" 
                   :style="{ backgroundColor: getRenderColor(item) }">
              </div>
              <span class="text-[9px] text-text-dim/60 tracking-widest scale-90">
                ··· 已折叠{{ item.count }}项 ···
              </span>
            </div>

          </template>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useModStore } from '../stores/modStore'
import { useDebounceFn } from '@vueuse/core'
import { getTailwindColorHex, hexToRgba } from '../utils/colorDeal'



const props = defineProps({
  listA: { type: Array, required: true },
  listB: { type: Array, required: true },
  titleA: { type: String, default: 'List A' },
  titleB: { type: String, default: 'List B' }
})

const store = useModStore()
const hideIdentical = ref(true)
const colorfulBlocks = ref(false) // 新增：开关多彩区块
const listARef = ref(null)
const listBRef = ref(null)
const scrollContainer = ref(null)

const renderBlocks = ref([])
const renderLines = ref([])

// --- 色彩常量 ---
const BLOCK_COLORS = [
  '#72c8a9', '#8cbbff', '#dcedc1', '#5596ff', '#ffe6a6', '#ffabab', '#8a6ab2', 
  '#ffdb4d', '#ffb300', '#a8e6cf', '#ff8f00', '#c6c9ff', '#ff677d', '#1e88e5'
]
const COLOR_REMOVED = getTailwindColorHex('accent-danger') 
const COLOR_ADDED = getTailwindColorHex('accent-success')   
const COLOR_MOVED = getTailwindColorHex('accent-warn') 
const COLOR_MOVED_GRAY = getTailwindColorHex('text-dim')

const displayNameById = (id) => store.displayModName(id)

// --- 1. 核心算法 ---

const analysis = computed(() => {
  const A = props.listA
  const B = props.listB
  
  // 初始化预处理
  const resA = A.map((id, i) => ({ id, originalIndex: i, type: 'removed', blockId: null, count: 1 }))
  const resB = B.map((id, i) => ({ id, originalIndex: i, type: 'added', blockId: null, count: 1 }))
  
  const mapB = new Map()
  B.forEach((id, i) => {
    if (!mapB.has(id)) mapB.set(id, [])
    mapB.get(id).push(i)
  })

  let blockCounter = 0
  const blocks = []

  let i = 0
  while (i < A.length) {
    const id = A[i]
    if (mapB.has(id)) {
      const possibleIndicesB = mapB.get(id)
      let bestLen = 0
      let bestStartB = -1

      for (const startB of possibleIndicesB) {
        let len = 0
        while (
          i + len < A.length && 
          startB + len < B.length && 
          A[i + len] === B[startB + len] &&
          resB[startB + len].type === 'added' 
        ) {
          len++
        }
        if (len > bestLen) {
          bestLen = len
          bestStartB = startB
        }
      }

      if (bestLen > 0) {
        const blockId = `blk-${blockCounter++}`
        const isMoved = i !== bestStartB
        // 预分配一个循环色，用于“多彩”模式
        const cyclicColor = BLOCK_COLORS[blockCounter % BLOCK_COLORS.length]
        
        blocks.push({
          id: blockId,
          cyclicColor, 
          isMoved,
          startIndexA: i,
          count: bestLen,
          startIndexB: bestStartB
        })

        // 更新 Item
        for (let k = 0; k < bestLen; k++) {
          const itemA = resA[i + k]
          const itemB = resB[bestStartB + k]
          
          itemA.type = isMoved ? 'moved' : 'same'
          itemA.blockId = blockId
          itemA.cyclicColor = cyclicColor // 记录原始多彩色
          itemA.count = bestLen // 记录所属块的大小，用于判断单移还是整移
          
          itemB.type = isMoved ? 'moved' : 'same'
          itemB.blockId = blockId
          itemB.cyclicColor = cyclicColor
          itemB.count = bestLen
        }
        
        i += bestLen
        continue
      }
    }
    i++
  }

  return { resA, resB, blocks }
})

// --- 2. 动态颜色计算逻辑 ---

// 计算最终显示的颜色 (用于背景、线条、指示条)
const getRenderColor = (itemOrBlock) => {
  if (itemOrBlock.type === 'removed') return COLOR_REMOVED
  if (itemOrBlock.type === 'added') return COLOR_ADDED
  if (itemOrBlock.type === 'same') return 'transparent'

  // Moved Logic
  if (itemOrBlock.type === 'moved' || itemOrBlock.isMoved) {
    // 1. 单独移动 (count === 1) -> 始终多彩
    if (itemOrBlock.count === 1) {
      if (colorfulBlocks.value) return itemOrBlock.cyclicColor
      else return COLOR_MOVED
    }
    // 2. 整体移动 (count > 1) -> 根据开关决定
    if (colorfulBlocks.value) return itemOrBlock.cyclicColor
    else return COLOR_MOVED_GRAY
  }
  return 'transparent'
}

// 计算背景色 (基于 RenderColor 加上透明度)
const getBgColor = (item) => {
  const color = getRenderColor(item)
  if (color === 'transparent') return 'transparent'
//   if (!color.startsWith('#')) {
    console.error(`Invalid color:`,item,color, COLOR_REMOVED)
//   }
  return hexToRgba(color, 0.2) // 统一 10% 透明度
}

// 计算文字样式类
const getTextClass = (item) => {
  if (item.type === 'removed') return 'text-accent-danger font-bold'
  if (item.type === 'added') return 'text-accent-success font-bold'
  if (item.type === 'same') return 'text-text-dim' // 灰色
  
  if (item.type === 'moved') {
    if (item.count === 1) return 'text-accent-warn font-bold' // 单移：橙色
    return 'text-yellow-100/70' // 整移：白黄色
  }
  return 'text-text-dim'
}

const shouldShowIndicator = (item) => {
  return item.type !== 'same' // 只有非 same 项显示左侧彩条
}


// --- 3. 折叠逻辑 ---

const foldList = (list) => {
  if (!hideIdentical.value) return list.map(item => ({ ...item, uiKey: item.id }))

  const result = []
  let blockItems = []

  const flushBlock = () => {
    if (blockItems.length === 0) return
    const firstItem = blockItems[0]
    
    // 折叠条件：类型是 same 或 moved，且长度 > 4
    if ((firstItem.type === 'same' || firstItem.type === 'moved') && blockItems.length > 4) {
      result.push({ ...blockItems[0], uiKey: blockItems[0].id }) // Head
      
      // 占位符继承属性以便正确染色
      result.push({ 
        isPlaceholder: true, 
        count: blockItems.length - 2,
        uiKey: `ph-${firstItem.blockId}`,
        // 继承用于颜色计算的关键属性
        type: firstItem.type,
        cyclicColor: firstItem.cyclicColor,
        count: firstItem.count // 这里的count是指block的总大小
      })
      
      result.push({ ...blockItems[blockItems.length-1], uiKey: blockItems[blockItems.length-1].id }) // Tail
    } else {
      blockItems.forEach(item => result.push({ ...item, uiKey: item.id }))
    }
    blockItems = []
  }

  // 这里的遍历逻辑需要改进，确保按blockId分组
  let currentBlockId = null
  
  for (const item of list) {
    // 只有同一 blockId 且 type 不是 added/removed (它们通常也是 blockId null) 
    // 其实 analysis 已经分配了 blockId 给 same 和 moved
    if (item.blockId && item.blockId === currentBlockId) {
      blockItems.push(item)
    } else {
      flushBlock()
      if (item.blockId) {
        currentBlockId = item.blockId
        blockItems.push(item)
      } else {
        currentBlockId = null
        result.push({ ...item, uiKey: item.id })
      }
    }
  }
  flushBlock()
  return result
}

const displayListA = computed(() => foldList(analysis.value.resA))
const displayListB = computed(() => foldList(analysis.value.resB))


// --- 4. 绘图逻辑 ---

const getCoords = (id, containerRef) => {
  if (!containerRef) return null
  const el = containerRef.querySelector(`[data-id="${id}"]`)
  if (!el) return null
  return {
    top: el.offsetTop,
    height: el.offsetHeight,
    mid: el.offsetTop + el.offsetHeight / 2
  }
}

const draw = () => {
  const blocks = []
  const lines = []
  const svgWidth = 48 

  analysis.value.blocks.forEach(blk => {
    // 只有移动的块需要画线/块，same 的不画（要求：不用染色）
    if (!blk.isMoved) return 

    // 获取坐标 (逻辑同前)
    const startIdA = analysis.value.resA[blk.startIndexA].id
    const endIdA = analysis.value.resA[blk.startIndexA + blk.count - 1].id
    const startIdB = analysis.value.resB[blk.startIndexB].id
    const endIdB = analysis.value.resB[blk.startIndexB + blk.count - 1].id

    const coordsStartA = getCoords(startIdA, listARef.value)
    const coordsEndA = getCoords(endIdA, listARef.value)
    const coordsStartB = getCoords(startIdB, listBRef.value)
    const coordsEndB = getCoords(endIdB, listBRef.value)

    if (!coordsStartA || !coordsEndA || !coordsStartB || !coordsEndB) return

    // 实时计算最终颜色
    const finalColor = getRenderColor(blk)

    // 控制点
    const cp1x = svgWidth * 0.4
    const cp2x = svgWidth * 0.6

    // 单独移动 (Count == 1) -> 画线
    if (blk.count === 1) {
      const amid = coordsStartA.mid
      const bmid = coordsStartB.mid
      lines.push({
        id: blk.id,
        path: `M 0 ${amid} C ${cp1x} ${amid}, ${cp2x} ${bmid}, ${svgWidth} ${bmid}`,
        renderColor: finalColor
      })
    } 
    // 整体移动 (Count > 1) -> 画块
    else {
      const ay1 = coordsStartA.top
      const ay2 = coordsEndA.top + coordsEndA.height
      const by1 = coordsStartB.top
      const by2 = coordsEndB.top + coordsEndB.height

      const path = `
        M 0 ${ay1} 
        C ${cp1x} ${ay1}, ${cp2x} ${by1}, ${svgWidth} ${by1}
        L ${svgWidth} ${by2}
        C ${cp2x} ${by2}, ${cp1x} ${ay2}, 0 ${ay2}
        Z
      `
      blocks.push({
        id: blk.id,
        path,
        renderColor: finalColor
      })
    }
  })

  renderBlocks.value = blocks
  renderLines.value = lines
}

const debouncedDraw = useDebounceFn(draw, 50)

// 监听开关，触发重绘
watch([() => props.listA, () => props.listB, hideIdentical, colorfulBlocks], () => {
  nextTick(debouncedDraw)
}, { deep: true, immediate: true })

let resizeObserver = null
onMounted(() => {
  if (scrollContainer.value) {
    resizeObserver = new ResizeObserver(() => debouncedDraw())
    resizeObserver.observe(scrollContainer.value)
  }
})
onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})


// 定位Mod位置
const targetItem = (mod_id) => {
  store.currentTargetId = mod_id
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  background-color: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
</style>