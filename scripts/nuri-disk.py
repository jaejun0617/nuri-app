#!/usr/bin/env python3
"""Local NURI build-space guard. The default command only reports."""

import argparse
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile

GIB = 1024 ** 3
MINIMUM, TARGET = 25 * GIB, 35 * GIB
ROOT = Path(__file__).resolve().parent.parent
APP_PARTS = (
    "generated/res", "kotlin", "tmp",
    *("intermediates/" + x for x in (
        "merged_res", "linked_resources_binary_format", "packaged_res",
        "stripped_native_libs", "dex", "compressed_assets", "incremental",
        "merged_res_blame_folder", "project_dex_archive", "compile_and_runtime_r_class_jar",
    )),
)
LIB_PARTS = (
    ".cxx", "build/kotlin", "build/tmp", "build/generated",
    *("build/intermediates/" + x for x in (
        "cmake", "cxx", "library_jni", "merged_native_libs", "stripped_native_libs",
        "javac", "runtime_library_classes_dir", "runtime_library_classes_jar",
        "compile_library_classes_jar", "incremental", "dex", "project_dex_archive",
    )),
)
PROTECTED = re.compile(
    r"^(?:\.git|\.env.*|.*(?:receipt|evidence|capture|provenance|sourcemaps?|keystore|signing|secret|credential).*|"
    r"reports?|test-results|outputs|native[-_]debug[-_]symbols|mapping\.txt|google-services\.json|"
    r"local\.properties|gradle\.properties|.*\.(?:apk|apks|aab|ipa|jks|p12|pfx|pem|key|cer|"
    r"mobileprovision|map|sym|dsym|mp4|mov|heapsnapshot)|"
    r"index\.android\.bundle)$", re.I,
)
SOURCE_SUFFIXES = {".kt", ".kts", ".java", ".c", ".cpp", ".h", ".hpp", ".ts", ".tsx", ".sh", ".py"}
ACTIVE = re.compile(
    r"GradleDaemon|GradleWrapperMain|KotlinCompileDaemon|^(?:(?:/\S*/)?(?:bash|sh)\s+)?\S*gradlew(?:\s|$)|"
    r"(?:^|[/\s])(?:ninja|cmake|kotlinc|clang(?:\+\+)?|hermesc)(?:\s|$)|"
    r"com\.intellij\.idea\.Main|react-native\s+(?:start|bundle|run-android)|"
    r"metro/(?:src/)?cli|(?:^|[/\s])jest(?:\s|$)"
)


def run(*args, cwd=None):
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True, timeout=30, check=False)


def real_dir(path):
    if not path.is_absolute() or path == Path("/") or path.resolve(strict=True) != path:
        raise ValueError("noncanonical or linked path")
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid():
        raise ValueError("not an owned directory")
    return info


def snapshot(path, category="A"):
    base = real_dir(path)
    digest = hashlib.sha256()
    logical = allocated = 0
    stack = [path]
    while stack:
        entry = stack.pop()
        info = entry.lstat()
        if info.st_dev != base.st_dev or info.st_uid != os.getuid():
            raise ValueError("different volume or owner")
        # Compiled classes and dex may legitimately include "Capture" or "Credential" in the type name.
        if entry != path and (
            (entry.suffix not in {".class", ".dex"} and PROTECTED.fullmatch(entry.name))
            or (category == "A" and entry.suffix.lower() in SOURCE_SUFFIXES)
        ):
            raise ValueError(f"protected entry: {entry.relative_to(path)}")
        if stat.S_ISDIR(info.st_mode):
            stack.extend(sorted(entry.iterdir(), reverse=True))
        elif stat.S_ISREG(info.st_mode):
            logical += info.st_size
        else:
            raise ValueError(f"symlink or special file: {entry.relative_to(path)}")
        digest.update(repr((str(entry.relative_to(path)), info.st_dev, info.st_ino, info.st_mode,
                            info.st_size, info.st_mtime_ns, info.st_ctime_ns)).encode())
        # Hard-linked files are not credited as recoverable blocks.
        if stat.S_ISDIR(info.st_mode) or info.st_nlink == 1:
            allocated += info.st_blocks * 512
    return {"fingerprint": digest.hexdigest(), "device": base.st_dev,
            "logicalBytes": logical, "allocatedBytes": allocated}


def volumes(paths):
    result = {}
    for path in paths:
        existing = path
        while not existing.exists():
            existing = existing.parent
        existing = existing.resolve(strict=True)
        device = existing.stat().st_dev
        v = result.setdefault(device, {"device": device, "paths": []})
        v["paths"].append(str(path))
        s = os.statvfs(existing)
        v["availableBytes"] = s.f_bavail * s.f_frsize
        v["availableGiB"] = round(v["availableBytes"] / GIB, 3)
        v["shortToMinimumBytes"] = max(0, MINIMUM - v["availableBytes"])
        v["shortToTargetBytes"] = max(0, TARGET - v["availableBytes"])
    return result


def inactive(path):
    if process_state():
        return "build or test active, or process state unavailable"
    return open_files(path)


def open_files(path):
    files = run("/usr/sbin/lsof", "-nP", "+D", str(path))
    if files.returncode != 1 or files.stdout or files.stderr:
        return "open files or file-use check unavailable"
    return None


def open_inventory():
    files = run("/usr/sbin/lsof", "-nP", "-Fn", "-u", str(os.getuid()))
    if files.returncode or not files.stdout.startswith("p") or files.stderr:
        return lambda _: "file-use inventory unavailable"
    opened = [Path(line[1:]) for line in files.stdout.splitlines() if line.startswith("n/")]
    return lambda path: ("open files" if any(path == p or path in p.parents for p in opened) else None)


def process_state():
    processes = run("/bin/ps", "-axww", "-o", "pid=,command=")
    if processes.returncode or not processes.stdout:
        return True
    return any(ACTIVE.search(fields[1]) for line in processes.stdout.splitlines()
               if len(fields := line.split(None, 1)) == 2 and fields[0] != str(os.getpid()))


def project_ok(root, candidate):
    rel = str(candidate.relative_to(root))
    tracked = run("git", "ls-files", "-z", "--", rel, cwd=root)
    ignored = run("git", "check-ignore", "-q", "--", rel, cwd=root)
    return tracked.returncode == 0 and not tracked.stdout and ignored.returncode == 0


def qa_roots(catalog):
    if not catalog.exists():
        return []
    info = catalog.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o022:
        raise ValueError("invalid completed-work catalog")
    data = json.loads(catalog.read_text())
    if not isinstance(data, list):
        raise ValueError("completed-work catalog must contain a list")
    result = []
    base = Path.home() / ".codex"
    for row in data:
        root = Path(row["root"])
        evidence = Path(row["evidence"])
        parent = root.parent
        if (root.name not in {"app", "source", "snapshot"} or parent.parent != base
                or not parent.name.startswith("nuri-") or parent.name == "nuri-disk-runs"
                or parent not in evidence.parents or root in evidence.parents
                or evidence.resolve(strict=True) != evidence or not evidence.is_file()):
            raise ValueError("QA copy or closeout evidence outside the allowed layout")
        real_dir(root)
        if (json.loads((root / "package.json").read_text()).get("name") != "nuri"
                or not (root / "android/gradlew").is_file()):
            raise ValueError("not a NURI QA source copy")
        result.append((root, evidence))
    return result


def library_modules(root):
    modules = root / "node_modules"
    if not modules.is_dir() or modules.is_symlink():
        return
    for entry in sorted(modules.iterdir()):
        if not entry.is_dir() or entry.is_symlink() or entry.name.startswith("."):
            continue
        packages = sorted(entry.iterdir()) if entry.name.startswith("@") else [entry]
        for package in packages:
            android = package / "android"
            if (not package.is_symlink() and not android.is_symlink()
                    and ((android / "build.gradle").is_file() or (android / "build.gradle.kts").is_file())):
                yield android


def candidates(root, completed, gradle):
    specs = []
    for project, evidence in [*completed, (root, None)]:
        priority = 0 if evidence else 1
        android = project / "android"
        targets = [android / p for p in (
            ".gradle", "build/generated", "app/.cxx",
            "build/nuri-local-cache/tests", "build/nuri-local-cache/metro",
            "build/nuri-local-cache/compile",
            *("app/build/" + p for p in APP_PARTS),
        )]
        targets.extend(lib / p for lib in library_modules(project) for p in LIB_PARTS)
        for target in targets:
            specs.append((target, "A", priority, project if not evidence else None,
                          str(evidence) if evidence else "current NURI Git worktree"))
    wrapper = (root / "android/gradle/wrapper/gradle-wrapper.properties").read_text()
    version = re.search(r"/gradle-(\d+\.\d+(?:\.\d+)?)-(?:bin|all)\.zip", wrapper)
    if version:
        cache = gradle / "caches"
        specs.extend((cache / p, "B", 2, None, "Gradle " + version[1]) for p in (
            "build-cache-1", version[1] + "/transforms", version[1] + "/generated-gradle-jars",
            version[1] + "/kotlin-dsl", version[1] + "/groovy-dsl",
            *[p.name for p in cache.glob("jars-*") if re.fullmatch(r"jars-\d+", p.name)],
        ))
    return specs


def inspect(spec, check=inactive):
    path, category, priority, project, origin = spec
    row = {"path": str(path), "category": category, "priority": priority, "origin": origin,
           "rebuild": "NURI Gradle regenerates the selected outputs" if category == "A"
           else "Gradle regenerates local artifacts from retained dependencies"}
    try:
        row.update(snapshot(path, category))
        if project and not project_ok(project, path):
            raise ValueError("Git path not ignored or contains tracked content")
        reason = check(path)
        if reason:
            raise ValueError(reason)
        row["status"] = "eligible"
    except FileNotFoundError:
        row.update(status="excluded", reason="absent or changed during inventory")
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        row.update(status="excluded", reason=str(exc))
    return row


def inventory(specs, check=None):
    if check is None:
        busy = process_state()
        check = (lambda _: "build or test active, or process state unavailable") if busy else open_inventory()
    seen = set()
    rows = []
    for spec in specs:
        path = spec[0]
        if not path.exists() and not path.is_symlink():
            continue
        if path in seen or any(parent in seen for parent in path.parents):
            continue
        if any(path in previous.parents for previous in seen):
            raise ValueError("overlapping candidate scope")
        seen.add(path)
        rows.append(inspect(spec, check))
    return sorted(rows, key=lambda row: (row["priority"], -row.get("allocatedBytes", 0), row["path"]))


def erase(path, fingerprint, category):
    if not shutil.rmtree.avoids_symlink_attacks:
        raise ValueError("symlink-safe removal unavailable")
    parent = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        parent_stat = os.fstat(parent)
        live_parent = path.parent.lstat()
        if (parent_stat.st_dev, parent_stat.st_ino) != (live_parent.st_dev, live_parent.st_ino):
            raise ValueError("parent changed")
        if snapshot(path, category)["fingerprint"] != fingerprint:
            raise ValueError("candidate changed at deletion")
        shutil.rmtree(path.name, dir_fd=parent)
    finally:
        os.close(parent)


def apply(rows, specs, measure, emit, check=inactive, remove=erase):
    by_path = {str(spec[0]): spec for spec in specs}
    for row in rows:
        if row["status"] != "eligible":
            continue
        volume = measure().get(row["device"])
        if not volume or volume["availableBytes"] >= TARGET:
            continue
        if row["category"] == "B" and volume["availableBytes"] >= MINIMUM:
            continue
        spec = by_path.get(row["path"])
        if not spec:
            emit("skipped", path=row["path"], reason="outside allowlist")
            continue
        current = inspect(spec, check)
        if current["status"] != "eligible" or current.get("fingerprint") != row.get("fingerprint"):
            emit("skipped", path=row["path"], reason=current.get("reason", "candidate changed"),
                 plannedFingerprint=row.get("fingerprint"), currentFingerprint=current.get("fingerprint"))
            continue
        emit("deleting", candidate=row, volume=volume)
        try:
            remove(spec[0], row["fingerprint"], spec[1])
        except (OSError, ValueError) as exc:
            emit("delete-error", path=row["path"], reason=str(exc), volumes=measure())
        else:
            emit("deleted", path=row["path"], volumes=measure())


def launch(command, final, lock, spawn=subprocess.run):
    if any(v["shortToMinimumBytes"] for v in final.values()):
        print("NURI native build blocked: less than 25 GiB on a required volume.", file=sys.stderr)
        return 75
    return spawn(command, check=False, pass_fds=(lock,)).returncode if command else 0


@contextlib.contextmanager
def lease(base):
    base.mkdir(mode=0o700, exist_ok=True)
    info = real_dir(base)
    if stat.S_IMODE(info.st_mode) & 0o077:
        raise ValueError("receipt directory must be private")
    fd = os.open(base / "local-build.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield lock.fileno()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", nargs="?", default="report", choices=("report", "apply-approved", "prebuild"))
    parser.add_argument("--plan", type=Path, help="revalidate the exact candidates from a saved report")
    argv = sys.argv[1:]
    split = argv.index("--") if "--" in argv else len(argv)
    args = parser.parse_args(argv[:split])
    command = argv[split + 1:]
    if command and args.mode != "prebuild":
        parser.error("only prebuild can run a command")
    if args.plan and args.mode != "apply-approved":
        parser.error("--plan is for apply-approved")
    base = Path.home() / ".codex" / "nuri-disk-runs"
    gradle = Path(os.environ.get("GRADLE_USER_HOME", str(Path.home() / ".gradle")))
    if not gradle.is_absolute() or gradle.resolve() != gradle:
        raise ValueError("GRADLE_USER_HOME must be absolute and canonical")
    spec = candidates(ROOT, qa_roots(base / "completed-qa.json"), gradle)
    measure = lambda: volumes((ROOT / "android", gradle, Path(tempfile.gettempdir())))
    if args.mode == "report":
        print(json.dumps({"volumes": measure(), "candidates": inventory(spec)}, indent=2))
        return 0
    if sys.platform != "darwin" or os.environ.get("CI"):
        raise ValueError("cleanup and local build gate are for the local Mac only")
    with lease(base) as lock, tempfile.NamedTemporaryFile(mode="w", prefix="run-", suffix=".jsonl",
                                                          dir=base, delete=False) as receipt:
        def emit(event, **data):
            print(json.dumps({"time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                              "event": event, **data}), file=receipt, flush=True)
            os.fsync(receipt.fileno())
        print(f"NURI disk receipt: {receipt.name}", file=sys.stderr, flush=True)
        start = measure()
        emit("start", mode=args.mode, volumes=start)
        needs_cleanup = any(v["availableBytes"] < (TARGET if args.mode == "apply-approved" else MINIMUM)
                            for v in start.values())
        try:
            if needs_cleanup:
                rows = json.loads(args.plan.read_text())["candidates"] if args.plan else inventory(spec)
                # A saved report is only a snapshot, never an allowlist or a priority override.
                if args.plan:
                    live = {str(item[0]): item for item in spec}
                    for row in rows:
                        item = live.get(row["path"])
                        if item:
                            row.update(category=item[1], priority=item[2])
                    rows.sort(key=lambda row: (row["priority"], -row.get("allocatedBytes", 0), row["path"]))
                emit("report", candidates=rows)
                for row in rows:
                    if row["status"] == "eligible":
                        print(f'{row["category"]} {row["allocatedBytes"]} allocated bytes: {row["path"]}',
                              file=sys.stderr, flush=True)
                apply(rows, spec, measure, emit)
            final = measure()
            emit("gate", volumes=final)
            print(json.dumps({"volumes": final, "receipt": receipt.name}, indent=2), flush=True)
            return launch(command, final, lock) if args.mode == "prebuild" else 0
        finally:
            emit("finish", volumes=measure())


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"NURI disk guard: {error}", file=sys.stderr)
        sys.exit(75)
