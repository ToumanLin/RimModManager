# backend/_version.py
__version__ = "0.18.5"  # 主版本.次版本.补丁
__db_version__ = "4"
__build__ = "dev"      # dev, alpha, beta, stable, release

# 结构化更新日志：按版本从新到旧排列
# type 支持: "feature" (新增), "fix" (修复), "optimize" (优化), "breaking" (重大变更)
APP_CHANGELOG = [
    {
        "version": "0.2.0",
        "date": "2025-12-07",
        "changes": [
            {"type": "feature", "text": "初版，奠定基础架构"}
        ]
    }
]

def get_all_changelogs():
    """
    获取全量结构化日志给前端，由前端根据 old_version 决定显示增量还是全量
    """
    return APP_CHANGELOG