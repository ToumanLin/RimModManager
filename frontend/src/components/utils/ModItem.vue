<!-- ModItem.vue -->
<template>
  <div class="py-0.5 flex items-center gap-1" @mousedown.left="$emit('click-start', $event, item_id)" @click.stop="$emit('click-end', $event, item_id)"
    @click.right="handleContextMenu">
    <!-- 序号（通过位数计算动态调整字体大小） -->
    <!-- :style="{ fontSize: 18-(index+1).toString().length*3 + 'px' }" -->
    <div v-if="showIndex" class="w-6 h-6 min-w-6 min-h-6 flex items-center justify-center rounded"
      :class="[props.isSelected ? `text-text-main bg-accent-${listColor}/50` : `text-accent-${listColor}/50 bg-accent-${listColor}/10 hover:text-text-main hover:bg-accent-${listColor}/50`,
        `digits-${(index+1).toString().length}`]"
      @mouseenter="$emit('click-start', $event, item_id, true)">
      {{ index+1 }}
    </div>
    
    <!-- 内容区域 -->
    <div class="drag-handle flex-1 flex items-center min-w-0 gap-1.5 p-1 rounded-lg border hover:opacity-90 backdrop-blur-sm group shadow-sm text-text-main/80"
      :class="[searchMatch ? 'ring-2 ring-yellow-400 scale-[1.02] z-20' : '', getCardClass, simple ? 'h-[30px]' : 'h-[50px]']" 
      :style="getCardStyle(item_id)"
      v-preview="modData"
      @mouseenter="handleMouseEnter"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <!-- 图标 -->
      <div v-if="simple">
        <img v-if="!modData.is_missing && modData.thumb_url" :src="modData.thumb_url"
          :class="`w-5 h-5 rounded object-cover border border-accent-${listColor}/30 pointer-events-none`">
        <div v-else-if="modData.is_missing" class="w-5 h-5 rounded flex items-center justify-center text-red-500 font-bold text-lg bg-red-900/50 border border-red-500/30">!</div>
        <div v-else class="w-5 h-5 rounded border-2 border-dashed border-white/10 flex items-center justify-center">
          <svg class="w-3 h-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </div>
      </div>
      <div v-else>
        <img v-if="!modData.is_missing && modData.thumb_url" :src="modData.thumb_url"
          :class="`w-8 h-8 rounded object-cover border border-accent-${listColor}/30 pointer-events-none`">
        <div v-else-if="modData.is_missing" class="w-8 h-8 rounded flex items-center justify-center text-red-500 font-bold text-lg bg-red-900/50 border border-red-500/30">!</div>
        <div v-else class="w-8 h-8 rounded border-2 border-dashed border-white/10 flex items-center justify-center">
          <svg class="w-6 h-6 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </div>
      </div>
      

      <!-- 文字信息 -->
      <div class="flex-1 min-w-0 ">
        <!-- 别名 -->
        <div v-if="modData.alias_name && !simple" class="text-[10px] text-text-dim truncate font-mono ">
          {{ modData.name }}
        </div>
        <!-- 主名称 -->
        <div class="text-[13px] font-medium truncate">
          {{ modData.alias_name ? modData.alias_name : (modData.name ? modData.name : item_id) }}
        </div>
        <!-- 标签 -->
        <div class="overflow-hidden" style="box-shadow: inset 8px 0 10px -8px rgba(0, 0, 0, 0.3), inset -8px 0 10px -8px rgba(0, 0, 0, 0.3);">
          <div v-if="modData?.tags && modData.tags.length && !simple" class="flex gap-0.5 w-full overflow-y-hidden overflow-x-scroll custom-scrollbar mt-0.5 outline-none ">
              <span v-for="tag in modData.tags" :key="tag" class="min-w-fit font-mono px-0.5 py-0 my-0 rounded-md bg-accent-primary/10 text-accent-primary text-[10px] font-bold border border-accent-primary/10 drop-shadow-xl/25">
                {{ tag }}
              </span>
          </div>
        </div>
        
      </div>
      
      <!-- 缺失警告 -->
      <div v-if="issueState" :class="[`rounded-4xl cursor-help text-xs font-bold
        hover:scale-110  text-shadow-2xs text-shadow-black hover:shadow-bg-deep/50 transition-all`,
        issueState === 'error' ? 'text-accent-danger' : issueState === 'warn'? 'text-accent-warn':'text-accent-primary']"
        v-tooltip="issueTooltip">
        <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>
        </svg>
      </div>

      <!-- 颜色条 -->
      <div v-if="modGroups.length" class="w-1.5 -m-1 h-[-webkit-fill-available] relative">
        <div class="w-full absolute right-0 inset-y-0 flex flex-col scale-95">
          <div v-for="(g, index) in modGroups" :key="g.id" @click.prevent.stop="console.log(g)"
            :class="[`w-full flex-1 hover:scale-120 transition-all hover:border hover:border-white`,index===modGroups.length-1?'rounded-br-lg':'',index===0?'rounded-tr-lg':'']" 
            :style="{'backgroundColor': g.color}" v-tooltip="`分组：${g.name}`">
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useModStore } from '../../stores/modStore'
import { useContextMenuStore } from '../../stores/contextMenuStore'

const props = defineProps({
  item_id: { type: String, required: true },
  index: { type: Number, required: true },
  showIndex: { type: Boolean, default: true },
  simple: { type: Boolean, default: false },
  listColor: { type: String, default: 'primary'}, // 用于不同列表的颜色区分
  isSelected: { type: Boolean, default: false },
  isDragging: { type: Boolean, default: false }, // 用于外部控制样式
  searchMatch: { type: Boolean, default: false } // 是否是当前搜索焦点
})

defineEmits(['click-start', 'click-end'])

const store = useModStore()
const menuStore = useContextMenuStore()

// 使用 computed 缓存，只有当 id 变化时才重新获取对象
// 极大地减少了父组件重绘时的计算量
const modData = computed(() => store.takeModById(props.item_id))
const modGroups = computed(() => store.takeGroupsByModId(props.item_id))
// const modIcon = computed(() => store.getIconUrl(props.id))

// 构造提示文本
const issueTooltip = computed(() => {
    if (!issues.value) return null
    // 换行显示所有错误
    return issues.value.map(i => i.message).join('\n')
})

// 错误提示
const issueState = computed(() => store.getModIssueState(props.item_id))
const issues = computed(() => store.modIssues.get(props.item_id.toLowerCase()))
const getCardClass = computed(() => {
    const base = props.isSelected ? 'ring-1 ring-accent-success ' : ''
    if (issueState.value === 'error') return `${base} border-accent-danger/40 border bg-accent-danger/10 hover:bg-accent-danger/20`
    if (issueState.value === 'warn') return `${base} border-accent-warn/40 border bg-accent-warn/10 hover:bg-accent-warn/20`
    return `${base} bg-bg-surface border-white/10 hover:border-white/20 hover:bg-[#2d3a4f]` // 原有的选中样式
})

const getCardStyle = (id) => {
  const base = {'--drag-color': `var(--color-accent-${props.listColor})`}
  const color = store.takeModById(id).sign_color
  if (!color) return base
  base['--mod-color'] = hexToRgb(color)
  if(!issueState.value) { // 防止覆盖错误样式
    base['backgroundColor'] = `rgba(${hexToRgb(color)},0.1)`
  }
  base['borderColor'] = `rgba(${hexToRgb(color)},0.3)`
  base['color'] = color
  return base
}

// 颜色格式转换
const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return `0, 0, 0`; // 返回纯组件字符串
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  // 确保是六位
  if (cleanHex.length !== 6) {
    console.error(`Invalid hex color: ${hex}`);
    return `0, 0, 0`;
  }
  // 提取 R, G, B 分量，并从十六进制转换为十进制
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};



// 这两个函数目前没有实际用处，如果你有悬停效果或拖拽提示，可以实现它们
const handleMouseEnter = (e) => { 
};

const handleMouseMove = (e) => { 
};

const handleMouseLeave = (e) => { 
};

const handleContextMenu = (event) => {
  // console.log(issueState,issueState.value)
  const menuItems = [
    { label: '打开文件夹', action: () => openFolder() },
    { divider: true },
    { label: '删除', level: 'danger', action: () => deleteMod() },
  ]
  const currentIssues = store.modIssues.get(props.item_id.toLowerCase())
  // 如果有错误，添加忽略选项
  if (currentIssues && currentIssues.length > 0) {
      menuItems.push({ divider: true })
      // 子菜单列出所有错误
      menuItems.push({
          label: '忽略警告...',
          children: currentIssues.map(issue => ({
              label: `忽略问题：${store.ISSUE_TITLE_MAP[issue.type] || issue.type}`,
              level: issue.level,
              action: () => store.ignoreIssue(props.item_id, issue.key)
          }))
      })
  }
  // 如果已经忽略，添加启用提示
  if (modData.value.ignored_issues && modData.value.ignored_issues.length > 0) {
      menuItems.push({
          label: '启用警告',
          level: 'warn',
          action: () => store.ignoreIssue(props.item_id)
      })
  }
  menuStore.open(event, menuItems)
}

</script>

<style scoped>
.digits-1 { font-size: 18px; }
.digits-2 { font-size: 15px; }
.digits-3 { font-size: 12px; }
.digits-4 { font-size: 9px; }
.custom-scrollbar::-webkit-scrollbar {
  width: 0;
  height: 0;
  scroll-behavior: smooth;
}
</style>