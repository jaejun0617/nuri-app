import importlib.util
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location("nuri_disk", Path(__file__).parents[1] / "nuri-disk.py")
disk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(disk)


class DiskGuardTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.path = self.root / "build"
        self.path.mkdir()
        (self.path / "object.o").write_bytes(b"generated")
        self.item = (self.path, "A", 0, None, "temporary fixture")
        self.device = self.path.stat().st_dev
        self.free = disk.MINIMUM - 1
        self.events = []

    def measure(self):
        return {self.device: {"availableBytes": self.free}}

    def emit(self, event, **data):
        self.events.append((event, data))

    def rows(self, items=None):
        return disk.inventory(items or [self.item], lambda _: None)

    def apply(self, rows=None, items=None, check=lambda _: None):
        disk.apply(rows or self.rows(), items if items is not None else [self.item],
                   self.measure, self.emit, check)

    def test_removes_exact_target_and_rerun_is_noop(self):
        self.apply(self.rows([self.item, self.item]))
        self.assertFalse(self.path.exists())
        self.assertEqual([event for event, _ in self.events], ["deleting", "deleted"])
        self.assertEqual(self.rows(), [])
        self.apply()
        self.assertEqual(len(self.events), 2)

    def test_protected_artifacts_and_credentials_win(self):
        for name in ("candidate.apk", "output.map", "signing.properties", "test-results", "index.android.bundle"):
            with self.subTest(name=name):
                sentinel = self.path / name
                sentinel.write_bytes(b"protected")
                self.assertIn("protected entry", self.rows()[0]["reason"])
                self.apply()
                self.assertEqual(sentinel.read_bytes(), b"protected")
                sentinel.unlink()

    def test_symlinks_at_root_or_below_are_excluded(self):
        target = self.root / "target"
        target.mkdir()
        (self.path / "link").symlink_to(target, target_is_directory=True)
        self.assertIn("symlink", self.rows()[0]["reason"])
        link = self.root / "linked-root"
        link.symlink_to(target, target_is_directory=True)
        self.assertIn("linked path", self.rows([(link, *self.item[1:])])[0]["reason"])
        self.apply()
        self.assertTrue(target.exists())

    def test_duplicate_requires_independent_matching_archive(self):
        source, retained = self.root / "old.apk", self.root / "retained.apk"
        source.write_bytes(b"candidate")
        retained.write_bytes(b"candidate")
        proof = {"retained": str(retained), "sha256": disk.file_sha(source)}
        record = disk.reviewed_snapshot(source, "duplicate", proof)
        disk.erase(source, record["fingerprint"], "duplicate", proof)
        self.assertFalse(source.exists())
        self.assertEqual(retained.read_bytes(), b"candidate")
        source.hardlink_to(retained)
        with self.assertRaisesRegex(ValueError, "independent"):
            disk.reviewed_snapshot(source, "duplicate", proof)
        source.unlink()
        source.write_bytes(b"another candidate")
        with self.assertRaisesRegex(ValueError, "do not match"):
            disk.reviewed_snapshot(source, "duplicate", proof)

    def test_reviewed_dependency_requires_same_install_inputs_and_tree(self):
        evidence = self.root / "compare.txt"
        lock = self.root / "yarn.lock"
        evidence.write_text("compared with immutable install")
        lock.write_text("lock v1")
        internal = self.path / "internal"
        internal.symlink_to(self.path / "object.o")
        proof = {"inputs": {"yarn.lock": disk.file_sha(lock)}, "evidence": str(evidence),
                 "evidenceSha256": disk.file_sha(evidence),
                 "fingerprint": disk.snapshot(self.path, "D")["fingerprint"]}
        disk.reviewed_snapshot(self.path, "D", proof)
        internal.unlink()
        internal.symlink_to(evidence)
        with self.assertRaisesRegex(ValueError, "symlink"):
            disk.reviewed_snapshot(self.path, "D", proof)
        lock.write_text("lock v2")
        with self.assertRaisesRegex(ValueError, "input changed"):
            disk.reviewed_snapshot(self.path, "D", proof)

    def test_qa_duplicate_requires_unchanged_evidence_and_retained_bytes(self):
        source, retained = self.root / "repeat.mp4", self.root / "retained.mp4"
        source.write_bytes(b"capture")
        retained.write_bytes(b"capture")
        evidence = self.root / "closeout.md"
        evidence.write_text("Retained representative")
        proof = {"retained": str(retained), "sha256": disk.file_sha(source),
                 "evidence": str(evidence), "evidenceSha256": disk.file_sha(evidence)}
        record = disk.reviewed_snapshot(source, "qa-duplicate", proof)
        evidence.write_text("Changed closeout")
        with self.assertRaisesRegex(ValueError, "evidence changed"):
            disk.erase(source, record["fingerprint"], "qa-duplicate", proof)
        self.assertTrue(source.exists())
        evidence.write_text("Retained representative")
        retained.write_bytes(b"another capture")
        with self.assertRaisesRegex(ValueError, "do not match"):
            disk.erase(source, record["fingerprint"], "qa-duplicate", proof)
        self.assertTrue(source.exists())
        retained.write_bytes(b"capture")
        disk.erase(source, record["fingerprint"], "qa-duplicate", proof)
        self.assertFalse(source.exists())
        self.assertEqual(retained.read_bytes(), b"capture")

    def test_reviewed_recovery_can_continue_above_normal_target(self):
        self.free = disk.TARGET
        targets = disk.cleanup_targets(self.measure() | {0: {"availableBytes": 80 * disk.GIB}}, 1)
        self.assertEqual(targets, {self.device: 36 * disk.GIB, 0: 81 * disk.GIB})
        disk.apply(self.rows(), [self.item], self.measure, self.emit,
                   lambda _: None, targets=targets)
        self.assertFalse(self.path.exists())

    def test_changed_or_disappeared_candidate_is_not_deleted(self):
        rows = self.rows()
        (self.path / "object.o").write_bytes(b"replacement")
        self.apply(rows)
        self.assertTrue(self.path.exists())
        self.assertEqual(self.events[-1][1]["reason"], "candidate changed")
        self.path.rename(self.root / "old")
        self.apply(rows)
        self.assertIn("absent", self.events[-1][1]["reason"])

    def test_only_live_allowlist_is_executable(self):
        self.apply(items=[])
        self.assertEqual(self.events[-1][1]["reason"], "outside allowlist")
        self.assertTrue(self.path.exists())

    def test_busy_candidate_is_rechecked(self):
        self.apply(check=lambda _: "still in use")
        self.assertEqual(self.events[-1][1]["reason"], "still in use")
        self.assertTrue(self.path.exists())

    def test_second_cleanup_cannot_take_build_lease(self):
        lock = self.root / "private"
        with disk.lease(lock), self.assertRaises(BlockingIOError):
            with disk.lease(lock):
                self.fail("second process acquired the lease")
        with disk.lease(lock):
            pass

    def test_no_cleanup_when_space_sufficient(self):
        self.free = disk.TARGET
        self.apply()
        self.assertEqual(self.events, [])
        self.assertTrue(self.path.exists())

    def test_recovery_can_continue_to_the_cleanup_target(self):
        self.free = disk.MINIMUM
        item = (self.path, "B", 2, None, "fixture")
        self.apply(self.rows([item]), [item])
        self.assertFalse(self.path.exists())
        self.assertEqual([event for event, _ in self.events], ["deleting", "deleted"])

    def test_prebuild_checks_all_volumes_and_accepts_exact_minimum(self):
        calls = []

        def spawn(command, **kwargs):
            calls.append((command, kwargs))
            return SimpleNamespace(returncode=17)

        full = {"shortToMinimumBytes": 0}
        low = {"shortToMinimumBytes": 1}
        self.assertEqual(disk.launch(["fixture"], {1: full, 2: low}, 5, spawn), 75)
        self.assertEqual(calls, [])
        self.assertEqual(disk.launch(["fixture"], {1: full}, 5, spawn), 17)
        self.assertEqual(calls, [(["fixture"], {"check": False, "pass_fds": (5,)})])

    def test_overlap_never_deletes_twice(self):
        child = self.path / "intermediate"
        child.mkdir()
        nested = (child, *self.item[1:])
        self.assertEqual(len(self.rows([self.item, nested])), 1)
        with self.assertRaisesRegex(ValueError, "overlapping"):
            self.rows([nested, self.item])

    def test_partial_removal_retains_receipt_and_continues(self):
        def fail(*_):
            raise OSError("fixture refusal")
        disk.apply(self.rows(), [self.item], self.measure, self.emit, lambda _: None, fail)
        self.assertEqual([event for event, _ in self.events], ["deleting", "delete-error"])
        self.assertTrue(self.path.exists())


if __name__ == "__main__":
    unittest.main()
