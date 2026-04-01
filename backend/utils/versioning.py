import re
from typing import Iterable


def extract_major_game_version(version: str) -> str:
    """
    提取主版本号。

    示例：
    - 1.5.4069 rev95 -> 1.5
    - 1.6 -> 1.6
    - 1 -> 1
    """
    text = str(version or "").strip()
    if not text:
        return ""
    match = re.search(r"(\d+)(?:\.(\d+))?", text)
    if not match:
        return ""
    major = match.group(1)
    minor = match.group(2)
    return f"{major}.{minor}" if minor is not None else major


def matches_major_game_version(current_version: str, candidate_version: str) -> bool:
    current_major = extract_major_game_version(current_version)
    candidate_major = extract_major_game_version(candidate_version)
    if not current_major or not candidate_major:
        return False
    return current_major == candidate_major


def score_version_support(current_version: str, candidate_versions: Iterable[str] | None) -> int:
    """
    版本支持打分。

    返回值：
    - 2: 存在主版本匹配
    - 1: 没提供版本信息
    - 0: 明确存在版本列表，但没有匹配
    """
    values = [str(v or "").strip() for v in (candidate_versions or []) if str(v or "").strip()]
    if not values:
        return 1
    return 2 if any(matches_major_game_version(current_version, value) for value in values) else 0
