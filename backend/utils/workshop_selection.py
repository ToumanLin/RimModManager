from typing import Any

from backend.utils.versioning import score_version_support


def normalize_workshop_id(workshop_id: Any, min_length: int = 7, max_length: int = 20) -> str:
    """
    统一规范化 workshop id。

    规则尽量稳但不死板：
    - 必须是纯数字
    - 默认长度不少于 7 位
    - 默认长度不超过 20 位
    - 0 或全 0 视为无效
    """

    value = str(workshop_id or "").strip()
    if not value:
        return ""
    if not value.isdigit():
        return ""
    if len(value) < min_length or len(value) > max_length:
        return ""
    if int(value) == 0:
        return ""
    return value


def _normalize_package_id(package_id: Any) -> str:
    return str(package_id or "").strip().lower()


def _candidate_sort_key(current_game_version: str, candidate: dict[str, Any]):
    return (
        score_version_support(current_game_version, candidate.get("game_versions")),
        int(candidate.get("time_updated") or 0),
        1 if candidate.get("author") else 0,
        candidate.get("workshop_id") or "",
    )


def _build_meta_candidate(meta: dict[str, Any]) -> dict[str, Any] | None:
    workshop_id = normalize_workshop_id(meta.get("workshop_id"))
    if not workshop_id:
        return None
    return {
        "workshop_id": workshop_id,
        "package_id": _normalize_package_id(meta.get("package_id")),
        "name": meta.get("title") or meta.get("name") or "",
        "author": meta.get("author"),
        "preview_url": meta.get("preview_url"),
        "time_updated": int(meta.get("time_updated") or 0),
        "game_versions": list(meta.get("game_versions") or []),
        "is_replacement_derived": False,
        "selection_reason": "meta",
    }


def _build_replacement_candidate(package_id: str, replacement: dict[str, Any], replacement_meta: dict[str, Any] | None) -> dict[str, Any] | None:
    workshop_id = normalize_workshop_id(replacement.get("new_workshop_id"))
    if not workshop_id:
        return None

    if replacement_meta:
        return {
            "workshop_id": workshop_id,
            "package_id": _normalize_package_id(replacement_meta.get("package_id") or replacement.get("new_package_id") or package_id),
            "name": replacement_meta.get("title") or replacement_meta.get("name") or replacement.get("new_name") or "",
            "author": replacement_meta.get("author"),
            "preview_url": replacement_meta.get("preview_url"),
            "time_updated": int(replacement_meta.get("time_updated") or 0),
            "game_versions": list(replacement_meta.get("game_versions") or replacement.get("new_versions") or []),
            "is_replacement_derived": True,
            "selection_reason": "replacement_meta",
        }

    return {
        "workshop_id": workshop_id,
        "package_id": _normalize_package_id(replacement.get("new_package_id") or package_id),
        "name": replacement.get("new_name") or "",
        "author": "",
        "preview_url": "",
        "time_updated": 0,
        "game_versions": list(replacement.get("new_versions") or []),
        "is_replacement_derived": True,
        "selection_reason": "replacement_rule",
    }


def select_best_workshop_detail_for_package(
    package_id: str,
    meta_candidates: list[dict[str, Any]] | None,
    replacement_candidates: list[dict[str, Any]] | None,
    replacement_meta_map: dict[str, dict[str, Any]] | None = None,
    current_game_version: str = "",
) -> dict[str, Any] | None:
    """
    为一个 package_id 选择最佳 workshop 候选。

    策略：
    1. 先看替代关系；如果存在 replacement 候选，优先在替代池中决策
    2. 否则在同包名候选池中决策
    3. 决策顺序：
       - 是否支持当前主版本
       - time_updated 最近
       - 有作者信息优先
    """

    normalized_package_id = _normalize_package_id(package_id)
    replacement_meta_map = replacement_meta_map or {}

    direct_pool: dict[str, dict[str, Any]] = {}
    for meta in meta_candidates or []:
        candidate = _build_meta_candidate(meta)
        if candidate:
            direct_pool[candidate["workshop_id"]] = candidate

    replacement_pool: dict[str, dict[str, Any]] = {}
    for replacement in replacement_candidates or []:
        replacement_meta = replacement_meta_map.get(normalize_workshop_id(replacement.get("new_workshop_id")))
        candidate = _build_replacement_candidate(normalized_package_id, replacement, replacement_meta)
        if candidate:
            replacement_pool[candidate["workshop_id"]] = candidate

    pool = list(replacement_pool.values()) if replacement_pool else list(direct_pool.values())
    if not pool:
        return None

    best = max(pool, key=lambda candidate: _candidate_sort_key(current_game_version, candidate))
    return {
        "package_id": best["package_id"] or normalized_package_id,
        "package_id_raw": best["package_id"] or normalized_package_id,
        "workshop_id": best["workshop_id"],
        "url": f"https://steamcommunity.com/sharedfiles/filedetails/?id={best['workshop_id']}",
        "name": best["name"] or normalized_package_id,
        "author": [best["author"]] if best.get("author") else [],
        "preview_url": best.get("preview_url"),
        "is_replacement_derived": bool(best.get("is_replacement_derived")),
        "selection_reason": best.get("selection_reason"),
        "candidate_count": len(pool),
    }
