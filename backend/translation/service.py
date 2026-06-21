from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Protocol

from backend.i18n.language_registry import get_language_label, normalize_language_code
from backend.translation.contracts import TranslationDocument, TranslationResult, TranslationSegment


TRANSLATION_SOURCE_HASH_PREFIX = "translation_document"
DEFAULT_TRANSLATION_PROVIDER = "ai.default"


class TranslationProvider(Protocol):
    id: str
    label: str
    type: str

    def translate(self, document: TranslationDocument, target_language: str) -> list[TranslationSegment]: ...


class AITranslationProvider:
    id = DEFAULT_TRANSLATION_PROVIDER
    label = "AI 翻译"
    type = "ai"

    def __init__(self, ai_mgr: Any):
        self.ai_mgr = ai_mgr

    def translate(self, document: TranslationDocument, target_language: str) -> list[TranslationSegment]:
        target_label = get_language_label(target_language, default=target_language)
        glossary_lines = [
            f"- {term.source} => {term.target or '(按上下文处理)'}{f'；{term.note}' if term.note else ''}"
            for term in document.glossary
        ]
        parsed = self.ai_mgr.execute_structured_task(
            "task.translation",
            {
                "variables": {
                    "target_lang": target_label,
                    "source_format": document.format,
                    "translation_context": document.context,
                    "glossary_block": "\n".join(glossary_lines),
                    "translation_input_json": json.dumps(document.to_prompt_payload(), ensure_ascii=False),
                }
            },
        )
        if not isinstance(parsed, dict):
            raise ValueError("翻译器返回格式无效")

        raw_segments = parsed.get("segments")
        if not isinstance(raw_segments, list):
            raise ValueError("翻译器返回格式无效")

        source_roles = {segment.key: segment.role for segment in document.segments}
        source_keys = set(source_roles)
        translated: list[TranslationSegment] = []
        seen_keys: set[str] = set()
        for item in raw_segments:
            if not isinstance(item, dict):
                continue
            key = str(item.get("key") or "").strip()
            if not key or key not in source_keys or key in seen_keys:
                continue
            seen_keys.add(key)
            translated.append(TranslationSegment(key=key, text=str(item.get("text") or ""), role=source_roles.get(key, "body")))
        if not translated:
            raise ValueError("翻译器未返回有效译文")
        return translated


class TranslationManager:
    """通用翻译入口；调用方传入文档，管理器返回同 key 的译文段。"""

    def __init__(self, ai_mgr: Any):
        self.providers: dict[str, TranslationProvider] = {
            DEFAULT_TRANSLATION_PROVIDER: AITranslationProvider(ai_mgr),
        }

    def list_providers(self) -> list[dict[str, str]]:
        return [
            {"id": provider.id, "label": provider.label, "type": provider.type}
            for provider in self.providers.values()
        ]

    def provider_requires_ai(self, provider_id: str) -> bool:
        provider_key = str(provider_id or "").strip() or DEFAULT_TRANSLATION_PROVIDER
        provider = self.providers.get(provider_key)
        return bool(provider and provider.type == "ai")

    @staticmethod
    def build_source_hash(document: TranslationDocument) -> str:
        payload = {
            "segments": [
                {
                    "key": segment.key,
                    "text": str(segment.text or "").replace("\r\n", "\n").strip(),
                }
                for segment in document.segments
            ],
        }
        source_text = f"{TRANSLATION_SOURCE_HASH_PREFIX}\n{json.dumps(payload, ensure_ascii=False, sort_keys=True)}"
        return hashlib.sha256(source_text.encode("utf-8")).hexdigest()

    def translate_document(self, document: TranslationDocument, target_language: Any, *, provider_id: str = DEFAULT_TRANSLATION_PROVIDER) -> TranslationResult:
        language_code = normalize_language_code(target_language)
        if not language_code:
            raise ValueError("目标语言不能为空")
        if not document.segments:
            raise ValueError("没有可翻译的文本")
        provider_key = str(provider_id or "").strip() or DEFAULT_TRANSLATION_PROVIDER
        provider = self.providers.get(provider_key)
        if not provider:
            raise ValueError("当前翻译器不可用")

        source_hash = self.build_source_hash(document)
        segments = provider.translate(document, language_code)
        return TranslationResult(
            target_language=language_code,
            source_hash=source_hash,
            provider=provider.id,
            segments=segments,
            updated_at=int(time.time() * 1000),
        )
