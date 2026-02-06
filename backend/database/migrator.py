from playhouse.migrate import SqliteMigrator, migrate
from backend.database.models import db, SystemInfo

def run_migrations(old_version):
    migrator = SqliteMigrator(db)
    
    # 策略：根据旧版本号，一级一级往上爬
    
    # 情况 1: 从版本 1 升级到版本 2
    # if old_version == "1":
    #     print("执行迁移: 1 -> 2")
    #     # 假设你在 Mod 表里新加了一个 'last_played_time' 字段
    #     from peewee import DateTimeField
    #     last_played_field = DateTimeField(null=True)
        
    #     with db.atomic():
    #         migrate(
    #             migrator.add_column('mod', 'last_played_time', last_played_field),
    #         )
    #     old_version = "2"

    # 情况 2: 从版本 2 升级到版本 3 ... (以此类推)
    # if old_version == "2":
    #     ...
    
    # 最后更新版本号
    SystemInfo.update(value=old_version).where(SystemInfo.key == 'db_version').execute()