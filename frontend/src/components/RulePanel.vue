<template>
  <div class="flex h-[700px] w-[1000px] bg-bg-deep/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
    
    <!-- 1. 左侧导航栏 -->
    <div class="w-56 border-r border-white/5 bg-black/20 p-4 flex flex-col gap-2">
      <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2 px-2">
        <svg class="w-5 h-5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        规则中心
      </h2>
      
      <nav class="flex-1 space-y-1">
        <button v-for="tab in tabs" :key="tab.id" @click="currentTab = tab.id"
          :class="[currentTab === tab.id ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/30' : 'text-text-dim hover:bg-white/5 border-transparent']"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all duration-200">
          <component :is="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- 底部工具 -->
      <div class="pt-4 border-t border-white/5 space-y-2">
        <button @click="handleImport" class="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-text-dim transition-all">导入配置包</button>
        <button @click="handleExport" class="w-full py-2 rounded-lg bg-accent-primary/10 hover:bg-accent-primary/20 text-xs font-bold text-accent-primary transition-all">导出选中规则</button>
      </div>
    </div>

    <!-- 2. 右侧内容区 -->
    <div class="flex-1 flex flex-col min-w-0">
      
      <!-- 头部：搜索与新建 -->
      <header class="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-white/2">
        <div class="relative flex-1 max-w-md">
          <input v-model="search" placeholder="搜索规则名称或描述..." class="w-full bg-black/40 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white focus:border-accent-primary outline-none" />
        </div>
        <button v-if="currentTab === 'dynamic'" @click="createNewRule"
          class="ml-4 px-6 py-2 bg-accent-primary hover:bg-accent-primary/80 text-black text-xs font-bold rounded-full shadow-lg shadow-accent-primary/20 transition-all">
          + 新建群组规则
        </button>
      </header>

      <!-- 滚动区 -->
      <div class="flex-1 overflow-y-auto p-8">
        
        <!-- 动态规则列表 -->
        <div v-if="currentTab === 'dynamic'" class="space-y-4">
          <div v-for="rule in filteredDynamicRules" :key="rule.rule_id" 
            class="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-accent-primary/50 transition-all">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="font-bold text-white">{{ rule.name }}</h3>
                  <span class="px-2 py-0.5 rounded-md bg-black/40 text-[10px] text-accent-primary border border-white/10">优先级: {{ rule.priority }}</span>
                </div>
                <p class="text-xs text-text-dim line-clamp-1">{{ rule.description || '无描述' }}</p>
              </div>
              <div class="flex items-center gap-4">
                <!-- 开关 -->
                <button @click="toggleRule(rule)" :class="[rule.enabled ? 'bg-accent-primary' : 'bg-white/10']" class="w-10 h-5 rounded-full relative transition-colors">
                  <div :class="[rule.enabled ? 'translate-x-5' : 'translate-x-1']" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-transform"></div>
                </button>
                <!-- 动作 -->
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button @click="editRule(rule)" class="p-2 hover:bg-white/10 rounded-lg text-text-dim hover:text-white"><Edit2 class="w-4 h-4"/></button>
                  <button @click="deleteRule(rule)" class="p-2 hover:bg-red-500/20 rounded-lg text-text-dim hover:text-red-400"><Trash2 class="w-4 h-4"/></button>
                </div>
              </div>
            </div>
            <!-- 逻辑预览 -->
            <div class="mt-4 flex items-center gap-2 text-[11px] font-mono text-text-dim/60">
              <span class="text-accent-secondary">IF</span>
              <span>({{ rule.filters.length }} filters)</span>
              <span class="text-accent-primary">THEN</span>
              <span class="text-white">{{ rule.action.type }} ({{ rule.action.value }})</span>
            </div>
          </div>
        </div>

        <!-- 社区规则看板 (只读展示) -->
        <div v-if="currentTab === 'community'" class="space-y-6">
          <div class="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <h3 class="text-emerald-400 font-bold">RimSort 社区规则库</h3>
              <p class="text-xs text-emerald-400/60 mt-1">当前已载入 {{ communityCount }} 条社区维护的先后关系建议。</p>
            </div>
            <button @click="updateCommunity" class="px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-lg">手动更新库</button>
          </div>
          <!-- 搜索展示 -->
          <div class="grid grid-cols-1 gap-2">
             <!-- 此处可实现一个简单的社区规则查询器 -->
          </div>
        </div>

        <!-- 单项覆盖 -->
        <div v-if="currentTab === 'single'" class="space-y-2">
          <div v-for="(content, pid) in userModRules" :key="pid" 
            class="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
            <div class="flex items-center gap-4">
              <div class="w-8 h-8 rounded bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs uppercase">{{ pid[0] }}</div>
              <div>
                <div class="text-sm font-bold text-white">{{ pid }}</div>
                <div class="text-[10px] text-text-dim uppercase">手动设置了 {{ Object.keys(content).length }} 项约束</div>
              </div>
            </div>
            <button @click="deleteSingleRule(pid)" class="text-text-dim hover:text-red-400 p-2"><X class="w-4 h-4"/></button>
          </div>
        </div>

      </div>
    </div>

    <!-- 3. 动态规则编辑器 (Overlay Modal) -->
    <Transition name="fade">
      <div v-if="editingRule" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-20">
        <div class="w-full max-w-2xl bg-bg-surface border border-white/10 rounded-3xl shadow-3xl flex flex-col max-h-full">
           <header class="p-6 border-b border-white/5 flex justify-between items-center">
             <h2 class="text-lg font-bold text-white">编辑规则: {{ editingRule.name }}</h2>
             <button @click="editingRule = null"><X class="w-6 h-6"/></button>
           </header>
           
           <div class="flex-1 overflow-y-auto p-8 space-y-6">
             <!-- 基础信息 -->
             <div class="grid grid-cols-2 gap-4">
               <div class="space-y-2">
                 <label class="text-[10px] uppercase font-bold text-text-dim">规则名称</label>
                 <input v-model="editingRule.name" class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm" />
               </div>
               <div class="space-y-2">
                 <label class="text-[10px] uppercase font-bold text-text-dim">优先级 (数字越大越靠后应用)</label>
                 <input type="number" v-model.number="editingRule.priority" class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm" />
               </div>
             </div>

             <!-- 条件构建器 -->
             <div class="space-y-4">
               <div class="flex items-center justify-between">
                 <label class="text-[10px] uppercase font-bold text-text-dim">触发条件 ({{ editingRule.logic }})</label>
                 <button @click="addFilter" class="text-accent-primary text-xs">+ 添加条件</button>
               </div>
               <div v-for="(filter, idx) in editingRule.filters" :key="idx" class="flex gap-2 items-center bg-black/20 p-2 rounded-lg">
                 <select v-model="filter.field" class="bg-transparent text-xs outline-none w-24">
                   <option value="package_id">包ID</option>
                   <option value="author">作者</option>
                   <option value="tags">标签</option>
                   <option value="user_mod_type">分类</option>
                 </select>
                 <select v-model="filter.operator" class="bg-transparent text-xs outline-none w-24 text-accent-primary">
                   <option value="contains">包含</option>
                   <option value="equals">等于</option>
                   <option value="regex">正则</option>
                 </select>
                 <input v-model="filter.value" class="flex-1 bg-white/5 rounded px-2 py-1 text-xs outline-none" />
                 <button @click="editingRule.filters.splice(idx, 1)" class="text-red-400/50 hover:text-red-400"><Trash2 class="w-3 h-3"/></button>
               </div>
             </div>

             <!-- 动作设置 -->
             <div class="p-6 bg-accent-primary/5 border border-accent-primary/20 rounded-2xl space-y-4">
               <label class="text-[10px] uppercase font-bold text-accent-primary">执行动作</label>
               <div class="flex gap-4">
                 <select v-model="editingRule.action.type" class="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm flex-1">
                   <option value="weight_shift">权重偏移 (相对移动)</option>
                   <option value="weight_set">强制权重 (绝对位置)</option>
                   <option value="load_after">必须在某ID之后</option>
                   <option value="load_before">必须在某ID之前</option>
                   <option value="top">置顶</option>
                   <option value="bottom">置底</option>
                 </select>
                 <input v-if="editingRule.action.type !== 'top' && editingRule.action.type !== 'bottom'" 
                   v-model="editingRule.action.value" 
                   class="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm w-32" 
                   :placeholder="editingRule.action.type.includes('weight') ? '数字' : 'PackageID'" />
               </div>
             </div>
           </div>

           <footer class="p-6 border-t border-white/5 flex justify-end gap-3">
             <button @click="editingRule = null" class="px-6 py-2 rounded-xl hover:bg-white/5 text-sm font-bold text-text-dim">取消</button>
             <button @click="saveRule" class="px-8 py-2 bg-accent-primary text-black rounded-xl text-sm font-bold shadow-lg">保存规则</button>
           </footer>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Edit2, Trash2, X, Shield, User, Zap, Share2 } from 'lucide-vue-next'
import { useToast } from "vue-toastification"
import { useModStore } from '../stores/modStore'

const tabs = [
  { id: 'dynamic', label: '群组规则', icon: Zap },
  { id: 'single', label: '单项覆盖', icon: User },
  { id: 'community', label: '社区库', icon: Shield },
]


const toast = useToast()
const search = ref('')
const currentTab = ref('dynamic')
const modStore = useModStore()

// 核心数据状态
const allRules = ref({ 
  user_dynamic_rules: [], 
  user_mod_rules: {}, 
  community_rules_count: 0 
});

// 编辑状态
const editingRule = ref(null);

// 动态规则过滤与排序
const filteredDynamicRules = computed(() => {
  let rules = [...(allRules.value.user_dynamic_rules || [])];
  const query = search.value.toLowerCase().trim();
  if (query) {
    rules = rules.filter(rule => 
      rule.name.toLowerCase().includes(query) || 
      (rule.description && rule.description.toLowerCase().includes(query)) ||
      rule.filters.some(f => f.value.toLowerCase().includes(query))
    );
  }
  return rules.sort((a, b) => a.priority - b.priority);
});

// 社区规则数量
const communityCount = computed(() => allRules.value.community_rules_count);

// 单项规则列表
const userModRules = computed(() => allRules.value.user_mod_rules);

// --- 方法 ---

const fetchRules = async () => {
  if (!window.pywebview) return;
  try {
    const res = await window.pywebview.api.get_all_rules();
    if (res.status === 'success') {
      console.log("加载规则成功", res.data);
      allRules.value = res.data;
    }
  } catch (e) {
    console.error("加载规则失败", e);
  }
};

const createNewRule = () => {
  editingRule.value = {
    rule_id: 'rule_' + Date.now(),
    name: '',
    description: '',
    enabled: true,
    priority: 100,
    logic: 'AND',
    filters: [{ field: 'package_id', operator: 'contains', value: '' }],
    action: { type: 'weight_shift', value: 0 }
  };
};

const addFilter = () => {
  editingRule.value.filters.push({ field: 'package_id', operator: 'contains', value: '' });
};

const editRule = (rule) => {
  // 深拷贝，防止直接修改列表数据
  editingRule.value = JSON.parse(JSON.stringify(rule));
};

const saveRule = async () => {
  if (!editingRule.value.name) {
    toast.error("规则名称不能为空");
    return;
  }
  const res = await window.pywebview.api.rule_update_dynamic(editingRule.value);
  if (res.status === 'success') {
    toast.success("保存成功");
    editingRule.value = null;
    fetchRules();
  }
};

const deleteRule = async (rule) => {
  if (!confirm(`确定要删除规则 "${rule.name}" 吗？`)) return;
  const res = await window.pywebview.api.rule_delete_dynamic(rule.rule_id);
  if (res.status === 'success') {
    fetchRules();
  }
};

const toggleRule = async (rule) => {
  const res = await window.pywebview.api.rule_toggle_dynamic(rule.rule_id, !rule.enabled);
  if (res.status === 'success') {
    rule.enabled = !rule.enabled;
  }
};

const deleteSingleRule = async (pid) => {
  if (confirm(`确定要删除对 ${pid} 的手动覆盖规则吗？`)) {
    await window.pywebview.api.rule_delete_single(pid);
    fetchRules();
  }
};

// 导入导出
const handleExport = async () => {
  // 默认导出所有启用的动态规则 ID
  const ids = allRules.value.user_dynamic_rules
    .filter(r => r.enabled)
    .map(r => r.rule_id);
  await window.pywebview.api.rule_export_bundle(ids, modStore.settings.home_path);
};

const handleImport = async () => {
  const res = await window.pywebview.api.rule_import_bundle();
  if (res.status === 'success') {
    fetchRules();
  }
};

// 初始化
onMounted(fetchRules);
</script>