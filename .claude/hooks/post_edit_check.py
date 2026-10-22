#!/usr/bin/env python3
"""PostToolUse hook (matcher: Edit|Write): cheap per-file check right after an edit.

- frontend/src/**/*.{js,jsx} -> ESLint on that file only (local binary, never npx, so nothing is downloaded)
- backend/**/*.py            -> syntax check via ast (no .pyc side effects)
- frontend/src/locales/*.js  -> es/en key parity (.claude/skills/i18n-sync/check_keys.mjs)

Exit 2 with the findings on stderr hands them back to Claude; exit 0 is silent. Fails open on hook bugs.
"""
import ast
import json
import logging
import os
import subprocess
import sys
from pathlib import Path

HOOKS_DIR = Path(__file__).resolve().parent
ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or HOOKS_DIR.parents[1]).resolve()
FRONTEND = ROOT / "frontend"
ESLINT = FRONTEND / "node_modules" / ".bin" / "eslint"
I18N_CHECK = ROOT / ".claude" / "skills" / "i18n-sync" / "check_keys.mjs"
TIMEOUT_S = 60

logging.basicConfig(
    filename=HOOKS_DIR / "hooks.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s post_edit %(message)s",
)
log = logging.getLogger("post_edit")


def run(cmd: list[str], cwd: Path) -> tuple[int, str]:
    log.info("exec cwd=%s cmd=%s", cwd, cmd)
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=TIMEOUT_S)
    log.info("exit=%s", proc.returncode)
    return proc.returncode, (proc.stdout + proc.stderr).strip()


def check(path: Path) -> str | None:
    """Return findings text if the edited file has problems, else None."""
    try:
        rel = path.relative_to(ROOT)
    except ValueError:
        log.info("outside project, skipped: %s", path)
        return None
    parts = rel.parts

    if parts[:3] == ("frontend", "src", "locales") and path.suffix == ".js":
        code, out = run(["node", str(I18N_CHECK)], ROOT)
        return out if code != 0 else None

    if parts[:2] == ("frontend", "src") and path.suffix in (".js", ".jsx"):
        if not ESLINT.exists():
            log.warning("eslint not installed, skipped (run npm install in frontend/)")
            return None
        code, out = run([str(ESLINT), "--no-warn-ignored", str(path)], FRONTEND)
        return f"ESLint errors in {rel}:\n{out}" if code != 0 else None

    if parts[0] == "backend" and path.suffix == ".py":
        try:
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as exc:
            return f"SyntaxError in {rel}:{exc.lineno}: {exc.msg}"
    return None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        file_path = (payload.get("tool_input") or {}).get("file_path")
        if not file_path:
            return 0
        path = Path(file_path)
        if not path.is_absolute():
            path = ROOT / path
        log.info("edited %s", path)
        findings = check(path.resolve())
        if findings:
            log.warning("findings for %s:\n%s", path, findings)
            print(findings, file=sys.stderr)
            return 2
        return 0
    except subprocess.TimeoutExpired as exc:
        log.error("check timed out after %ss: %s", TIMEOUT_S, exc.cmd)
        return 0
    except Exception:  # fail open
        log.exception("hook crashed, failing open")
        return 0


if __name__ == "__main__":
    sys.exit(main())
