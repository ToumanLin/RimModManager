import os
import json
import re
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from backend.utils.logger import logger
from backend.database.dao import ModDAO, GroupDAO

# 规则文件存放路径
RULES_DIR = Path("data/rules")
COMMUNITY_RULES_PATH = RULES_DIR / "communityRules.json"
USER_RULES_PATH = RULES_DIR / "user_rules.json"

class RuleActionType:
    WEIGHT_SET = "weight_set"       # 强制设置权重 (0-1000)
    WEIGHT_SHIFT = "weight_shift"   # 权重偏移 (如 -50)
    LOAD_AFTER = "load_after"       # 必须在某ID后
    LOAD_BEFORE = "load_before"     # 必须在某ID前
    TOP = "top"                     # 置顶 (权重设为0)
    BOTTOM = "bottom"               # 置底 (权重设为1000)

class RuleManager:
    def __init__(self):
        self.community_rules: Dict[str, Any] = {}
        self.user_mod_rules: Dict[str, Any] = {}
        self.user_dynamic_rules: List[Dict[str, Any]] = []
        # 确保目录存在
        RULES_DIR.mkdir(parents=True, exist_ok=True)
        self.load_all()

    # =========================================================================
    # 1. 数据加载与保存
    # =========================================================================

    def load_all(self):
        """核心：从磁盘加载所有规则数据"""
        try:
            # 加载社区规则
            if COMMUNITY_RULES_PATH.exists():
                with open(COMMUNITY_RULES_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.community_rules = data.get("rules", {})
            
            # 加载用户规则
            if USER_RULES_PATH.exists():
                with open(USER_RULES_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.user_mod_rules = data.get("mod_rules", {})
                    self.user_dynamic_rules = data.get("dynamic_rules", [])
        except Exception as e:
            logger.error(f"Failed to load rules: {e}")

    def save_user_rules(self):
        """持久化用户规则"""
        try:
            data = {
                "mod_rules": self.user_mod_rules,
                "dynamic_rules": self.user_dynamic_rules
            }
            with open(USER_RULES_PATH, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save user rules: {e}")

    # =========================================================================
    # 2. 匹配引擎 (The Engine)
    # =========================================================================

    def _match_condition(self, mod_data: dict, filter_item: dict) -> bool:
        """
        判断一个 Mod 是否满足某项过滤条件
        mod_data: 包含基础 Mod 信息和 UserModData 的合并字典
        """
        field = filter_item.get("field")
        op = filter_item.get("operator")
        target = str(filter_item.get("value", "")).lower()
        # 获取实际值，支持点分语法 (例如 metadata.author)
        actual = mod_data.get(field)

        if actual is None: return False
        
        # 预处理实际值
        if isinstance(actual, list):
            actual_strs = [str(i).lower() for i in actual]
        else:
            actual_strs = [str(actual).lower()]

        if op == "equals": return any(target == s for s in actual_strs)
        if op == "contains": return any(target in s for s in actual_strs)
        if op == "not_contains": return not any(target in s for s in actual_strs)
        if op == "starts_with": return any(s.startswith(target) for s in actual_strs)
        if op == "regex":
            return any(re.search(target, s, re.IGNORECASE) for s in actual_strs)
        return False

    def get_matching_dynamic_rules(self, mod_data: dict) -> List[dict]:
        """获取所有匹配该 Mod 的动态规则"""
        matched = []
        for rule in self.user_dynamic_rules:
            if not rule.get("enabled", True): continue
            logic = rule.get("logic", "AND")
            filters = rule.get("filters", [])
            if not filters: continue
            
            res = [self._match_condition(mod_data, f) for f in filters]
            is_match = all(res) if logic == "AND" else any(res)
            if is_match: matched.append(rule)
        return matched

    # =========================================================================
    # 1. 单项规则操作 (Single Mod Rules CRUD)
    # =========================================================================

    def update_single_mod_rule(self, package_id: str, rule_content: dict):
        """新增或修改某个具体 Mod 的先后/冲突规则"""
        pid = package_id.lower().strip()
        # rule_content 结构: {"loadAfter": {...}, "loadBefore": {...}, "incompatibleWith": {...}}
        self.user_mod_rules[pid] = rule_content
        self.save_user_rules()
        return True

    def delete_single_mod_rule(self, package_id: str):
        """删除某个 Mod 的所有自定义单项规则"""
        pid = package_id.lower().strip()
        if pid in self.user_mod_rules:
            del self.user_mod_rules[pid]
            self.save_user_rules()
        return True

    # =========================================================================
    # 2. 动态/群组规则操作 (Dynamic Rules CRUD)
    # =========================================================================

    def upsert_dynamic_rule(self, rule_obj: dict):
        """新增或更新动态规则"""
        rid = rule_obj.get('rule_id')
        if not rid: return False
        
        # 查找是否存在
        idx = next((i for i, r in enumerate(self.user_dynamic_rules) if r['rule_id'] == rid), -1)
        if idx > -1:
            self.user_dynamic_rules[idx] = rule_obj
        else:
            self.user_dynamic_rules.append(rule_obj)
            
        self.save_user_rules()
        return True

    def delete_dynamic_rule(self, rule_id: str):
        """物理删除动态规则"""
        self.user_dynamic_rules = [r for r in self.user_dynamic_rules if r['rule_id'] != rule_id]
        self.save_user_rules()
        return True

    def toggle_dynamic_rule(self, rule_id: str, enabled: bool):
        """仅切换启用状态"""
        for r in self.user_dynamic_rules:
            if r['rule_id'] == rule_id:
                r['enabled'] = enabled
                break
        self.save_user_rules()
        return True

    # =========================================================================
    # 3. 社区规则库管理
    # =========================================================================

    def overwrite_community_rules(self, raw_json: str):
        """更新/重写社区规则库"""
        try:
            data = json.loads(raw_json)
            # 简单校验
            if "rules" not in data: raise ValueError("Invalid community rules format")
            
            with open(COMMUNITY_RULES_PATH, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            
            self.load_all() # 重新载入内存
            return True
        except Exception as e:
            logger.error(f"Community update failed: {e}")
            raise e

    # =========================================================================
    # 4. 导出与导入 (Metadata Bundle Management)
    # =========================================================================

    def create_export_bundle(self, dynamic_rule_ids: List[str]) -> dict:
        """
        构造导出包：规则 + UserModData + Groups
        """
        # 1. 过滤要导出的动态规则
        export_dynamic = [r for r in self.user_dynamic_rules if r['rule_id'] in dynamic_rule_ids]
        
        # 2. 这里的策略是全量导出 UserModData 和 Groups，因为规则可能依赖这些环境
        bundle = {
            "version": "1.0",
            "export_date": datetime.datetime.now().isoformat(),
            "user_rules": {
                "mod_rules": self.user_mod_rules,
                "dynamic_rules": export_dynamic
            },
            "environment": {
                "user_mod_data": ModDAO.get_all_user_data(),
                "groups": GroupDAO.get_all_groups_structured()
            }
        }
        return bundle

    def process_import_bundle(self, bundle: dict, strategy: str = "merge"):
        """
        处理导入包
        strategy: 'merge' (合并冲突), 'overwrite' (规则全覆盖)
        """
        # 1. 规则导入
        rules = bundle.get("user_rules", {})
        if strategy == "overwrite":
            self.user_mod_rules = rules.get("mod_rules", {})
            self.user_dynamic_rules = rules.get("dynamic_rules", [])
        else:
            # 合并单项规则
            self.user_mod_rules.update(rules.get("mod_rules", {}))
            # 合并动态规则 (按 ID 去重)
            exist_ids = {r['rule_id'] for r in self.user_dynamic_rules}
            for r in rules.get("dynamic_rules", []):
                if r['rule_id'] not in exist_ids:
                    self.user_dynamic_rules.append(r)

        # 2. 环境数据处理 (UserModData & Groups)
        # 根据你之前的考量，这里我们采用“静默合并”：
        # - UserModData: 仅当本地记录不存在或为空时补充。
        # - Groups: 创建新组，若重名则合并 Mod 成员。
        env = bundle.get("environment", {})
        
        # 导入 UserModData
        for item in env.get("user_mod_data", []):
            pkg_id = item.get('package_id')
            # 构造更新字典，排除掉 Mod 基础属性，只保留用户定义的
            user_data_fields = {
                'alias_name': item.get('alias_name'),
                'notes': item.get('notes'),
                'tags': item.get('tags'),
                'sign_color': item.get('sign_color'),
                'user_mod_type': item.get('user_mod_type')
            }
            # 过滤掉 None 值，避免覆盖本地已有数据
            user_data_fields = {k: v for k, v in user_data_fields.items() if v is not None}
            if user_data_fields:
                ModDAO.update_user_data(pkg_id, user_data_fields)

        # 导入 Groups
        for g in env.get("groups", []):
            # 获取本地所有组名
            local_groups = GroupDAO.get_all_groups_structured()
            existing_g = next((lg for lg in local_groups if lg['name'] == g['name']), None)
            
            if existing_g:
                # 组名相同：合并 mod_ids 成员
                new_ids = list(set(existing_g['mod_ids'] + g.get('mod_ids', [])))
                GroupDAO.add_mods_to_group(existing_g['group_id'], new_ids)
            else:
                # 组名不同：新建组并添加成员
                new_g = GroupDAO.create_group(g['name'], g.get('color', '#ffffff'))
                GroupDAO.add_mods_to_group(new_g.group_id, g.get('mod_ids', []))

        self.save_user_rules()
        return True
    
    
    