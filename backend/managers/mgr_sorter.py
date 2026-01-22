from typing import List, Dict, Optional, Set, Tuple
import heapq
from collections import deque, defaultdict
from backend.database.dao import ModDAO
from backend.utils.logger import logger
from backend.managers.mgr_rules import RuleManager

class AtomicGroup:
    """原子组对象：联锁 Mod 的最小单位"""
    def __init__(self, mod_ids: List[str]):
        self.mod_ids = mod_ids  # 组内有序的 Mod ID 列表
        self.is_chain = len(mod_ids) > 1
        self.auto_activated = [] # 记录哪些是因联锁被强制补全的

    def __repr__(self):
        return f"<AtomicGroup chain={self.is_chain} ids={self.mod_ids}>"
class OrderSorter:
    def __init__(self):
        self.dao = ModDAO()
        self.rule_mgr = RuleManager()
        self.SPECIAL_WEIGHTS = {
            'brrainz.harmony': 0,
            'ludeon.rimworld': 50,
            'ludeon.rimworld.royalty': 51,
            'ludeon.rimworld.ideology': 52,
            'ludeon.rimworld.biotech': 53,
            'ludeon.rimworld.anomaly': 54,
            'unlimitedhugs.hugslib': 110,
        }

    def build_atomic_groups(self, active_ids: List[str]) -> List[AtomicGroup]:
        """
        第一步：将激活列表转化为原子组列表
        """
        # 1. 获取所有 Mod 的联锁数据
        # 注意：为了性能，我们一次性查出所有涉及到的 Mod 数据
        # 即使有的 Mod 不在 active_ids 里，只要它被联锁引用了，也要查
        all_mods_data = ModDAO.get_all_mods_with_user_data()
        mod_map = {m['package_id'].lower(): m for m in all_mods_data}
        active_set = set(id.lower() for id in active_ids)
        visited = set()
        atomic_groups = []

        # 辅助函数：深度优先搜索构建链条
        def trace_chain(current_id: str, current_chain: List[str], auto_activated: List[str]):
            if current_id in visited:
                return
            visited.add(current_id)
            # 如果当前 ID 不在激活列表中，记录为自动激活
            if current_id not in active_set:
                auto_activated.append(current_id)
            current_chain.append(current_id)
            mod_info = mod_map.get(current_id)
            if not mod_info:
                return
            # 寻找下一个
            next_id = mod_info.get('lock_next_mod')
            if next_id:
                next_id = next_id.lower()
                if next_id in mod_map and next_id not in visited:
                    # 检查回指逻辑：确保 B 的 previous 是 A，或者是 None
                    # 如果 B 的 previous 指向了别人，说明联锁数据矛盾
                    trace_chain(next_id, current_chain, auto_activated)
        
        # 2. 遍历所有激活项，从链条的“头”开始找起
        for mid in [id.lower() for id in active_ids]:
            if mid in visited:
                continue
            mod_info = mod_map.get(mid)
            if not mod_info:
                # 幽灵 Mod，单独成组
                atomic_groups.append(AtomicGroup([mid]))
                visited.add(mid)
                continue
            # 寻找链条的头部
            head_id = mid
            temp_visited = {head_id}
            while True:
                m_info = mod_map.get(head_id)
                prev_id = m_info.get('lock_previous_mod') if m_info else None
                if prev_id:
                    prev_id = prev_id.lower()
                    if prev_id in mod_map and prev_id not in temp_visited:
                        head_id = prev_id
                        temp_visited.add(head_id)
                    else: break
                else: break
            
            # 从头部开始构建完整链条
            chain = []
            auto_list = []
            trace_chain(head_id, chain, auto_list)
            group = AtomicGroup(chain)
            group.auto_activated = auto_list
            atomic_groups.append(group)

        return atomic_groups

    def calculate_mod_base_weight(self, mod_data: dict) -> int:
        """
        根据 Mod 数据计算单一 Mod 的基础权重
        """
        pkg_id = mod_data.get('package_id', '').lower().strip()
        # 1. 检查特殊硬编码 ID
        if pkg_id in self.SPECIAL_WEIGHTS:
            return self.SPECIAL_WEIGHTS[pkg_id]
        # 2. 根据作者判定 (官方作者)
        authors = mod_data.get('author', [])
        if 'Ludeon Studios' in authors:
            return 60
        # 3. 根据 Mod 类型判定 (来自 analyzer.py 的分析结果)
        mod_type = str(mod_data.get('user_mod_type') or mod_data.get('mod_type', 'Unknown')).strip()
        # if pkg_id == 'optimizer.zh':
        #     print(f"optimizer.zh 权重: {mod_type},{mod_data.get('mod_type', 'Unknown')}, mod_data: {mod_data}")
        if mod_type == 'LanguagePack':
            return 900  # 汉化包置底
        if mod_type == 'Texture':
            return 850  # 纹理包置后
        if mod_type == 'Audio':
            return 860  # 音频包置后
        # 4. 根据 ID 关键字模糊判定
        if '.lib' in pkg_id or 'library' in pkg_id:
            return 150
        if 'framework' in pkg_id:
            return 160
        # 5. 默认权重 (普通 Mod)
        return 500


    def _get_all_constraints(self, mid: str, mod_full_data: dict) -> List[Tuple[str, str, dict]]:
        """
        核心函数：获取一个 Mod 涉及的所有先后约束
        返回: [(target_id, type, source_info), ...]
        type: 'after' | 'before' | 'incompatible'
        """
        mid = mid.lower()
        constraints = []
        # 1. Native (About.xml)
        for p in mod_full_data.get('dependencies_mods', []):
            constraints.append((p['package_id'].lower(), 'after', {"name": "原生依赖", "type": "native"}))
        for p in mod_full_data.get('load_after_mods', []):
            constraints.append((p.lower(), 'after', {"name": "原生前置", "type": "native"}))
        for p in mod_full_data.get('load_before_mods', []):
            constraints.append((p.lower(), 'before', {"name": "原生后置", "type": "native"}))
        for p in mod_full_data.get('incompatible_mods', []):
            constraints.append((p.lower(), 'incompatible', {"name": "原生冲突", "type": "native"}))

        # 2. Community Rules (JSON)
        comm = self.rule_mgr.community_rules.get(mid, {})
        for target, info in comm.get("loadAfter", {}).items():
            constraints.append((target.lower(), 'after', {"name": "社区前置", "type": "community", "info": info}))
        for target, info in comm.get("loadBefore", {}).items():
            constraints.append((target.lower(), 'before', {"name": "社区后置", "type": "community", "info": info}))
        for target, info in comm.get("incompatibleWith", {}).items():
            constraints.append((target.lower(), 'incompatible', {"name": "社区冲突", "type": "community", "info": info}))

        # 3. User Single Rules
        user_s = self.rule_mgr.user_mod_rules.get(mid, {})
        for target, info in user_s.get("loadAfter", {}).items():
            constraints.append((target.lower(), 'after', {"name": "用户前置", "type": "user", "info": info}))
        for target, info in user_s.get("loadBefore", {}).items():
            constraints.append((target.lower(), 'before', {"name": "用户后置", "type": "user", "info": info}))
        for target, info in user_s.get("incompatibleWith", {}).items():
            constraints.append((target.lower(), 'incompatible', {"name": "用户冲突", "type": "user", "info": info}))

        # 4. User Dynamic Rules (仅处理明确的 LoadAfter/Before 动作)
        matched_dyn = self.rule_mgr.get_matching_dynamic_rules(mod_full_data)
        for rule in matched_dyn:
            act = rule.get("action", {})
            if act['type'] == 'load_after':
                constraints.append((act['value'].lower(), 'after', {"name": rule['name'], "type": "user_dynamic"}))
            elif act['type'] == 'load_before':
                constraints.append((act['value'].lower(), 'before', {"name": rule['name'], "type": "user_dynamic"}))

        return constraints


    def check_health(self, active_ids: List[str]) -> List[dict]:
        """
        【常态化提示核心】不排序，仅检查当前顺序是否违背任何规则
        """
        all_mods_data = ModDAO.get_all_mods_with_user_data()
        mod_map = {m['package_id'].lower(): m for m in all_mods_data}
        id_to_idx = {mid.lower(): i for i, mid in enumerate(active_ids)}
        active_set = set(id_to_idx.keys())
        
        issues = []
        for mid in active_ids:
            mid_l = mid.lower()
            m_data = mod_map.get(mid_l, {})
            rules = self._get_all_constraints(mid_l, m_data)
            
            for target_id, r_type, source in rules:
                if target_id not in active_set: continue
                t_idx = id_to_idx[target_id]
                m_idx = id_to_idx[mid_l]
                if r_type == 'after' and t_idx > m_idx:
                    issues.append({
                        "mod_id": mid, "type": "wrong_order", "level": "warn",
                        "message": f"排序错误：应位于 [[{target_id}]] 之后 ({source['name']})",
                        "target_id": target_id, "source": source
                    })
                elif r_type == 'before' and t_idx < m_idx:
                    issues.append({
                        "mod_id": mid, "type": "wrong_order", "level": "warn",
                        "message": f"排序错误：应位于 [[{target_id}]] 之前 ({source['name']})",
                        "target_id": target_id, "source": source
                    })
                elif r_type == 'incompatible':
                    issues.append({
                        "mod_id": mid, "type": "incompatible", "level": "error",
                        "message": f"模组冲突：与 [[{target_id}]] 不兼容 ({source['name']})",
                        "target_id": target_id, "source": source
                    })
        return issues

    def sort(self, active_ids: List[str]):
        """
        最终排序：原子组 -> 权重修正 -> 依赖构图 -> 权重传播 -> 拓扑排序
        """
        logger.info(f"Starting sort for {len(active_ids)} mods...")
        # 1. 初始化
        groups = self.build_atomic_groups(active_ids)
        all_mods_data = ModDAO.get_all_mods_with_user_data()
        mod_map = {m['package_id'].lower(): m for m in all_mods_data}
        mod_to_group = {mid: g for g in groups for mid in g.mod_ids}
        group_ids = [id(g) for g in groups]
        # 2. 计算初始权重 (包含动态规则偏移)
        group_weights = {}
        for g in groups:
            weights = []
            for mid in g.mod_ids:
                m_data = mod_map.get(mid, {})
                w = self.calculate_mod_base_weight(m_data)
                # 应用动态权重规则
                for rule in self.rule_mgr.get_matching_dynamic_rules(m_data):
                    act = rule.get("action", {})
                    if act['type'] == 'weight_shift': w += act['value']
                    elif act['type'] == 'weight_set': w = act['value']
                    elif act['type'] == 'top': w = 0
                    elif act['type'] == 'bottom': w = 1000
                weights.append(w)
            group_weights[id(g)] = min(weights) if weights else 500
        
        # 3. 构图
        adj = defaultdict(set)
        in_degree = {gid: 0 for gid in group_ids}
        warnings = []
        for g in groups:
            gid = id(g)
            for mid in g.mod_ids:
                constraints = self._get_all_constraints(mid, mod_map.get(mid, {}))
                for target_id, r_type, source in constraints:
                    if target_id not in mod_to_group: continue
                    target_gid = id(mod_to_group[target_id])
                    if target_gid == gid: continue # 组内联锁优先
                    
                    u, v = (target_gid, gid) if r_type == 'after' else (gid, target_gid)
                    if v not in adj[u]:
                        adj[u].add(v)
                        in_degree[v] += 1

        # 4. 权重传播 (Inherited Weight Propagation)
        effective_weights = group_weights.copy()
        changed = True
        while changed:
            changed = False
            for gid in group_ids:
                for child_gid in adj[gid]:
                    if effective_weights[child_gid] < effective_weights[gid]:
                        effective_weights[gid] = effective_weights[child_gid]
                        changed = True

        # 5. Kahn算法拓扑排序
        queue = []
        for gid in group_ids:
            if in_degree[gid] == 0:
                heapq.heappush(queue, (effective_weights[gid], gid))

        sorted_groups = []
        while queue:
            w, gid = heapq.heappop(queue)
            g = next(x for x in groups if id(x) == gid)
            sorted_groups.append(g)
            for neighbor in adj[gid]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    heapq.heappush(queue, (effective_weights[neighbor], neighbor))

        # 5. 环路处理 (Cycle Handling)
        if len(sorted_groups) < len(groups):
            # 发生了循环依赖，找出没被排进去的组
            sorted_group_ids = {id(g) for g in sorted_groups}
            remaining_groups = [g for g in groups if id(g) not in sorted_group_ids]
            
            warnings.append({
                "type": "cycle",
                "message": f"检测到 {len(remaining_groups)} 个组存在循环依赖，已强制排在末尾。",
                "affected_ids": [mid for rg in remaining_groups for mid in rg.mod_ids]
            })
            # 暴力破环：直接把剩下的按权重补在后面
            remaining_groups.sort(key=lambda x: group_weights[id(x)])
            sorted_groups.extend(remaining_groups)

        # 6. 生成最终列表
        final_list = []
        all_auto_activated = []
        for g in sorted_groups:
            final_list.extend(g.mod_ids)
            all_auto_activated.extend(g.auto_activated)

        return {
            "sorted_ids": final_list,
            "auto_activated": all_auto_activated,
            "warnings": warnings
        }
    
