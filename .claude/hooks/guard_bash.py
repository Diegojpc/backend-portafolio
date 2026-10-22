#!/usr/bin/env python3
"""PreToolUse hook (matcher: Bash): block commands that leak secrets or destroy work.

Reads the hook payload as JSON on stdin. Exit 2 + reason on stderr blocks the call;
exit 0 allows it. Any internal failure fails OPEN (logged) so a bug here never wedges the session.
"""
import json
import logging
import os
import re
import shlex
import sys
from pathlib import Path

HOOKS_DIR = Path(__file__).resolve().parent
logging.basicConfig(
    filename=HOOKS_DIR / "hooks.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s guard_bash %(message)s",
)
log = logging.getLogger("guard_bash")

READERS = {"cat", "less", "more", "head", "tail", "grep", "rg", "bat", "sed", "awk", "source", "."}
# .env, .env.local, backend/.env ... but not .env.example
ENV_FILE = re.compile(r"(^|/)\.env(\.(?!example$)[\w-]+)?$")
SAFE_RM_BASENAMES = {"node_modules", "dist", "__pycache__", ".pytest_cache", ".vite"}


def split_segments(command: str) -> list[str]:
    """Split on ; && || | and newlines so each simple command is checked on its own."""
    return [s.strip() for s in re.split(r"&&|\|\||[;|\n]", command) if s.strip()]


def tokens_of(segment: str) -> list[str]:
    try:
        return shlex.split(segment)
    except ValueError:
        log.warning("shlex failed, falling back to whitespace split: %r", segment)
        return segment.split()


def check_segment(segment: str) -> str | None:
    """Return a block reason for this simple command, or None if it is fine."""
    toks = tokens_of(segment)
    if not toks:
        return None
    cmd = os.path.basename(toks[0])
    args = toks[1:]

    if cmd in READERS and any(ENV_FILE.search(a) for a in args):
        return "Reading a .env file through Bash is blocked (secrets). Ask the user for the specific variable instead."

    if cmd == "git" and args:
        sub = args[0]
        if sub == "push" and any(a in ("--force", "-f") or a.startswith("--force=") for a in args):
            return "git push --force is blocked. Use --force-with-lease only if the user explicitly asks."
        if sub == "reset" and "--hard" in args:
            return "git reset --hard is blocked: it discards uncommitted work. Ask the user first."
        if sub == "clean" and any(re.fullmatch(r"-[a-z]*f[a-z]*", a) for a in args if a.startswith("-") and not a.startswith("--")):
            return "git clean -f is blocked: it deletes untracked files. Ask the user first."

    if cmd == "alembic" and "downgrade" in args:
        return "alembic downgrade is blocked: it can drop data. Ask the user first."

    if cmd == "rm":
        targets = [a for a in args if not a.startswith("-")]
        if any("storage" in t or t.endswith(".db") for t in targets):
            return "Deleting backend/storage or *.db files is blocked (conversation database)."
        flags = "".join(a for a in args if a.startswith("-"))
        if "r" in flags.lower() or "--recursive" in args:
            unsafe = [
                t for t in targets
                if not (t.startswith("/tmp/") or os.path.basename(t.rstrip("/")) in SAFE_RM_BASENAMES)
            ]
            if unsafe:
                return f"Recursive rm outside /tmp or known build dirs is blocked: {unsafe}"

    return None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        command = (payload.get("tool_input") or {}).get("command", "")
        log.info("check command=%r", command[:300])
        for segment in split_segments(command):
            reason = check_segment(segment)
            if reason:
                log.warning("BLOCKED segment=%r reason=%s", segment, reason)
                print(f"guard_bash: {reason}", file=sys.stderr)
                return 2
        log.info("allowed")
        return 0
    except Exception:  # fail open: never wedge the session over a hook bug
        log.exception("hook crashed, failing open")
        return 0


if __name__ == "__main__":
    sys.exit(main())
