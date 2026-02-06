# backend/managers/mgr_steam_history.py
import os
import re
import datetime
import platform
import requests
import json
from typing import List, Dict, Any

from backend.settings import settings
from backend.utils.logger import logger

class SteamHistoryManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SteamHistoryManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        self.rimworld_appid = "294100"
        
    def get_steam_log_path(self):
        """
        推断 Steam 客户端日志路径
        通常在 Steam 安装目录/logs/workshop_log.txt
        """
        # 尝试从游戏安装目录反推 Steam 目录
        # 典型路径: .../Steam/steamapps/common/RimWorld -> .../Steam/logs
        if not settings.config.game_install_path:
            return None
            
        try:
            # 向上找 3 层: RimWorld -> common -> steamapps -> Steam
            steam_root = os.path.abspath(os.path.join(settings.config.game_install_path, "../../.."))
            log_dir = os.path.join(steam_root, "logs")
            log_file = os.path.join(log_dir, "workshop_log.txt")
            
            if os.path.exists(log_file):
                return log_file
            
            # 如果反推失败，尝试默认路径 (Windows)
            if platform.system() == "Windows":
                default_path = r"C:\Program Files (x86)\Steam\logs\workshop_log.txt"
                if os.path.exists(default_path):
                    return default_path
        except:
            pass
        return None

    def get_acf_path(self):
        """
        获取 RimWorld 创意工坊清单文件 (appworkshop_294100.acf)
        记录了本地已安装模组的最新状态
        """
        if not settings.config.workshop_mods_path:
            return None
        
        # workshop_path 通常是 .../steamapps/workshop/content/294100
        # acf 通常在 .../steamapps/workshop/appworkshop_294100.acf
        try:
            workshop_root = os.path.dirname(os.path.dirname(settings.config.workshop_mods_path))
            acf_file = os.path.join(workshop_root, f"appworkshop_{self.rimworld_appid}.acf")
            if os.path.exists(acf_file):
                return acf_file
        except:
            pass
        return None

    # =========================================================
    #  1. 解析 Steam 客户端日志 (获取本地下载/更新时间)
    # =========================================================
    
    def parse_local_download_history(self, mod_id: str = None) -> List[Dict]: # type: ignore
        """
        解析 workshop_log.txt 获取下载历史
        :param mod_id: 如果提供，只返回该 Mod 的记录
        """
        log_path = self.get_steam_log_path()
        if not log_path:
            logger.warning("Steam workshop_log.txt not found.")
            return []

        history = []
        # 正则匹配示例: 
        # [2023-10-27 10:00:00] [AppID 294100] Download complete: 123456789
        # 注意：日志格式可能随 Steam 版本微调，以下通过匹配关键字段提取
        
        # 匹配时间戳和操作
        # 格式通常是: [YYYY-MM-DD HH:MM:SS] ...
        line_pattern = re.compile(r'^\[(.*?)\] (.*)')
        
        try:
            with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                # 倒序读取，获取最新的记录
                lines = f.readlines()
                for line in reversed(lines):
                    match = line_pattern.match(line)
                    if not match: continue
                    
                    timestamp_str = match.group(1)
                    content = match.group(2)
                    
                    # 过滤只看 RimWorld (294100)
                    if self.rimworld_appid not in content:
                        continue
                        
                    # 提取 Mod ID
                    # 常见日志: "Download complete: 818773962" 或 "Update complete"
                    # 我们寻找包含 Mod ID 的行
                    id_match = re.search(r'\b(\d{9,10})\b', content)
                    if not id_match: continue
                    
                    found_id = id_match.group(1)
                    
                    if mod_id and found_id != str(mod_id):
                        continue

                    # 判定操作类型
                    action = "Unknown"
                    if "Download complete" in content:
                        action = "Downloaded"
                    elif "Update complete" in content or "downloading" in content.lower():
                        action = "Updated"
                    elif "Download started" in content:
                        action = "Started"
                    else:
                        continue # 忽略不重要的行

                    history.append({
                        "mod_id": found_id,
                        "time": timestamp_str,
                        "action": action,
                        "raw": content
                    })
                    
                    # 限制返回数量，防止过多
                    if len(history) > 100 and not mod_id:
                        break
                        
        except Exception as e:
            logger.error(f"Failed to parse steam log: {e}")
            
        return history

    # =========================================================
    #  2. 解析 ACF 文件 (获取模组最后更新时间戳)
    # =========================================================

    def get_mod_last_updated_timestamp(self, mod_id: str) -> int:
        """
        从 appworkshop_294100.acf 读取指定 Mod 的 timeupdated
        """
        acf_path = self.get_acf_path()
        if not acf_path: return 0
        
        try:
            with open(acf_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # VDF 格式很像 JSON 但没有逗号。我们用正则粗暴提取。
            # 结构: "123456" { "timeupdated" "1698300000" ... }
            # 匹配 Mod ID 后的块
            pattern = re.compile(rf'"{mod_id}"\s*{{(.*?)\}}', re.DOTALL)
            block_match = pattern.search(content)
            
            if block_match:
                block_content = block_match.group(1)
                # 提取 timeupdated
                time_match = re.search(r'"timeupdated"\s*"(\d+)"', block_content)
                if time_match:
                    return int(time_match.group(1))
        except Exception as e:
            logger.error(f"Failed to parse ACF: {e}")
        
        return 0
    
    # =========================================================
    #  4. 综合获取
    # =========================================================
    
    def get_detailed_history(self, mod_id: str):
        """
        汇总所有信息
        """
        # 1. 本地下载记录 (精确到秒，表示你的电脑什么时候下载的)
        local_logs = self.parse_local_download_history(mod_id)
        
        # 2. 上次更新时间戳 (作者什么时候更新的)
        last_updated_ts = self.get_mod_last_updated_timestamp(mod_id)
        last_updated_str = datetime.datetime.fromtimestamp(last_updated_ts).strftime('%Y-%m-%d %H:%M:%S') if last_updated_ts else "Unknown"
        
        return {
            "last_updated_server": last_updated_str,
            "local_activity_log": local_logs,
        }