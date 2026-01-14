# backend/managers/mgr_logs.py
import os
import re
import html
from datetime import datetime
from backend.settings import settings
from backend.utils.logger import logger

class GameLogManager:
    def __init__(self):
        # 预编译正则，提高分析效率
        self._patterns = {
            'error': re.compile(r'error|exception|crash|fail', re.IGNORECASE),
            'warning': re.compile(r'warning', re.IGNORECASE),
            # 用来判断是否是一个新的日志条目的开头
            # Unity日志通常新条目顶格，堆栈信息会缩进，或者新条目非空
            # 这里采用简单策略：非空行且不以 "  at " (堆栈特征) 开头视为新条目
            'stack_trace': re.compile(r'^\s+at |^\(Filename:'),
        }
        # 读取限制，防止读取几GB的垃圾日志撑爆内存
        self.MAX_LOG_SIZE = 10 * 1024 * 1024  # 10MB

    def get_log_files(self):
        """
        获取可用的游戏日志文件列表
        """
        base_path = settings.config.game_data_path
        if not base_path or not os.path.exists(base_path):
            return []

        candidates = ['Player.log', 'Player-prev.log']
        result = []

        for filename in candidates:
            filepath = os.path.join(base_path, filename)
            if os.path.exists(filepath):
                stat = os.stat(filepath)
                result.append({
                    'name': filename,
                    'path': filepath,
                    'size': stat.st_size,
                    'mtime': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                })
        return result

    def read_and_parse_log(self, filename):
        """
        读取并解析指定日志文件
        返回: { 'content': [...ParsedBlocks...], 'is_truncated': bool }
        """
        base_path = settings.config.game_data_path
        if not base_path:
            return {'error': '配置中未找到 LocalLow 路径'}
            
        filepath = os.path.join(base_path, filename)
        if not os.path.exists(filepath):
            return {'error': '文件不存在'}

        file_size = os.path.getsize(filepath)
        is_truncated = False
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                # 如果文件过大，只读最后 10MB (通常错误都在最后)
                if file_size > self.MAX_LOG_SIZE:
                    f.seek(file_size - self.MAX_LOG_SIZE)
                    is_truncated = True
                    # 丢弃第一行，因为它可能是不完整的
                    f.readline()
                
                raw_lines = f.readlines()

            parsed_blocks = self._parse_lines_to_blocks(raw_lines)
            
            return {
                'status': 'success',
                'filename': filename,
                'blocks': parsed_blocks,
                'is_truncated': is_truncated,
                'total_lines': len(raw_lines)
            }

        except Exception as e:
            logger.error(f"Error reading game log {filename}: {e}", exc_info=True)
            return {'error': str(e)}

    def _parse_lines_to_blocks(self, lines):
        """
        将原始行解析为逻辑块 (Block)。
        一个 Block 可能包含多行 (例如一条错误信息 + 紧接着的堆栈追踪)。
        """
        blocks = []
        current_block = None

        for line in lines:
            line_content = line.rstrip() # 保留前面的缩进，去掉后面的换行
            
            if not line_content:
                continue # 忽略空行，或者将空行作为分隔符处理？这里选择忽略以紧凑显示

            # 判断是否应该并入上一条 (堆栈追踪或紧密相关的行)
            # 规则：如果当前行以 "at " 开头 (Unity堆栈) 或者 (Filename: ...) 结尾
            is_stack = self._patterns['stack_trace'].search(line_content) is not None
            
            if is_stack and current_block:
                # 是堆栈信息，追加到上一条
                current_block['text'] += '\n' + line_content
                current_block['is_expanded'] = False # 有堆栈，默认折叠状态标记(前端用)
                current_block['has_stack'] = True
            else:
                # 是新的一条日志
                if current_block:
                    blocks.append(current_block)
                
                # 确定级别
                level = 'INFO'
                if self._patterns['error'].search(line_content):
                    level = 'ERROR'
                elif self._patterns['warning'].search(line_content):
                    level = 'WARNING'
                
                current_block = {
                    'level': level,
                    'text': line_content, # 第一行作为标题/主要内容
                    'has_stack': False,
                    'id': len(blocks) # 简单的索引ID
                }

        # 别忘了最后一个
        if current_block:
            blocks.append(current_block)

        return blocks