# backend/managers/mgr_ai.py
import json
import linecache
import os
import re
import time
import asyncio
from typing import List, Dict, Any, Union
from dataclasses import asdict
import uuid

# 禁用远程模型成本映射
os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"

# 引入 LiteLLM 的异步和同步方法
import litellm
from litellm import completion, acompletion
from litellm.exceptions import RateLimitError, ServiceUnavailableError
import requests
from json_repair import repair_json

from backend.settings import DATA_DIR, settings
from backend.utils.logger import logger
from backend.utils.constants import get_lang_by_code
from backend.utils.event_bus import EventBus
from backend.database.dao import ModDAO
from backend.managers.mgr_rules import RuleManager
from backend.managers.mgr_game_logs import LogCondenser
from backend.managers.mgr_network import network_mgr
from backend.database.dao import ModDAO
from backend.managers.mgr_load_order import LoadOrderManager
from backend.managers.mgr_game_logs import LogCondenser

class AIManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized: return
        self._initialized = True
        # 如果系统开启了 Debug 模式，开启 LiteLLM 的底层日志，打印完整的请求和响应
        if settings.config.debug_mode:
            os.environ['LITELLM_LOG'] = 'DEBUG'
        # 轻量级缓存字典，用于缓存自定义接口的模型列表
        # 格式: { "provider_baseurl_apikey": (timestamp, [models...]) }
        self._model_cache = {}
        self._cache_ttl = 300  # 缓存有效期 5 分钟 (300秒)
        
        # 加载提示词库
        self.prompts = {}
        self.prompt_file = str(DATA_DIR / 'prompts.json')
        # 1. 确保目录存在
        os.makedirs(os.path.dirname(self.prompt_file), exist_ok=True)
        # 2. 检查并生成默认配置
        self._ensure_default_prompts()
        # 3. 加载
        self.reload_prompts()
        
        logger.info("AI Manager initialized with LiteLLM.")


    # =========================================================================
    #  厂商与模型列表探测 (Providers & Models Discovery)
    # =========================================================================
    
    def get_providers(self, api_type: str) -> List[Dict[str, str]]:
        """
        获取支持的厂商或协议列表
        返回格式: [{"value": "openai", "label": "OpenAI"}, ...]
        """
        if api_type == 'custom':
            # 自定义模式：返回固定的标准协议
            return [
                {"value": "openai", "label": "OpenAI 兼容协议 (vLLM/中转/LM Studio)"},
                {"value": "ollama", "label": "Ollama 本地协议"},
                {"value": "gemini", "label": "Google Gemini 兼容协议 (中转/代理)"}
            ]
            
        # 官方模式：动态获取 LiteLLM 支持的真实厂商
        all_providers = list(litellm.models_by_provider.keys())
        # 定义常用厂商（置顶显示，按此顺序排列）
        common = ['openai', 'anthropic', 'gemini', 'deepseek', 'xai', 'openrouter',  'minimax', 'ollama', 'mistral', 'groq']
        
        result = []
        # 1. 优先加入常用厂商
        for p in common:
            if p in all_providers:
                # 简单格式化首字母大写作为显示名称
                label = p.replace('_', ' ').title()
                result.append({"value": p, "label": label})
                all_providers.remove(p)
                
        # 2. 剩余厂商按字母顺序追加 (过滤掉一些非常用的奇怪系统名称)
        ignored = ['custom', 'custom_openai', 'litellm_proxy', 'hosted_vllm']
        others = sorted([p for p in all_providers if p not in ignored])
        for p in others:
            result.append({"value": p, "label": p.replace('_', ' ').title()})
            
        return result

    def get_models(self, config_dict: dict) -> List[str]:
        """
        获取可用模型列表 (带缓存机制)
        :param config_dict: {api_type, provider, base_url, api_key}
        """
        api_type = config_dict.get('api_type', 'official')
        provider = config_dict.get('provider', '')
        
        # 1. 官方模式：直接从 LiteLLM 内存字典获取，无网络延迟，无需缓存
        if api_type == 'official':
            if not provider: return []
            models = list(litellm.models_by_provider.get(provider, []))
            models.sort(key=lambda x: x.lower())
            return models
            
        # 2. 自定义模式：需要发起网络请求
        base_url = config_dict.get('base_url', '').rstrip('/')
        api_key = config_dict.get('api_key', '')
        
        if not base_url: return []
        
        # 检查缓存
        cache_key = f"{provider}_{base_url}_{api_key}"
        if cache_key in self._model_cache:
            timestamp, cached_models = self._model_cache[cache_key]
            if time.time() - timestamp < self._cache_ttl:
                logger.debug(f"AI Models Cache hit for {base_url}")
                cached_models.sort(key=lambda x: x.lower())
                return cached_models
                
        # 缓存未命中，发起请求
        models = self._fetch_custom_models(provider, base_url, api_key)
        
        # 写入缓存
        if models: # 只有获取成功才缓存，防止缓存错误的空结果
            self._model_cache[cache_key] = (time.time(), models)
        # 按名称排序
        models.sort(key=lambda x: x.lower())
        return models

    def _fetch_custom_models(self, provider: str, base_url: str, api_key: str) -> List[str]:
        """(内部方法) 发送网络请求探测代理/本地服务的模型列表"""
        proxies = None
        if settings.config.network.use_proxy_on_ai:
            url = network_mgr.get_proxy_url()
            if url: proxies = {"http": url, "https": url}
            
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        try:
            # Ollama 格式探测
            if provider == 'ollama':
                resp = requests.get(f"{base_url}/api/tags", proxies=proxies, timeout=10)
                if resp.status_code == 200:
                    return [m['name'] for m in resp.json().get('models', [])]
            elif provider == 'gemini':
                # Gemini 协议通常在 URL 中带 key，或者从 Header 取
                resp = requests.get(f"{base_url}/v1/models", params={"key": api_key}, proxies=proxies, timeout=10)
                if resp.status_code == 200:
                    # 返回结果通常是 models/gemini-1.5-pro，需要剥离 models/ 前缀
                    return [m['name'].replace('models/', '') for m in resp.json().get('models', []) 
                            if 'generateContent' in m.get('supportedGenerationMethods', [])]
            # OpenAI 兼容格式探测 (LM Studio, vLLM, DeepSeek, 各大中转等)
            else: 
                # 兼容处理：有的 base_url 带有 /v1，有的没有
                endpoints = ["/models"] if base_url.endswith("/v1") else ["/v1/models", "/models"]
                for endpoint in endpoints:
                    try:
                        resp = requests.get(f"{base_url}{endpoint}", headers=headers, proxies=proxies, timeout=10)
                        if resp.status_code == 200:
                            data = resp.json()
                            if 'data' in data: # OpenAI 标准格式
                                return [item['id'] for item in data['data']]
                    except requests.exceptions.RequestException:
                        continue # 当前 endpoint 失败，尝试下一个
                        
        except Exception as e:
            logger.warning(f"Failed to fetch custom models from {base_url}: {e}")
            
        return []
    # =========================================================================
    #  LiteLLM 参数组装路由 (Routing)
    # =========================================================================

    def _get_litellm_kwargs(self, override_config: dict = {}) -> dict:
        """
        核心路由：组装 LiteLLM 需要的参数，彻底分离官方与代理逻辑
        """
        # 如果 AI 设置中明确关闭了代理，即使全局开启了，也对 AI 进程屏蔽它
        if not settings.config.network.use_proxy_on_ai:
            os.environ.pop('HTTP_PROXY', None)
            os.environ.pop('HTTPS_PROXY', None)
        else:
            # 确保应用最新的全局代理设置
            from backend.managers.mgr_network import network_mgr
            network_mgr.apply_proxy_settings()
            
        from backend.settings import AIConfig
        raw_cfg = settings.config.ai
        cfg = AIConfig(**raw_cfg) if isinstance(raw_cfg, dict) else raw_cfg
        
        if override_config:
            current_dict = asdict(cfg)
            current_dict.update(override_config)
            cfg = AIConfig(**current_dict)

        # 1. 基础公共参数
        kwargs = {
            "temperature": cfg.temperature,
            "max_tokens": cfg.max_tokens,
            # "stream": False,    # 显式禁用流式传输
            # 伪装成正常的 Chrome 浏览器，穿透绝大多数中转站的 Cloudflare 盾
            "extra_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
            }
        }

        # 2. 路由分支
        if cfg.api_type == 'official':
            # 官方原生模式
            # 如果模型名称未自带提供商前缀（如 gpt-4o 没有 openai/ 前缀），LiteLLM 也能自动识别，但为了极致安全，显式传入 custom_llm_provider
            kwargs["model"] = cfg.model
            kwargs["custom_llm_provider"] = cfg.provider
            kwargs["api_key"] = cfg.api_key or "dummy_key"
            if cfg.base_url: # 允许部分高阶用户为官方接口配反代
                kwargs["api_base"] = cfg.base_url.rstrip('/')
                
        else:
            # 自定义/代理模式 (强制使用前缀路由，接管底层处理)
            kwargs["api_key"] = cfg.api_key or "dummy_key" # 本地部署常无 key，补 dummy 防止库报错
            kwargs["api_base"] = cfg.base_url.rstrip('/')
            
            if cfg.provider == 'ollama':
                kwargs["model"] = f"ollama/{cfg.model}"
            elif cfg.provider == 'gemini':
                # 强制使用 gemini/ 前缀路由，LiteLLM 将采用 Google 协议格式
                kwargs["model"] = f"gemini/{cfg.model}"
            else:
                # openai 
                # 这里加上 openai/ 前缀是 LiteLLM 的终极奥义，它会强制按 OpenAI 官方数据结构请求目标 base_url
                kwargs["model"] = f"openai/{cfg.model}"

        # 核心逻辑：判断 AI 代理开关
        if settings.config.network.use_proxy_on_ai:
            proxy_url = network_mgr.get_proxy_url()
            if proxy_url:
                kwargs["proxy_url"] = proxy_url
        else:
            # 2. 如果 AI 明确关闭了代理，但全局代理可能开着
            # 为了防止 LiteLLM 自动读取环境变量，要显式告诉它：不要代理
            kwargs["proxy_url"] = None 
        
        return kwargs

    def _extract_json_from_text(self, text: str, is_batch: bool = False):
        """
        利用 json_repair 库进行究极容错解析
        """
        try:
            # repair_json 能自动处理 Markdown 代码块、未转义引号、缺少闭合括号等问题
            # return_objects=True 直接返回 Python 对象
            parsed = repair_json(text, return_objects=True)
            
            # 兼容性处理：有时候 AI 会自作聪明只返回对象没返回数组
            if isinstance(parsed, dict):
                return [parsed] if is_batch else parsed
            if isinstance(parsed, list):
                return parsed
                
            # 如果解析出来既不是 list 也不是 dict (比如解析成了空字符串)
            return None
        except Exception as e:
            logger.error(f"JSON Repair 彻底失败: {e}\n原文: {text[:200]}...")
            return None

    def _estimate_text_tokens(self, text: str, model_name: str) -> int:
        """
        使用后端统一的 tokenizer 估算文本 Token。
        这里的结果用于诊断链路的全局 Token 统计，比前端按字符粗算更稳定。
        """
        if not text:
            return 0
        try:
            return int(litellm.token_counter(model=model_name, text=text))
        except Exception as e:
            logger.debug(f"[AI诊断] 文本 Token 估算失败，改走字符兜底: {e}")
            return max(1, len(text) // 3)

    def _estimate_messages_tokens(self, messages: list[dict], model_name: str) -> int:
        """
        估算整轮 messages 进入模型前的输入 Token。
        某些模型不返回 usage 时，后端统一用这个值来做累计统计。
        """
        if not messages:
            return 0
        try:
            return int(litellm.token_counter(model=model_name, messages=messages))
        except Exception as e:
            logger.debug(f"[AI诊断] Messages Token 估算失败，改走文本拼接兜底: {e}")
            merged_text = "\n".join(str(m.get("content", "")) for m in messages)
            return self._estimate_text_tokens(merged_text, model_name)

    def _normalize_litellm_content(self, content: Any) -> str:
        """
        兼容 LiteLLM 不同模型返回的 content 结构，统一转成纯文本。
        某些模型会返回 list[part]，这里做一次后端规整，便于诊断流与兜底逻辑复用。
        """
        if content is None:
            return ""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            text_parts = []
            for part in content:
                if isinstance(part, dict):
                    if part.get("type") == "text":
                        text_parts.append(str(part.get("text", "")))
                    elif "text" in part:
                        text_parts.append(str(part.get("text", "")))
                else:
                    text_parts.append(str(part))
            return "".join(text_parts)
        return str(content)

    def _is_retryable_stream_error(self, error: Exception) -> bool:
        """
        判断是否属于典型的流式中断异常。
        这类错误常见于代理/网关提前断开 chunked 响应，适合自动回退到非流式重试。
        """
        error_text = str(error or "").lower()
        retry_signals = (
            "midstreamfallbackerror",
            "incomplete chunked read",
            "peer closed connection",
            "connection aborted",
            "server disconnected",
            "chunkedencodingerror",
        )
        return any(signal in error_text for signal in retry_signals)

    def _complete_diagnostic_without_stream(self, messages: list[dict], llm_kwargs: dict, tools=None, tool_choice=None) -> dict:
        """
        非流式兜底请求。
        当流式输出半途断开时，退回同步 completion，尽量保住本轮分析结果或工具调用计划。
        """
        request_kwargs = dict(llm_kwargs)
        if tools is not None:
            request_kwargs["tools"] = tools
        if tool_choice is not None:
            request_kwargs["tool_choice"] = tool_choice

        response = completion(messages=messages, **request_kwargs)
        message = response.choices[0].message # type: ignore
        tool_calls = getattr(message, "tool_calls", None) or []

        if tool_calls:
            formatted_tool_calls = []
            for index, tool_call in enumerate(tool_calls):
                function_obj = getattr(tool_call, "function", None)
                formatted_tool_calls.append({
                    "id": getattr(tool_call, "id", None) or f"tool_call_{index}",
                    "type": getattr(tool_call, "type", None) or "function",
                    "function": {
                        "name": getattr(function_obj, "name", None) or "",
                        "arguments": getattr(function_obj, "arguments", None) or "{}"
                    }
                })
            return {"is_tool_call": True, "tool_calls": formatted_tool_calls, "final_text": ""}

        return {
            "is_tool_call": False,
            "tool_calls": [],
            "final_text": self._normalize_litellm_content(getattr(message, "content", ""))
        }

    def _run_diagnostic_completion_with_fallback(self, messages: list[dict], llm_kwargs: dict, session_id: str, tools=None, tool_choice=None) -> dict:
        """
        统一封装诊断请求：
        1. 优先走流式，保留前端逐字体验；
        2. 如果流式在中途断开，则自动回退到非流式补救，避免把网络异常直接甩给用户。
        """
        try:
            return self._stream_diagnostic_completion(
                messages=messages,
                llm_kwargs=llm_kwargs,
                session_id=session_id,
                tools=tools,
                tool_choice=tool_choice
            )
        except Exception as e:
            if not self._is_retryable_stream_error(e):
                raise

            logger.warning(
                f"[AI诊断] 流式输出中断，自动回退为非流式补救 "
                f"session_id={session_id} error={type(e).__name__}: {e}"
            )
            return self._complete_diagnostic_without_stream(
                messages=messages,
                llm_kwargs=llm_kwargs,
                tools=tools,
                tool_choice=tool_choice
            )

    def _summarize_tool_result(self, name: str, tool_result: str) -> str:
        """
        为前端步骤面板生成一条简短摘要，便于用户快速判断这一步拿回了什么信息。
        """
        try:
            parsed = json.loads(tool_result)
            if isinstance(parsed, dict):
                if name == "get_log_context" and not parsed.get("error"):
                    block_span = parsed.get("provided_context") or parsed.get("context_provided", "目标日志内容")
                    return f"已返回 {block_span} 的日志内容"
                if parsed.get("error"):
                    return f"执行失败：{parsed['error']}"
                if name == "get_log_context":
                    return f"已返回 {parsed.get('provided_context', '指定范围')} 的日志内容"
                if name == "get_active_mod_list":
                    return f"已返回 {parsed.get('total_active', 0)} 个激活模组"
                if name == "get_load_order_context":
                    surrounding = parsed.get("surrounding_mods_order", [])
                    return f"已返回目标模组前后 {len(surrounding)} 个排序上下文"
                if name == "get_mod_info":
                    return f"已返回模组元数据：{parsed.get('name') or '未知名称'}"
        except Exception:
            pass

        safe_text = (tool_result or "").replace("\r", " ").replace("\n", " ").strip()
        if not safe_text:
            return "工具执行完成，但没有返回可展示内容"
        return safe_text[:180] + ("..." if len(safe_text) > 180 else "")

    def _parse_diagnostic_final_text(self, final_text: str) -> dict[str, Any]:
        """
        统一解析模型最终回答，把 actions 从正文里剥离出来。
        """
        parsed_json = self._extract_json_from_text(final_text) 
        
        # 兼容性处理。有时候模型虽然返回了 JSON，但没包裹在 ``` 里面
        # 我们的第一要务是拿到 actions
        actions = []
        if isinstance(parsed_json, dict) and "actions" in parsed_json:
            actions = parsed_json["actions"]
            
        elif isinstance(parsed_json, list):
            # 万一模型自作主张直接返回了数组
            actions = parsed_json

        if actions:
            # 安全地将包含 actions 的 JSON 块从原文中剔除
            # (不需要完美的正则表达式，只需简单抹掉代码块，剩余的就是纯文本分析)
            clean_text = re.sub(
                r'```(?:json)?[\s\S]*?(?:"actions"|"type"|"ENABLE_MOD")[\s\S]*?```', 
                '', 
                final_text, 
                flags=re.IGNORECASE
            ).strip()
            
            # 如果原文只是一整块 JSON 而没有 Markdown 包裹，通过 repair_json 兜底
            if not clean_text and isinstance(parsed_json, dict) and "analysis" in parsed_json:
                clean_text = parsed_json["analysis"]
                
            return {
                "analysis": clean_text or "（已生成自动化操作建议）",
                "actions": actions
            }

        return {"analysis": final_text.strip(), "actions": []}

    def _stream_diagnostic_completion(
        self,
        messages: list[dict],
        llm_kwargs: dict,
        session_id: str,
        tools: list[dict] | None = None,
        tool_choice: str | None = None
    ) -> dict[str, Any]:
        """
        统一处理流式诊断请求：
        - 自动聚合 Tool Calls
        - 自动把普通文本流推给前端
        """
        completion_kwargs = {
            "messages": messages,
            "stream": True,
            **llm_kwargs
        }
        if tools is not None:
            completion_kwargs["tools"] = tools
            completion_kwargs["tool_choice"] = tool_choice or "auto"

        response = completion(**completion_kwargs)
        is_tool_call = False
        tool_calls_dict: dict[int, dict[str, str]] = {}
        final_text = ""

        for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta

            if getattr(delta, "tool_calls", []):
                is_tool_call = True
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls_dict:
                        tool_calls_dict[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc.id:
                        tool_calls_dict[idx]["id"] += tc.id
                    if getattr(tc.function, "name", None):
                        tool_calls_dict[idx]["name"] += tc.function.name
                    if getattr(tc.function, "arguments", None):
                        tool_calls_dict[idx]["arguments"] += tc.function.arguments
            elif getattr(delta, "content", None):
                content_chunk = delta.content
                final_text += content_chunk
                EventBus.emit('ai-chat-stream', {'session_id': session_id, 'chunk': content_chunk})

        formatted_tool_calls = []
        if is_tool_call:
            for _, tc in sorted(tool_calls_dict.items()):
                formatted_tool_calls.append({
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]}
                })

        return {
            "is_tool_call": is_tool_call,
            "tool_calls": formatted_tool_calls,
            "final_text": final_text
        }

    def _safe_format(self, template: str, variables: dict) -> str:
        """
        安全格式化工具：只替换模板中存在的变量，忽略其他大括号。
        解决 JSON 示例与 Python .format() 的冲突。
        """
        # 使用正则匹配 {key}，只有当 key 在 variables 字典中时才替换
        # 这样即使模板里有 {"package_id": "xxx"}，因为 package_id 不在变量里，就会被原样保留
        pattern = re.compile(r'\{(\w+)\}')
        
        def replace(match):
            key = match.group(1)
            return str(variables.get(key, match.group(0))) # 找不到就返回原样 {key}
            
        return pattern.sub(replace, template)

    # =========================================================================
    #  核心：单次同步执行 (供简单的闲聊或单次测试使用)
    # =========================================================================
    def execute_task(self, task_key: str, variables: Dict[str, Any], override_config: dict = {}) -> Any:
        """
        执行具体的 AI 任务
        :param task_key: prompts.json 中的 key (如 'translation')
        :param variables: 模板变量 (如 {'content': '...', 'target_lang': 'zh-cn'})
        """
        if task_key not in self.prompts:
            raise ValueError(f"Prompt template '{task_key}' not found.")
        
        # 1. 自动注入目标语言 (如果变量里没传)
        if 'target_lang' not in variables:
            # 获取当前软件语言设置 (如 'zh-cn')
            # 转换为自然语言 (如 'Simplified Chinese')
            variables['target_lang'] = get_lang_by_code(settings.config.language)

        prompt_config = self.prompts[task_key]
        system_prompt = self._safe_format(prompt_config.get('system', ''), variables)
        user_content = self._safe_format(prompt_config.get('user_template', ''), variables)

        llm_kwargs = self._get_litellm_kwargs(override_config)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        try:
            # LiteLLM 统一同步调用
            response = completion(messages=messages, **llm_kwargs)
            result_text = response.choices[0].message.content # type: ignore
            return self._extract_json_from_text(result_text) or result_text # type: ignore
        except Exception as e:
            logger.error(f"AI Task execution failed: {e}")
            raise e

    # =========================================================================
    #  核心：异步并发批量执行引擎
    # =========================================================================
    async def _process_chunk(self, chunk_id: str, chunk_data: List[Dict], task_key: str, variables: dict, llm_kwargs: dict, semaphore: asyncio.Semaphore):
        """处理单个分块，包含并发控制和自动重试"""
        async with semaphore:
            try:
                # 动态注入当前块的数据 (转为紧凑的JSON字符串发给大模型)
                chunk_variables = variables.copy()
                chunk_variables['batch_json_data'] = json.dumps(chunk_data, ensure_ascii=False)
                
                prompt_config = self.prompts[task_key]
                system_prompt = self._safe_format(prompt_config.get('system', ''), chunk_variables)
                user_content = self._safe_format(prompt_config.get('user_template', ''), chunk_variables)

                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]

                # LiteLLM 神级特性：内置重试逻辑 num_retries=3
                # 如果遇到 429 Rate Limit 或 503，它会自动按指数退避等待并重试
                response = await acompletion(
                    messages=messages,
                    num_retries=3,
                    # 如果模型支持强制JSON输出，可以解开下面这行的注释
                    # response_format={"type": "json_object"}, 
                    **llm_kwargs
                )
                
                result_text = response.choices[0].message.content # type: ignore
                parsed_json = self._extract_json_from_text(result_text, is_batch=True) # type: ignore
                
                return {"chunk_id": chunk_id, "status": "success", "data": parsed_json, "raw": result_text}

            except Exception as e:
                logger.error(f"Chunk {chunk_id} failed after retries: {e}")
                return {"chunk_id": chunk_id, "status": "error", "error": str(e), "data": None}

    async def execute_batch_task_async(self, task_key: str, items: List[Dict], variables: Dict[str, Any], task_event_id: str):
        """
        异步批量调度中心 (集成智能重试 + 失败兜底 + 结构化返回)
        """
        cfg = settings.config.ai
        llm_kwargs = self._get_litellm_kwargs()
        max_concurrency = getattr(cfg, 'max_concurrency', 3)
        
        # 估算单个 Chunk 安全容量
        safe_input_tokens = max(1000, int(cfg.max_tokens) - 1000) 
        max_chars_per_chunk = int(safe_input_tokens * 1.5)
        
        # ------------------------------------------
        # 内部函数：智能分块算法
        # ------------------------------------------
        def build_smart_chunks(items_to_chunk):
            chunks_list = []
            current_chunk, current_chunk_chars = [], 0
            for item in items_to_chunk:
                # 预估 item 长度
                item_char_len = len(json.dumps(item, ensure_ascii=False))
                
                # 如果单个 item 已经超过最大限制，强制截断其描述
                if item_char_len > max_chars_per_chunk:
                    if 'description' in item and isinstance(item['description'], str):
                        # 保留头部，截断描述
                        keep_len = int(max_chars_per_chunk * 0.6)
                        item['description'] = item['description'][:keep_len] + "...(截断)"
                        item_char_len = len(json.dumps(item, ensure_ascii=False))

                # 判断是否需要新起一个 Chunk
                if current_chunk_chars + item_char_len > max_chars_per_chunk and len(current_chunk) > 0:
                    chunks_list.append(current_chunk)
                    current_chunk = [item]
                    current_chunk_chars = item_char_len
                else:
                    current_chunk.append(item)
                    current_chunk_chars += item_char_len
                    
            if current_chunk: chunks_list.append(current_chunk)
            return chunks_list

        # ------------------------------------------
        # 核心逻辑：多轮重试循环
        # ------------------------------------------
        total_initial_items = len(items)
        # 深拷贝以防修改原引用，且确保每个 item 都有 package_id
        pending_items = [i for i in items if 'package_id' in i] 
        
        all_results = []
        successful_ids = set()
        max_logic_retries = 3 
        
        logger.info(f"AI Batch Task Started. Total: {total_initial_items}")

        for attempt in range(max_logic_retries):
            if not pending_items: 
                break 
            
            # 对剩余项重新进行智能分块
            chunks = build_smart_chunks(pending_items)
            logger.info(f"AI Task [Round {attempt+1}]: {len(pending_items)} pending items -> {len(chunks)} chunks.")
            
            semaphore = asyncio.Semaphore(max_concurrency)
            # 这里必须把 chunk 自身也传给 zip，因为需要知道发出去的是谁
            chunk_tasks = []
            
            for idx, chunk in enumerate(chunks):
                # 任务 ID 加上轮次前缀方便调试
                t_id = f"r{attempt}_c{idx}"
                coro = self._process_chunk(t_id, chunk, task_key, variables, llm_kwargs, semaphore)
                chunk_tasks.append((asyncio.create_task(coro), chunk))
            
            # 等待本轮所有 Chunk 完成
            for future, original_chunk in chunk_tasks:
                result = await future
                
                # 计算该 Chunk 期望返回的所有 ID
                expected_ids = {i.get('package_id') for i in original_chunk}
                
                if result['status'] == 'success' and isinstance(result['data'], list):
                    # 过滤有效数据：必须是字典，且 ID 必须属于本次请求的范围
                    valid_data = []
                    for d in result['data']:
                        if isinstance(d, dict):
                            pid = d.get('package_id')
                            if pid in expected_ids:
                                valid_data.append(d)
                                successful_ids.add(pid)
                    
                    if valid_data:
                        all_results.extend(valid_data)
                        EventBus.emit('ai-batch-chunk-ready', valid_data)
                
                # 实时更新进度
                percent = int((len(successful_ids) / total_initial_items) * 100)
                # 预留 5% 给最终结算
                percent = min(95, percent) 
                
                EventBus.emit('ai-batch-progress', {
                    'scanning': True, 
                    'percent': percent,
                    'message': f"正在推理... [第{attempt+1}轮] 成功: {len(successful_ids)}/{total_initial_items}"
                })

            # 计算下一轮的待处理项 (过滤掉已经成功的)
            pending_items = [item for item in pending_items if item.get('package_id') not in successful_ids]
            
            # 如果还有剩下的，稍作休息
            if pending_items: 
                await asyncio.sleep(1)

        # ------------------------------------------
        # 终极处理：失败兜底 (Fallback)
        # ------------------------------------------
        failed_count = len(pending_items)
        if failed_count > 0:
            logger.warning(f"AI Task Completed with {failed_count} failures. Generating empty placeholders.")
            failed_results = []
            for item in pending_items:
                # 生成占位对象，包含原始 ID 和失败标记
                failed_obj = {
                    "package_id": item["package_id"],
                    "alias_name": "", 
                    "notes": "",
                    "_failed": True # 标记为失败项，供前端判断
                }
                failed_results.append(failed_obj)
                all_results.append(failed_obj)
            
            # 将这些空数据发给前端
            EventBus.emit('ai-batch-chunk-ready', failed_results)

        # ------------------------------------------
        # 任务结束，发送 100% 信号
        # ------------------------------------------
        EventBus.emit('ai-batch-progress', {
            'scanning': True, 
            'percent': 100,
            'message': f"推理结束！成功: {len(successful_ids)}, 失败: {failed_count}"
        })
        
        # 返回指定的结构化数据
        return {
            "success_count": len(successful_ids),
            "failed_count": failed_count,
            "results": all_results
        }
    
    def test_chat(self, message: str, override_config: dict) -> str:
        """
        用于前端“测试模型”按钮的方法
        """
        llm_kwargs = self._get_litellm_kwargs(override_config)
        messages = [{"role": "user", "content": message}]
        
        try:
            # 同步调用测试是否连通
            response = completion(messages=messages, **llm_kwargs)
            return response.choices[0].message.content # type: ignore
        except Exception as e:
            logger.error(f"Test Chat Error: {e}")
            raise Exception(f"请求失败: {str(e)}")
        


    # =========================================================================
    #  系统提示词管理 (System Prompts Management)
    #  系统提示词是不可删除的，只能修改
    # =========================================================================
    
    def _get_default_prompts(self):
        """定义系统默认提示词"""
        return {
            "chat": {
                "name": "自由对话",
                "description": "普通的对话模式",
                "system": "你是一个乐于助人的RimWorld游戏专家，你的回答应该总是使用{target_lang}。",
                "user_template": "{message}"
            },
            "log_analysis": {
                "name": "日志分析",
                "description": "分析游戏日志中的错误、红字和堆栈信息",
                "system": "你是一个Unity3D和RimWorld模组开发专家。你的任务是分析用户的游戏日志片段。\n请找出导致错误、崩溃或红字的具体Mod名称、XML Def或缺失文件。\n如果涉及Mod冲突，请明确指出冲突双方。\n请使用{target_lang}回答，并保持专业且易懂。",
                "user_template": "请分析以下日志片段，并给出修复建议：\n\n{log_content}"
            },
            "alias_generation": {
                "name": "智能别名与通俗备注",
                "description": "生成新手也能瞬间秒懂的别名和备注说明",
                "system": "你是一个深耕 RimWorld 社区多年的老玩家，也是一位极具亲和力的模组讲解员。你的任务是把复杂的模组信息翻译成**连完全不懂电脑的新手玩家**都能瞬间听懂的话。\n\n**1. 别名 (alias_name) 准则：**\n- 必须原样保留名称中的元数据（如果有），如 `[作者名]`、`(版本如：Continued)` 等，严禁改动这些括号内容。\n- 核心名称要像玩家在群里聊天一样自然，直接称呼功能或物品，表述模糊的可以用“XX补丁”、“XX扩展”、“XX增强”等直观词汇。\n\n**2. 备注 (notes) 准则 (核心修改)：**\n- **禁止使用专业术语**：严禁出现“注入”、“XML”、“Def”、“程序集”、“算法”等词汇。如果一定要解释技术，请用生活中的例子打比方（比如：它像胶水一样把两个原本不合的模组粘在一起）。\n- **功能导向**：直接告诉玩家“装了这个之后，你的游戏里会多出什么”或者“它帮你解决了哪个让你头疼的问题”。\n- **语言风格**：通俗易懂，极致白话。字数控制在 100-200 字之间。 **排版建议**：用客观但亲切的语气描述，不要像说明书，要像老大哥带新手。\n\n请以 JSON 格式返回结果，包含两个字段：'alias_name' (别名) 和 'notes' (备注)。不要包含 Markdown 代码块标签。！！！严禁在生成的内容中使用双引号(可以改用单引号或书名号)，否则会导致系统崩溃！！！",
                "user_template": "模组原名: {name}\n模组简介:\n{description}"
            },
            "batch_alias_generation": {
                "name": "批量别名与备注生成",
                "description": "一次性为多个Mod生成通俗别名和备注",
                "system": """### Role\n你是一位深耕 RimWorld (环世界) 社区多年的资深玩家，也是一位极具亲和力的“模组导游”。你的受众是**完全不懂代码、不懂游戏术语的新手玩家**。\n\n### Task\n接收一组原始 Mod 数据，将其翻译并转化为用户语言 {target_lang}，生成通俗易懂的“别名”和“备注”。\n\n### Input Format\nJSON Array: [ {"package_id": "...", "name": "...", "description": "..."} ]\n\n### Output Format\nStrict JSON Array: [ {"package_id": "...", "alias_name": "...", "notes": "..."} ]\n\n### Style Guidelines\n1. **别名 (alias_name)**:\n   - **保留元数据**: 必须保留原名中括号内的内容（如 `[1.4]`, `(Continued)`, `[HMC]`），不要翻译或删除它们。\n   - **直观命名**: 抛弃晦涩的原名，直接用功能命名。例如 "Wall Light" -> "墙灯"，"RimFridige" -> "冰箱"。\n   - **格式**: 简短有力，不要超过 20 个字。\n\n2. **备注 (notes)**:\n   - **🚫 禁止术语**: 严禁出现 "XML", "Def", "Harmony", "渲染", "程序集", "注入" 等技术词汇。\n   - **✅ 功能导向**: 用生活化的比喻告诉玩家“装了这个能干嘛”或“解决了什么痛点”。\n   - **🗣 语气风格**: 像群里的老大哥在推荐 Mod。幽默、直白、接地气。\n   - **长度**: 控制在 100-200 字之间，通俗易懂，极致白话。\n\n### ⚠️ Technical Constraints (CRITICAL)\n1. **Output ONLY JSON**: Do NOT output Markdown blocks (```json), explanations, or any text outside the JSON array.\n2. **Quote Handling**: To prevent JSON syntax errors, **use SINGLE QUOTES (') or CHINESE QUOTES (「」 or “”) inside the content**. NEVER use double quotes (") inside the value strings.\n   - ❌ Wrong: "notes": "It adds "smart" weapons."\n   - ✅ Right: "notes": "It adds 'smart' weapons."\n3. **ID Matching**: The `package_id` must match the input exactly. Do not hallucinate new IDs.\n4. **Language**: Ensure all generated content is in {target_lang}.\n\n### Example\n**Input**:\n[\n  {"package_id": "ludeon.rimworld", "name": "Core", "description": "The core game data."}\n]\n\n**Output**:\n[\n  {\n    "package_id": "ludeon.rimworld",\n    "alias_name": "游戏核心",\n    "notes": "这是游戏本体的心脏，没它你连\\"游戏\\"都打不开，千万别动它。"\n  }\n]""",
                "user_template": """请根据 System 指令，将以下模组数据转化为面向新手的【通俗别名(alias_name)】与【大白话备注(notes)】。\n要求：ID 精准匹配、语气极度口语化、严禁技术术语；输出严格 JSON 数组，且值内仅限使用单引号，不包含 Markdown 标记。\n\n待处理数据：\n{batch_json_data}"""
            }
        }
    
    def _ensure_default_prompts(self):
        """如果配置文件不存在，生成默认的 Prompts"""
        if os.path.exists(self.prompt_file):
            return
        logger.info("Generating default prompts.json...")
        self._save_prompts_to_disk(self._get_default_prompts())

    def _save_prompts_to_disk(self, data):
        """将提示词写入磁盘"""
        try:
            with open(self.prompt_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save prompts: {e}")
    
    def reload_prompts(self):
        """重新加载提示词配置文件"""
        if os.path.exists(self.prompt_file):
            try:
                with open(self.prompt_file, 'r', encoding='utf-8') as f:
                    self.prompts = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load prompts.json: {e}")
                # 加载默认
                self.prompts = {}
    
    def save_prompt(self, prompt_id: str, prompt_data: dict):
        """新增或更新提示词"""
        # 如果是修改系统提示词，保留其 is_system 属性防止被篡改
        if prompt_id in self.prompts and self.prompts[prompt_id].get('is_system'):
            prompt_data['is_system'] = True
            
        self.prompts[prompt_id] = prompt_data
        self._save_prompts_to_disk(self.prompts)
        return self.prompts

    def delete_prompt(self, prompt_id: str):
        """删除提示词 (拒绝删除系统级)"""
        if prompt_id not in self.prompts:
            raise ValueError("Prompt ID 不存在")
        if self.prompts[prompt_id].get('is_system'):
            raise ValueError("无法删除系统级核心提示词")
            
        del self.prompts[prompt_id]
        self._save_prompts_to_disk(self.prompts)
        return self.prompts

    def reset_system_prompts(self):
        """恢复所有系统级提示词到出厂设置 (保留用户自定义的)"""
        defaults = self._get_default_prompts()
        for p_id, p_data in defaults.items():
            self.prompts[p_id] = p_data
        self._save_prompts_to_disk(self.prompts)
        return self.prompts


    # ---------------------------------------------------------
    # 定义 AI 可以调用的后置工具箱 (Tools)
    # ---------------------------------------------------------
    def _get_diagnostic_tools(self):
        """定义供 AI 调用的标准化工具 (Tools)"""
        return [
            { 
                "type": "function",
                "function": {
                    "name": "get_log_context",
                    "description": "基于报错摘要中的 target_line，获取该行对应的完整原版日志块及堆栈。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "target_line": {"type": "integer", "description": "要查询的目标行号"},
                            "expand_range": {"type": "integer", "description": "最多保留多少行堆栈摘要。默认 20。"}
                        },
                        "required": ["target_line"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_mods",
                    "description": "通过模糊关键词（如Mod名称的片段或作者名）搜索当前安装的模组，获取准确的 package_id。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "keyword": {"type": "string", "description": "搜索关键词，例如 'RimFridge' 或 'Harmony'"}
                        },
                        "required": ["keyword"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_mod_info",
                    "description": "获取指定 package_id 模组的物理属与及元数据。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "package_id": {"type": "string", "description": "模组的包名，全小写，如 ludeon.rimworld"},
                            "scope": {
                                "type": "string",
                                "enum": ["simple", "all", "specific"],
                                "description": "信息范围：simple(基础), all(全量), specific(指定属性)"
                            },
                            "fields": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "当 scope 为 specific 时，指定要请求的字段，如 ['path', 'version', 'mod_type']"
                            }
                        },
                        "required": ["package_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_mod_rules",
                    "description": "获取该模组当前生效的所有排序与冲突规则（包含前置、后置、不兼容等）。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "package_id": {"type": "string"},
                            "native_only": {
                                "type": "boolean",
                                "description": "true=仅获取Mod作者原生写入About.xml的规则；false=获取合并了社区和玩家自定义后的最终生效规则"
                            }
                        },
                        "required": ["package_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_user_mod_data",
                    "description": "说明：此工具获取的数据仅影响模组在管理器UI中的颜色、标签、分组等，【不影响游戏】，仅用于辅助了解玩家的主观归类。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "package_id": {"type": "string"}
                        },
                        "required": ["package_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_load_order_context",
                    "description": "获取指定模组在当前加载列表中的排位上下文（前后相邻项），用于排查排位错误。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "package_id": {"type": "string"}
                        },
                        "required": ["package_id"]
                    }
                }
            },
            { 
                "type": "function",
                "function": {
                    "name": "get_active_mod_list",
                    "description": "获取当前所有激活的模组包名列表，用于宏观框架的排序检视。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "include_names": {"type": "boolean", "description": "是否附带具体名称。体积较大，非必要传 false。"}
                        }
                    }
                }
            }
        ]

    def _execute_diagnostic_tool(self, name: str, arguments: str, active_context, payload=None, reader=None) -> str:
        """执行具体的诊断工具"""
        try:
            # 兼容处理：大模型有时可能传空字符串
            args = json.loads(arguments) if arguments else {}
        except json.JSONDecodeError:
            return json.dumps({"error": "参数解析失败"})

        try:
            logger.debug(f"[AI诊断] 开始执行工具 name={name} args={args}")
            if name == "get_log_context":
                # 【核心修复】先定位目标行所在的日志块，再返回该日志块的精简版内容。
                # 这里不会再返回“前后多少行”的盲切片，而是返回目标日志本身。
                try:
                    target_line = int(args.get("target_line") or 0)
                except (TypeError, ValueError):
                    target_line = 0

                if target_line <= 0:
                    return json.dumps({"error": "必须提供有效的 target_line 参数"})

                # expand_range 在这里改为“最多保留多少行堆栈摘要”。
                stack_excerpt_lines = max(6, min(int(args.get("expand_range", 20) or 20), 80))

                source_type = payload.get("log_source_type", "game") if payload else "game"
                filename = payload.get("filename", "")

                if not filename:
                    return json.dumps({"error": "前端未提供当前日志文件名 filename。"})

                if source_type == 'game':
                    filepath = os.path.join(active_context.user_data_path, filename) if active_context else ""
                else:
                    filepath = os.path.join(DATA_DIR, 'logs', filename)

                if not os.path.exists(filepath):
                    return json.dumps({"error": f"找不到对应日志文件: {filename}"})

                if not reader or not hasattr(reader, "get_raw_logs_by_lines"):
                    return json.dumps({"error": "当前日志读取器不支持按行反查日志块"})

                def _normalize_raw_lines(raw_values):
                    normalized = []
                    for raw_value in raw_values or []:
                        try:
                            normalized.append(int(raw_value))
                        except (TypeError, ValueError):
                            continue
                    return sorted(set(normalized))

                matched_blocks = reader.get_raw_logs_by_lines(filepath, [target_line])
                target_block = None
                for block in matched_blocks:
                    if target_line in _normalize_raw_lines(block.get("raw_lines", [])):
                        target_block = block
                        break
                if target_block is None and matched_blocks:
                    target_block = matched_blocks[0]

                if target_block is None:
                    logger.debug(
                        f"[AI诊断] get_log_context 未命中日志块 "
                        f"filename={filename} target_line={target_line}"
                    )
                    return json.dumps({"error": f"无法定位目标行 {target_line} 所在的日志块，文件可能已变更。"})

                block_raw_lines = _normalize_raw_lines(target_block.get("raw_lines", []))
                matched_line = target_line if target_line in block_raw_lines else (block_raw_lines[0] if block_raw_lines else target_line)
                level = str(target_block.get("level", "INFO") or "INFO")
                message = str(target_block.get("message", "") or "").strip()
                details = str(target_block.get("details", "") or "").strip()
                cleaned_details = LogCondenser.clean_stack_trace(details, max_lines=stack_excerpt_lines)

                context_sections = [f"[日志内容 | 请求行号 #{target_line}] {level}: {message}"]
                if cleaned_details:
                    context_sections.append("[精简堆栈]")
                    context_sections.append(cleaned_details)
                elif details:
                    context_sections.append("[原始堆栈]")
                    context_sections.append(details)

                logger.debug(
                    f"[AI诊断] get_log_context 命中 "
                    f"filename={filename} target_line={target_line} "
                    f"log_line_count={len(block_raw_lines)} stack_excerpt_lines={stack_excerpt_lines}"
                )

                return json.dumps({
                    "query_line": target_line,
                    "matched_line": matched_line,
                    "log_line_count": len(block_raw_lines),
                    "log_lines": block_raw_lines,
                    "stack_excerpt_lines": stack_excerpt_lines if details else 0,
                    "provided_context": f"已返回行号 #{matched_line} 对应的日志内容",
                    "context_content": "\n".join(section for section in context_sections if section)
                }, ensure_ascii=False)

            elif name == "get_active_mod_list":
                # 【优化】支持 include_names 控制体积
                include_names = args.get("include_names", False)
                lo_mgr = LoadOrderManager(active_context)
                read_res = lo_mgr.read_active_mods()
                mods_data = read_res.get('mods', [])
                
                if include_names:
                    active_list = {m.get('package_id', ''): m.get('name', '') for m in mods_data}
                else:
                    active_list = [m.get('package_id', '') for m in mods_data]
                    
                return json.dumps({
                    "total_active": len(mods_data),
                    "active_order": active_list
                }, ensure_ascii=False)

            elif name == "get_load_order_context":
                pkg_id = args.get("package_id", "").lower()
                lo_mgr = LoadOrderManager(active_context)
                active_ids = [m.lower() for m in lo_mgr.read_active_mods().get("active_mods", [])]
                
                if pkg_id not in active_ids:
                    return json.dumps({"error": f"该模组[{pkg_id}] 未启用，没有排序上下文。"})
                
                idx = active_ids.index(pkg_id)
                start = max(0, idx - 3)
                end = min(len(active_ids), idx + 4)
                return json.dumps({
                    "target_index": idx,
                    "surrounding_mods_order": active_ids[start:end]
                })
                
            elif name == "search_mods":
                keyword = args.get("keyword", "").lower()
                all_mods = ModDAO.get_profile_mods(active_context)
                results = []
                for m in all_mods:
                    if keyword in m.get('name', '').lower() or keyword in m.get('package_id', '').lower():
                        results.append({
                            "name": m.get('name'),
                            "package_id": m.get('package_id'),
                            "author": m.get('author', []),
                            "is_disabled": m.get('disabled', False)
                        })
                        if len(results) >= 10:  # 限制返回数量避免过大
                            break
                return json.dumps({"keyword": keyword, "matched": results}, ensure_ascii=False)

            elif name == "get_mod_info":
                pkg_id = args.get("package_id", "").lower()
                scope = args.get("scope", "simple")
                fields = args.get("fields", [])
                
                # ModDAO 已经把 ModAsset 和 UserModData join 了
                all_mods = ModDAO.get_profile_mods(active_context)
                mod = next((m for m in all_mods if m.get("package_id", "").lower() == pkg_id), None)
                if not mod:
                    return json.dumps({"error": f"本地未安装或找不到此模组: {pkg_id}"})
                
                # 剔除我们不希望 AI 看到的庞大字典（如果不控制）
                safe_mod = {k:v for k,v in mod.items() if k not in ['descriptions_by_version', 'gallery_paths']}
                
                if scope == "specific" and fields:
                    subset = {k: safe_mod.get(k) for k in fields}
                    return json.dumps(subset, ensure_ascii=False)
                elif scope == "all":
                    return json.dumps(safe_mod, ensure_ascii=False)
                else:
                    return json.dumps({
                        "name": safe_mod.get("name"),
                        "package_id": safe_mod.get("package_id"),
                        "workshop_id": safe_mod.get("workshop_id"),
                        "version": safe_mod.get("version"),
                        "supported_versions": safe_mod.get("supported_versions"),
                        "is_disabled": safe_mod.get("disabled", False),
                        "store": safe_mod.get("store"),
                        "path": safe_mod.get("path")
                    }, ensure_ascii=False)

            elif name == "get_mod_rules":
                pkg_id = args.get("package_id", "").lower()
                native_only = args.get("native_only", False)
                all_mods = ModDAO.get_profile_mods(active_context)
                mod = next((m for m in all_mods if m.get("package_id", "").lower() == pkg_id), None)
                if not mod:
                    return json.dumps({"error": f"本地未安装此模组: {pkg_id}"})
                
                if native_only:
                    return json.dumps({
                        "dependencies": mod.get("dependencies_mods", []),
                        "load_after": mod.get("load_after_mods", []),
                        "load_before": mod.get("load_before_mods", []),
                        "incompatible": mod.get("incompatible_mods", [])
                    }, ensure_ascii=False)
                else:
                    # 获取经过管理器合并后的真实生效规则
                    from backend.managers.mgr_rules import RuleManager
                    temp_rule_mgr = RuleManager(active_context)
                    effective_rules = temp_rule_mgr.get_effective_mod_rules(pkg_id, mod)
                    return json.dumps(effective_rules, ensure_ascii=False)

            elif name == "get_user_mod_data":
                pkg_id = args.get("package_id", "").lower()
                all_mods = ModDAO.get_profile_mods(active_context)
                mod = next((m for m in all_mods if m.get("package_id", "").lower() == pkg_id), None)
                if not mod:
                    return json.dumps({"error": f"本地未安装此模组: {pkg_id}"})
                return json.dumps({
                    "package_id": pkg_id,
                    "alias_name": mod.get("alias_name"),
                    "tags": mod.get("tags", []),
                    "notes": mod.get("notes"),
                    "color": mod.get("sign_color"),
                    "user_type": mod.get("user_mod_type")
                }, ensure_ascii=False)
            
        except Exception as e:
            logger.error(f"AI工具执行异常: {str(e)}", exc_info=True)
            return json.dumps({"error": f"工具执行异常: {str(e)}"})

        return json.dumps({"error": f"未知的函数: {name}"})

    def ai_diagnostic_chat(self, payload: dict, active_context, reader=None) -> list[dict[str, Any]] | dict[str, Any] | list[Any]:
        """
        处理前端的诊断请求，支持 Agentic 工具调用和多轮会话
        payload: { "history": [...], "condensed_data": {...}, "question": "..." }
        """
        history = payload.get("history", [])
        diagnosis_context = payload.get("diagnosis_context", None)
        condensed_data = payload.get("condensed_data", None)
        if diagnosis_context is None:
            diagnosis_context = condensed_data
        question = payload.get("question", "")
        # 获取前端生成的话话 ID，用于向前端定向推送流数据
        session_id = payload.get("session_id", str(uuid.uuid4()))
        
        # 1. 系统提示词 (精准定调)
        system_prompt = """你是一个顶级的 RimWorld 模组冲突分析与 C# 报错排查专家。
请注意以下工作原则：
1. 【先看目录，再查详情】：系统会在首轮提供错误摘要。如果某个错误像是崩溃源头，务必优先调用 `get_log_context` 工具传入该错误的 `target_line` 获取该行所在的完整日志块。`expand_range` 表示最多保留多少行堆栈摘要。
2. 【全局视野】：必要时可调用 `get_active_mod_list` 查看全局加载顺序（如果只需要看框架冲突，设置 include_names 为 false 以节约时间）。
3. 【关注隐性冲突】：不要只看报错表象，要结合上下文深挖“未显式声明的隐性冲突”。
4. 【友好沟通与修复动作】：请直接使用 Markdown 大白话解释问题，**绝不要**把整段回复包裹在 JSON 字符串里！
5. 在回答的最末尾，如果你有非常明确的操作建议，请附上一个 JSON 代码块，格式如下（不要输出其他多余字段）：
```json
{
  "actions":[
    { "type": "ENABLE_MOD", "title": "一键启用前置", "description": "...", "payload": { "mod_id": "需要启用的包名" } },
    { "type": "ADD_RULE", "title": "修正排序规则", "description": "...", "payload": { "mod_id": "主体包名", "rule_type": "load_after", "target_id": "必须在其后加载的包名" } },
    { "type": "DISABLE_MOD", "title": "停用冲突模组", "description": "...", "payload": { "mod_ids": ["冲突的包名"] } }
  ]
}
```
"""

        # 2. 组装对话流
        messages = [{"role": "system", "content": system_prompt}]
        
        # 将前端历史直接映射（前端需保证 role 和 content 格式正确）
        # 如果 history 中有之前生成的 JSON，尽量转成纯文本保留上下文
        for msg in history:
            if msg.get("role") in ["user", "assistant"]:
                # 如果历史消息是对象，尝试转为文本保留
                content = msg.get("content", "")
                if isinstance(content, dict):
                    content = json.dumps(content, ensure_ascii=False)
                messages.append({"role": msg["role"], "content": str(content)})

        # 3. 浓缩新日志并附加到当前问题
        user_content = question
        if diagnosis_context:
            user_content = f"以下是当前会话绑定的核心错误日志摘要：\n```json\n{json.dumps(diagnosis_context, ensure_ascii=False)}\n```\n\n用户的补充提问：{question}"
        
        messages.append({"role": "user", "content": user_content})

        llm_kwargs = self._get_litellm_kwargs()
        tools = self._get_diagnostic_tools()
        model_name = llm_kwargs.get("model", settings.config.ai.model)

        # 【新增】记录整个会话的累计 Token 和诊断轮次，供前端与调试日志使用。
        token_usage = {
            "estimated_prompt_tokens": 0,
            "estimated_completion_tokens": 0,
            "estimated_total_tokens": 0,
            "tool_rounds": 0,
            "forced_final_round": False,
            "model": model_name
        }

        logger.debug(
            f"[AI诊断] 会话开始 session_id={session_id} "
            f"history={len(history)} has_context={bool(diagnosis_context)} "
            f"context_items={len(diagnosis_context.get('error_table_of_contents', [])) if isinstance(diagnosis_context, dict) else 0}"
        )

        # 4. Agentic 循环 (ReAct)
        # 先允许模型进行若干轮“查证”，如果一直不收敛，再强制进入最终总结轮。
        max_loops = 20
        loop_count = 0

        while loop_count < max_loops:
            loop_count += 1
            try:
                prompt_tokens_this_round = self._estimate_messages_tokens(messages, model_name)
                token_usage["estimated_prompt_tokens"] += prompt_tokens_this_round
                token_usage["estimated_total_tokens"] += prompt_tokens_this_round
                logger.debug(
                    f"[AI诊断] 进入工具轮 session_id={session_id} loop={loop_count}/{max_loops} "
                    f"messages={len(messages)} prompt_tokens≈{prompt_tokens_this_round}"
                )
                stream_result = self._run_diagnostic_completion_with_fallback(
                    messages=messages,
                    llm_kwargs=llm_kwargs,
                    session_id=session_id,
                    tools=tools,
                    tool_choice="auto"
                )

                completion_payload = (
                    json.dumps(stream_result["tool_calls"], ensure_ascii=False)
                    if stream_result["is_tool_call"] else stream_result["final_text"]
                )
                output_tk = self._estimate_text_tokens(completion_payload, model_name)
                token_usage["estimated_completion_tokens"] += output_tk
                token_usage["estimated_total_tokens"] += output_tk

                # 如果模型决定调用工具
                if stream_result["is_tool_call"]:
                    token_usage["tool_rounds"] += 1
                    formatted_tool_calls = stream_result["tool_calls"]
                    messages.append({"role": "assistant", "content": "", "tool_calls": formatted_tool_calls})

                    logger.debug(
                        f"[AI诊断] 触发工具轮 session_id={session_id} loop={loop_count} "
                        f"tool_count={len(formatted_tool_calls)}"
                    )

                    # 逐个执行工具，并向前端推送状态
                    for tc in formatted_tool_calls:
                        func_name = tc["function"]["name"]
                        func_args = tc["function"]["arguments"]
                        tool_start_at = time.perf_counter()

                        # 通知前端：开始调用工具
                        EventBus.emit('ai-tool-call', {
                            'session_id': session_id,
                            'tool_id': tc["id"],
                            'name': func_name,
                            'arguments': func_args
                        })

                        # 执行工具
                        tool_result = self._execute_diagnostic_tool(func_name, func_args, active_context, payload=payload, reader=reader)
                        duration_ms = int((time.perf_counter() - tool_start_at) * 1000)

                        tool_ok = True
                        try:
                            parsed_tool_result = json.loads(tool_result)
                            if isinstance(parsed_tool_result, dict) and parsed_tool_result.get("error"):
                                tool_ok = False
                        except Exception:
                            parsed_tool_result = None

                        logger.debug(
                            f"[AI诊断] 工具完成 session_id={session_id} tool={func_name} "
                            f"ok={tool_ok} duration_ms={duration_ms} result_chars={len(tool_result or '')}"
                        )

                        # 通知前端：工具执行完毕
                        EventBus.emit('ai-tool-result', {
                            'session_id': session_id,
                            'tool_id': tc["id"],
                            'status': 'done' if tool_ok else 'error',
                            'duration_ms': duration_ms,
                            'summary': self._summarize_tool_result(func_name, tool_result),
                            'result': tool_result
                        })

                        messages.append({
                            "role": "tool", "tool_call_id": tc["id"], "name": func_name, "content": tool_result
                        })

                    continue

                # 如果没有工具调用，说明大模型完成了分析并输出了最后的内容
                final_response = self._parse_diagnostic_final_text(stream_result["final_text"])
                token_usage["estimated_total_tokens"] = (
                    token_usage["estimated_prompt_tokens"] + token_usage["estimated_completion_tokens"]
                )
                final_response["token_usage"] = token_usage

                logger.debug(
                    f"[AI诊断] 会话完成 session_id={session_id} loop={loop_count} "
                    f"analysis_chars={len(final_response.get('analysis', ''))} "
                    f"total_tokens≈{token_usage['estimated_total_tokens']}"
                )
                return final_response

            except Exception as e:
                logger.error(f"AI Diagnostic Error: {str(e)}", exc_info=True)
                token_usage["estimated_total_tokens"] = (
                    token_usage["estimated_prompt_tokens"] + token_usage["estimated_completion_tokens"]
                )
                return {
                    "analysis": "AI 推理链路在本轮处理中断。系统已记录详细调试日志，请优先展开上方工具步骤并结合后端 debug 日志继续定位。",
                    "actions": [],
                    "token_usage": token_usage
                }

        # 【关键改进】如果模型长时间沉迷工具调用，不再直接给“无法得出结论”，
        # 而是进入一次强制总结轮，禁止继续调工具，只基于已有证据收敛输出。
        logger.warning(f"[AI诊断] 工具轮达到上限，转入强制总结 session_id={session_id}")
        token_usage["forced_final_round"] = True
        forced_messages = messages + [{
            "role": "system",
            "content": (
                "你已经完成资料查阅。禁止继续调用任何工具。"
                "请直接基于当前证据给出最终诊断；如果证据仍不足，也要明确给出最可能的 1-3 个原因、"
                "证据依据，以及下一步建议用户如何验证。"
            )
        }]

        try:
            prompt_tokens_this_round = self._estimate_messages_tokens(forced_messages, model_name)
            token_usage["estimated_prompt_tokens"] += prompt_tokens_this_round
            logger.debug(
                f"[AI诊断] 强制总结开始 session_id={session_id} "
                f"messages={len(forced_messages)} prompt_tokens≈{prompt_tokens_this_round}"
            )
            stream_result = self._run_diagnostic_completion_with_fallback(
                messages=forced_messages,
                llm_kwargs=llm_kwargs,
                session_id=session_id,
                tools=None
            )
            token_usage["estimated_completion_tokens"] += self._estimate_text_tokens(stream_result["final_text"], model_name)
            token_usage["estimated_total_tokens"] = (
                token_usage["estimated_prompt_tokens"] + token_usage["estimated_completion_tokens"]
            )

            final_response = self._parse_diagnostic_final_text(stream_result["final_text"])
            if not final_response.get("analysis"):
                final_response["analysis"] = "AI 已完成查证，但没有生成有效总结文本。建议查看上方工具步骤详情，优先核对关键上下文和模组排序。"
            final_response["token_usage"] = token_usage

            logger.debug(
                f"[AI诊断] 强制总结完成 session_id={session_id} "
                f"analysis_chars={len(final_response.get('analysis', ''))} "
                f"total_tokens≈{token_usage['estimated_total_tokens']}"
            )
            return final_response
        except Exception as e:
            logger.error(f"AI Diagnostic Forced Summary Error: {str(e)}", exc_info=True)
            return {
                "analysis": "AI 已完成多轮资料查阅，但在最终收敛阶段发生异常。请查看步骤详情和调试日志继续定位。",
                "actions": [],
                "token_usage": token_usage
            }
    
    
    
    
