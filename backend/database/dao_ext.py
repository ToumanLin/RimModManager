# backend/database/dao_ext.py
from playhouse.shortcuts import model_to_dict
from peewee import fn
from backend.database.models_ext import WorkshopMeta, ModReplacement

class ExtDAO:
    @staticmethod
    def get_workshop_id_by_package(package_id: str):
        """通过包名反查工坊 ID"""
        if not package_id: return None
        meta = WorkshopMeta.get_or_none(WorkshopMeta.package_id == package_id.lower())
        return meta.workshop_id if meta else None

    @staticmethod
    def get_replacement_suggestion(package_id: str, current_game_version: str):
        """获取替代建议"""
        rule = ModReplacement.get_or_none(ModReplacement.old_package_id == package_id.lower())
        if rule and current_game_version in rule.new_versions:
            return {
                "new_workshop_id": rule.new_workshop_id,
                "new_name": rule.new_name
            }
        return None
    
    @staticmethod
    def search_workshop(query: str, page: int = 1, page_size: int = 100):
        """外置数据分页搜索 (仅查找 Mod，排除合集)"""
        # 排除合集：合集通常没有 package_id，或者我们可以靠长度/内容判断
        q = WorkshopMeta.select(
            WorkshopMeta.workshop_id,
            WorkshopMeta.package_id,
            WorkshopMeta.name,
            WorkshopMeta.author,
            WorkshopMeta.preview_url,
            WorkshopMeta.time_updated
        ).where(
            (WorkshopMeta.package_id.is_null(False)) & 
            (WorkshopMeta.package_id != '')
        )

        if query:
            q = q.where(
                (WorkshopMeta.workshop_id.contains(query)) |
                (WorkshopMeta.package_id.contains(query.lower())) |
                (fn.LOWER(WorkshopMeta.name).contains(query.lower()))
            )
            
        # 排序：有搜索词时按匹配度（SQLite 默认顺序），无搜索词时按更新时间或名字
        if not query:
            q = q.order_by(WorkshopMeta.time_updated.desc())

        total = q.count()
        items = list(q.paginate(page, page_size).dicts())
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    
    
    @staticmethod
    def get_workshop_detail(workshop_id: str):
        """获取 Mod 的完整云端档案 (含详情、依赖、替代品)"""
        wid = str(workshop_id)
        meta = WorkshopMeta.get_or_none(WorkshopMeta.workshop_id == wid)
        replacement = ModReplacement.get_or_none(ModReplacement.old_workshop_id == wid)
        return {
            "meta": model_to_dict(meta) if meta else None,
            "replacement": model_to_dict(replacement) if replacement else None
        }
    
    @staticmethod
    def get_workshop_detail_extended(workshop_id: str):
        """获取 Mod 的完整云端档案及生态圈数据"""
        wid = str(workshop_id)
        meta = WorkshopMeta.get_or_none(WorkshopMeta.workshop_id == wid)
        if not meta: return None
        replacement = ModReplacement.get_or_none(ModReplacement.old_workshop_id == wid)
        # 1. 查找同作者的其他模组 (排除当前项，最多取 20 个)
        same_author = []
        if meta.author:
            author_query = WorkshopMeta.select(
                WorkshopMeta.workshop_id, WorkshopMeta.name, WorkshopMeta.preview_url
            ).where(
                (WorkshopMeta.author == meta.author) & 
                (WorkshopMeta.workshop_id != wid) &
                (WorkshopMeta.package_id.is_null(False)) & 
                (WorkshopMeta.package_id != '')
            ).limit(20).dicts()
            same_author = list(author_query)
        # 2. 查找反向依赖 (以当前 Mod 为前置的模组)
        # 因为 dependencies_mods 是 JSON 字符串 {"2891845502": "Name"}
        # 使用 contains 进行快速文本匹配
        dependents = []
        dep_query = WorkshopMeta.select(
            WorkshopMeta.workshop_id, WorkshopMeta.name, WorkshopMeta.preview_url
        ).where(
            # 强转为 text 绕过自定义字段的 db_value 序列化，防止双引号转义为`\\"`
            (WorkshopMeta.dependencies_mods.cast('text').contains(f'"{wid}"')) &
            (WorkshopMeta.package_id.is_null(False)) & 
            (WorkshopMeta.package_id != '')
        ).limit(20).dicts()
        dependents = list(dep_query)
        return {
            "meta": model_to_dict(meta),
            "replacement_mod": model_to_dict(replacement) if replacement else None,
            "same_author_mods": same_author,
            "dependents_mods": dependents
        }

    @staticmethod
    def get_workshop_details_by_package_ids(package_ids: list[str]):
        """批量获取包名对应的云端缓存信息（无网络请求，专门用于填充前端幽灵项）"""
        if not package_ids: return {}
        lower_ids = [pid.lower() for pid in package_ids]
        
        # 1. 查询基础信息
        metas = WorkshopMeta.select(
            WorkshopMeta.workshop_id, 
            WorkshopMeta.package_id,
            WorkshopMeta.name,
            WorkshopMeta.title,
            WorkshopMeta.author,
            WorkshopMeta.preview_url
        ).where(fn.LOWER(WorkshopMeta.package_id).in_(lower_ids)).dicts()
        
        meta_dict = { m['package_id'].lower(): m for m in metas if m.get('package_id') }
        
        # 2. 查询替代版本 (如果有替代，获取替代信息)
        replacements = ModReplacement.select(
            ModReplacement.old_package_id,
            ModReplacement.new_workshop_id,
            ModReplacement.new_name
        ).where(fn.LOWER(ModReplacement.old_package_id).in_(lower_ids)).dicts()
        
        rep_dict = { r['old_package_id'].lower(): r for r in replacements if r.get('old_package_id') }
        
        # 3. 如果有替代，尝试读取替代版本的 WorkshopMeta 来覆盖信息
        new_wids = [r['new_workshop_id'] for r in replacements if r.get('new_workshop_id')]
        rep_metas = {}
        if new_wids:
            rep_metas_query = WorkshopMeta.select(
                WorkshopMeta.workshop_id,
                WorkshopMeta.name,
                WorkshopMeta.title,
                WorkshopMeta.author,
                WorkshopMeta.preview_url
            ).where(WorkshopMeta.workshop_id.in_(new_wids)).dicts()
            rep_metas = { m['workshop_id']: m for m in rep_metas_query }
            
        result = {}
        for pid in lower_ids:
            data = meta_dict.get(pid)
            rep = rep_dict.get(pid)
            
            # 优先使用替代版本的数据
            if rep and rep.get('new_workshop_id'):
                new_wid = rep['new_workshop_id']
                new_meta = rep_metas.get(new_wid)
                if new_meta:
                    result[pid] = {
                        "package_id": pid,
                        "package_id_raw": pid,
                        "workshop_id": new_meta['workshop_id'],
                        "url": f"https://steamcommunity.com/sharedfiles/filedetails/?id={new_meta['workshop_id']}",
                        "name": new_meta.get('title') or new_meta.get('name') or rep.get('new_name'),
                        "author": [new_meta.get('author')],
                        "preview_url": new_meta.get('preview_url'),
                        "is_replacement_derived": True
                    }
                    continue
                else:
                    result[pid] = {
                        "package_id": pid,
                        "package_id_raw": pid,
                        "workshop_id": new_wid,
                        "url": f"https://steamcommunity.com/sharedfiles/filedetails/?id={new_wid}",
                        "name": rep.get('new_name'),
                        "is_replacement_derived": True
                    }
                    continue
            
            # 没有替代版本，使用自身数据
            if data:
                result[pid] = {
                    "package_id": pid,
                    "package_id_raw": pid,
                    "workshop_id": data['workshop_id'],
                    "url": f"https://steamcommunity.com/sharedfiles/filedetails/?id={data['workshop_id']}",
                    "name": data.get('title') or data.get('name'),
                    "author": [data.get('author')],
                    "preview_url": data.get('preview_url')
                }
        
                
        return result

