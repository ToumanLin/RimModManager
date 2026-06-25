import shutil
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pack_pyinstaller
import validate_environment
from backend.managers.mgr_files import PathChecker
from backend.managers.mgr_steam import SteamManager
from backend.managers.mgr_texture_opt import ToddsEncoder, TextureOptimizationManager


class TestMacStartupValidation(unittest.TestCase):
    def test_validate_environment_skips_webview2_requirement_on_macos(self):
        with patch.object(validate_environment.sys, "platform", "darwin"), \
             patch.object(validate_environment, "get_entrypoint", return_value="http://localhost:5173"), \
             patch.object(validate_environment, "get_webview2_version", side_effect=AssertionError("should not run")):
            validate_environment.validate_environment(require_webview2=True)


class TestMacPathChecks(unittest.TestCase):
    def setUp(self):
        self.temp_root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.temp_root, ignore_errors=True)

    def test_steam_path_accepts_app_bundle(self):
        steam_bundle = self.temp_root / "Steam.app" / "Contents" / "MacOS"
        steam_bundle.mkdir(parents=True)
        (steam_bundle / "steam_osx").write_text("", encoding="utf-8")

        with patch("backend.managers.mgr_files.platform.system", return_value="Darwin"):
            result = PathChecker.check_steam_path(str(self.temp_root / "Steam.app"))

        self.assertTrue(result["pass"])

    def test_steamcmd_and_todds_use_unix_names(self):
        steamcmd_dir = self.temp_root / "steamcmd"
        steamcmd_dir.mkdir()
        (steamcmd_dir / "steamcmd.sh").write_text("", encoding="utf-8")
        todds_dir = self.temp_root / "texture_tools"
        todds_dir.mkdir()
        (todds_dir / "todds").write_text("", encoding="utf-8")

        with patch("backend.managers.mgr_files.platform.system", return_value="Darwin"):
            steamcmd_result = PathChecker.check_steamcmd_path(str(steamcmd_dir))
            todds_result = PathChecker.check_texture_tools_path(str(todds_dir))

        self.assertTrue(steamcmd_result["pass"])
        self.assertTrue(todds_result["pass"])


class TestMacSteamManager(unittest.TestCase):
    def setUp(self):
        self.temp_root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.temp_root, ignore_errors=True)

    def test_get_steam_path_finds_steam_app(self):
        bundle_root = self.temp_root / "Applications" / "Steam.app" / "Contents" / "MacOS"
        bundle_root.mkdir(parents=True)
        (bundle_root / "steam_osx").write_text("", encoding="utf-8")
        manager = SteamManager.__new__(SteamManager)

        with patch("backend.managers.mgr_steam.platform.system", return_value="Darwin"), \
             patch("backend.managers.mgr_steam.Path.home", return_value=self.temp_root):
            result = SteamManager.get_steam_path(manager)
            result_exe = SteamManager.get_steam_path(manager, with_exe=True)

        self.assertTrue(str(result).endswith("Steam.app"))
        self.assertTrue(str(result_exe).endswith("steam_osx"))

    def test_post_download_setup_extracts_tar_gz(self):
        archive_dir = self.temp_root / "archives"
        archive_dir.mkdir()
        archive_path = archive_dir / "steamcmd.tar.gz"
        payload_dir = self.temp_root / "payload"
        payload_dir.mkdir()
        (payload_dir / "steamcmd.sh").write_text("#!/bin/sh\n", encoding="utf-8")
        with tarfile.open(archive_path, "w:gz") as archive:
            archive.add(payload_dir / "steamcmd.sh", arcname="steamcmd.sh")

        manager = SteamManager.__new__(SteamManager)
        manager.steamcmd_dir = str(self.temp_root / "steamcmd")
        Path(manager.steamcmd_dir).mkdir()
        manager.steamcmd_ready = False

        SteamManager.post_download_setup(manager, "steamcmd", str(archive_path))

        self.assertTrue((Path(manager.steamcmd_dir) / "steamcmd.sh").exists())
        self.assertTrue(manager.steamcmd_ready)


class TestMacToddsSupport(unittest.TestCase):
    def setUp(self):
        self.temp_root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.temp_root, ignore_errors=True)

    def test_todds_resolve_executable_accepts_unix_binary(self):
        tool_dir = self.temp_root / "texture_tools"
        tool_dir.mkdir()
        executable = tool_dir / "todds"
        executable.write_text("", encoding="utf-8")

        with patch("backend.managers.mgr_texture_opt.platform.system", return_value="Darwin"):
            resolved = ToddsEncoder({"texture_tools_path": str(tool_dir)}).resolve_executable()

        self.assertEqual(resolved, executable)

    def test_prepare_tool_download_uses_darwin_asset_prefix(self):
        manager = TextureOptimizationManager()
        captured = {}

        def fake_install(_self, _download_mgr, request):
            captured["request"] = request
            return "task-1"

        with patch("backend.managers.mgr_texture_opt.platform.system", return_value="Darwin"), \
             patch("backend.managers.mgr_texture_opt.platform.machine", return_value="arm64"), \
             patch.object(TextureOptimizationManager, "get_backend_status", return_value={"available": False}), \
             patch("backend.managers.mgr_github.GithubManager.install_from_github", new=fake_install):
            result = manager.prepare_tool_download(object(), {"texture_tools_path": str(self.temp_root / "texture_tools")})

        self.assertEqual(result, {"already_ready": False})
        self.assertEqual(captured["request"].artifact.asset_name_prefix, "todds_Darwin_arm64_")


class TestPackPyinstallerHelpers(unittest.TestCase):
    def test_data_arg_uses_colon_on_posix(self):
        with patch.object(pack_pyinstaller.os, "name", "posix"):
            self.assertEqual(pack_pyinstaller._pyinstaller_data_arg("a", "b"), "a:b")


if __name__ == "__main__":
    unittest.main()
