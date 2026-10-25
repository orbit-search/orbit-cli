#!/usr/bin/env python3
"""Release steps for Orbit libraries, CLIs and tools (the library release kit).

The reusable workflow `library-release.yml` calls this script. A merge to main
makes one release: a semver tag, release notes built from the commits since the
last tag, a GitHub Release, and (kind npm or pypi) a registry publish.

    plan            next version, tag and notes; release only on a push to the default branch
    set-version     write the release version into package.json or pyproject.toml (CI copy only)
    build-artifact  npm pack, python -m build, or a git archive of HEAD (kind none)
    smoke           install the built artifact in a clean place and run the smoke command
    registry-has    whether npm or PyPI already has this version (publish is idempotent)
    notify          Slack line that mentions the author of the merged PR (failure ping); the
                    people map is the vendored release_people.json or the RELEASE_PEOPLE_JSON secret
    check-kit       the vendored kit files match KIT.json

Every external call goes through `Runner` (processes) and `Http` (HTTP), so the
tests inject fakes and never reach git, npm, GitHub or Slack.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

KIT_DIR = Path(__file__).resolve().parent
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
TAG = re.compile(r"^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
CONVENTIONAL = re.compile(r"^(?P<type>[a-zA-Z]+)(?:\([^)]*\))?(?P<bang>!)?:\s")
KINDS = ("npm", "pypi", "none")
# version = "1.2.3" or '1.2.3', optionally followed by a comment, in pyproject.toml's [project] table.
PYPROJECT_VERSION = re.compile(
    r"""^(?P<lead>version\s*=\s*)(?P<quote>["'])(?P<value>[^"'\n]*)(?P=quote)(?P<tail>[ \t]*(?:#[^\n]*)?)$""",
    re.MULTILINE,
)
# The first release lists at most this many commits; older history stays in git log.
FIRST_RELEASE_COMMITS = 50
# Files the kit vendors into every repository (KIT.json pins their sha256).
KIT_FILES = {
    ".github/library-release/library_release.py": "library_release.py",
    ".github/workflows/library-release.yml": "library-release.yml",
}
# The GitHub-login-to-Slack-id map. Private repositories may vendor it (pinned in KIT.json);
# a public repository must not, and reads it from the RELEASE_PEOPLE_JSON secret instead.
PEOPLE_FILE = ".github/library-release/release_people.json"
PEOPLE_ENV = "RELEASE_PEOPLE_JSON"


class ReleaseError(Exception):
    """A release step cannot continue; the message says why."""


# --------------------------------------------------------------------------- runners


@dataclass
class Result:
    returncode: int
    stdout: str = ""
    stderr: str = ""


class Runner:
    """Runs a process. Tests replace it with a fake that records calls."""

    def __call__(self, args: Sequence[str], *, cwd: Path | None = None, env: dict | None = None) -> Result:
        done = subprocess.run(list(args), cwd=cwd, env=env, capture_output=True, text=True, check=False)
        return Result(done.returncode, done.stdout, done.stderr)


class Http:
    """Sends one HTTP request and returns (status, body). Tests replace it."""

    def __call__(self, method: str, url: str, *, headers: dict | None = None, body: bytes | None = None) -> tuple[int, str]:
        request = urllib.request.Request(url, data=body, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310 - fixed https hosts
                return response.status, response.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as error:
            return error.code, error.read().decode("utf-8", "replace")


def run_ok(runner: Runner, args: Sequence[str], *, cwd: Path | None = None, env: dict | None = None) -> str:
    result = runner(args, cwd=cwd, env=env)
    if result.returncode != 0:
        raise ReleaseError(f"{' '.join(args)} failed ({result.returncode}): {result.stderr.strip() or result.stdout.strip()}")
    return result.stdout


# --------------------------------------------------------------------------- versions


def parse_version(text: str) -> tuple[int, int, int]:
    match = SEMVER.match(text.strip())
    if not match:
        raise ReleaseError(f"not a release version (X.Y.Z): {text!r}")
    return int(match[1]), int(match[2]), int(match[3])


def format_version(version: tuple[int, int, int]) -> str:
    return ".".join(str(part) for part in version)


def bump(version: tuple[int, int, int], level: str) -> tuple[int, int, int]:
    major, minor, patch = version
    if level == "major":
        return major + 1, 0, 0
    if level == "minor":
        return major, minor + 1, 0
    return major, minor, patch + 1


@dataclass
class Commit:
    sha: str
    subject: str
    body: str = ""

    @property
    def level(self) -> str:
        match = CONVENTIONAL.match(self.subject)
        if (match and match["bang"]) or re.search(r"^BREAKING[ -]CHANGE:", self.body, re.MULTILINE):
            return "major"
        if match and match["type"].lower() == "feat":
            return "minor"
        return "patch"


def bump_level(commits: Sequence[Commit]) -> str:
    levels = {commit.level for commit in commits}
    for level in ("major", "minor"):
        if level in levels:
            return level
    return "patch"


def read_version_file(path: Path) -> str | None:
    """The version in package.json or pyproject.toml ([project] table); None when absent."""
    if not path.is_file():
        raise ReleaseError(f"version file not found: {path}")
    text = path.read_text(encoding="utf-8")
    if path.name == "package.json":
        version = json.loads(text).get("version")
        return str(version) if version else None
    if path.name == "pyproject.toml":
        section = _project_section(text)
        if section is None:
            return None
        match = PYPROJECT_VERSION.search(text[section[0] : section[1]])
        return match["value"] if match else None
    raise ReleaseError(f"unsupported version file (package.json or pyproject.toml): {path}")


def write_version_file(path: Path, version: str) -> None:
    parse_version(version)
    text = path.read_text(encoding="utf-8")
    if path.name == "package.json":
        data = json.loads(text)
        data["version"] = version
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return
    if path.name == "pyproject.toml":
        section = _project_section(text)
        if section is None:
            raise ReleaseError(f"{path} has no [project] table")
        start, end = section
        body, count = PYPROJECT_VERSION.subn(
            lambda match: f"{match['lead']}{match['quote']}{version}{match['quote']}{match['tail']}", text[start:end], count=1
        )
        if count != 1:
            raise ReleaseError(f"{path} [project] has no version line")
        path.write_text(text[:start] + body + text[end:], encoding="utf-8")
        return
    raise ReleaseError(f"unsupported version file (package.json or pyproject.toml): {path}")


def _project_section(text: str) -> tuple[int, int] | None:
    match = re.search(r"^\[project\]\s*$", text, re.MULTILINE)
    if not match:
        return None
    following = re.search(r"^\[", text[match.end() :], re.MULTILINE)
    end = match.end() + following.start() if following else len(text)
    return match.end(), end


# --------------------------------------------------------------------------- git


def release_tags(runner: Runner, repo: Path, args: Sequence[str]) -> list[tuple[int, int, int]]:
    out = run_ok(runner, ["git", "tag", "--list", "v*", *args], cwd=repo)
    versions = []
    for line in out.splitlines():
        match = TAG.match(line.strip())
        if match:
            versions.append((int(match[1]), int(match[2]), int(match[3])))
    return sorted(versions)


def commits_between(runner: Runner, repo: Path, since: str | None, head: str) -> list[Commit]:
    span = f"{since}..{head}" if since else head
    args = ["git", "log", "--no-merges", "--format=%H%x1f%s%x1f%b%x1e", span]
    if not since:
        args.insert(3, f"--max-count={FIRST_RELEASE_COMMITS}")
    out = run_ok(runner, args, cwd=repo)
    commits = []
    for record in out.split("\x1e"):
        record = record.strip("\n")
        if not record.strip():
            continue
        sha, subject, body = (record.split("\x1f") + ["", ""])[:3]
        commits.append(Commit(sha.strip(), subject.strip(), body.strip()))
    return commits


# --------------------------------------------------------------------------- plan


@dataclass
class Plan:
    version: str
    tag: str
    release: bool
    existing: bool
    level: str
    commits: list[Commit] = field(default_factory=list)
    previous: str | None = None
    reason: str = ""


def make_plan(
    runner: Runner,
    repo: Path,
    *,
    head: str,
    version_file: str,
    initial_version: str,
    event: str,
    ref: str,
    default_branch: str,
) -> Plan:
    """Decide the release version for `head`.

    - A release happens only on a push to the default branch.
    - `head` already carries a vX.Y.Z tag: reuse it (a re-run publishes what is missing).
    - No earlier tag: the version file's version, else `initial_version`.
    - Otherwise bump the last tag: major for `type!:` or a BREAKING CHANGE footer,
      minor for `feat:`, patch for anything else. A version file that is higher than
      that wins, so a person can ask for a version by editing the file.
    """
    parse_version(initial_version)
    release = event == "push" and ref == f"refs/heads/{default_branch}"
    file_version = read_version_file(repo / version_file) if version_file else None
    if file_version is not None:
        parse_version(file_version)

    at_head = release_tags(runner, repo, ["--points-at", head])
    merged = release_tags(runner, repo, ["--merged", head])
    every = release_tags(runner, repo, [])
    if at_head:
        # A re-run: keep the tag and rebuild the same notes from the tag before it.
        current = at_head[-1]
        earlier = [tag for tag in merged if tag < current]
        previous = format_version(earlier[-1]) if earlier else None
        commits = commits_between(runner, repo, f"v{previous}" if previous else None, head)
        version = format_version(current)
        return Plan(version, f"v{version}", release, True, "none", commits, previous, f"{head[:12]} already has v{version}")

    newest = every[-1] if every else None
    if newest is not None and (not merged or newest > merged[-1]):
        # A newer tag exists that this commit's history does not reach as its latest release.
        newest_tag = f"v{format_version(newest)}"
        if runner(["git", "merge-base", "--is-ancestor", head, newest_tag], cwd=repo).returncode == 0:
            return Plan(
                format_version(newest), newest_tag, False, True, "none",
                reason=f"{head[:12]} is already part of {newest_tag}; a re-run of an older commit releases nothing",
            )
    previous = format_version(merged[-1]) if merged else None
    commits = commits_between(runner, repo, f"v{previous}" if previous else None, head)
    if previous is None:
        version = file_version or initial_version
        level = "initial"
        reason = "first release: " + ("the version file" if file_version else "the initial version")
    else:
        level = bump_level(commits)
        # Bump from the newest tag anywhere, so a version is never handed out twice.
        candidate = bump(max(parse_version(previous), newest or parse_version(previous)), level)
        if file_version and parse_version(file_version) > candidate:
            version, reason = file_version, f"the version file asks for {file_version}"
        else:
            version, reason = format_version(candidate), f"{level} bump from v{previous}"
    return Plan(version, f"v{version}", release, False, level, commits, previous, reason)


def release_notes(plan: Plan, *, repo_slug: str, head: str, date: str) -> str:
    lines = [f"## {plan.tag} ({date})", "", f"Commit: {head}"]
    if plan.previous:
        lines.append(f"Changes since v{plan.previous}: https://github.com/{repo_slug}/compare/v{plan.previous}...{plan.tag}")
    else:
        lines.append(f"First release made by the pipeline; it lists the last {FIRST_RELEASE_COMMITS} commits at most.")
    groups = {"major": [], "minor": [], "patch": []}
    for commit in plan.commits:
        groups[commit.level].append(commit)
    titles = {"major": "Breaking changes", "minor": "Features", "patch": "Fixes and other changes"}
    for level in ("major", "minor", "patch"):
        if groups[level]:
            lines += ["", f"### {titles[level]}", ""]
            lines += [f"- {commit.subject} ({commit.sha[:7]})" for commit in groups[level]]
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------- artifacts


def build_artifact(runner: Runner, repo: Path, *, kind: str, name: str, version: str, out: Path) -> Path:
    out.mkdir(parents=True, exist_ok=True)
    if kind == "npm":
        stdout = run_ok(runner, ["npm", "pack", "--json", "--pack-destination", str(out)], cwd=repo)
        filename = json.loads(stdout)[0]["filename"]
        return out / Path(filename).name
    if kind == "pypi":
        run_ok(runner, [sys.executable, "-m", "build", "--outdir", str(out)], cwd=repo)
        wheels = sorted(out.glob("*.whl"))
        if not wheels:
            raise ReleaseError(f"python -m build wrote no wheel into {out}")
        return wheels[-1]
    if kind == "none":
        archive = out / f"{name}-{version}.tar.gz"
        run_ok(runner, ["git", "archive", "--format=tar.gz", f"--prefix={name}-{version}/", "-o", str(archive), "HEAD"], cwd=repo)
        return archive
    raise ReleaseError(f"unknown kind {kind!r} (npm, pypi or none)")


def smoke(runner: Runner, *, kind: str, artifact: Path, command: str, version: str, workdir: Path) -> None:
    """Install the artifact somewhere clean and run the smoke command there.

    npm: `npm install -g --prefix <tmp>`, the command runs with <tmp>/bin first on PATH and
    NODE_PATH at the installed packages (CommonJS require; an ESM import needs a file in the tree).
    pypi: a fresh venv with the wheel, the command runs with the venv's bin first on PATH.
    none: the archive is unpacked and the command runs inside the unpacked tree.
    The command gets RELEASE_VERSION, so it can compare `--version` output.
    """
    env = dict(os.environ, RELEASE_VERSION=version)
    cwd = workdir
    if kind == "npm":
        prefix = workdir / "npm-prefix"
        run_ok(runner, ["npm", "install", "--global", "--prefix", str(prefix), str(artifact)])
        env["PATH"] = f"{prefix / 'bin'}{os.pathsep}{env.get('PATH', '')}"
        # A library smoke such as node -e "require('pkg')" resolves from the global prefix.
        env["NODE_PATH"] = str(prefix / "lib" / "node_modules")
    elif kind == "pypi":
        venv = workdir / "venv"
        run_ok(runner, [sys.executable, "-m", "venv", str(venv)])
        run_ok(runner, [str(venv / "bin" / "pip"), "install", str(artifact)])
        env["PATH"] = f"{venv / 'bin'}{os.pathsep}{env.get('PATH', '')}"
    elif kind == "none":
        run_ok(runner, ["tar", "-xzf", str(artifact), "-C", str(workdir)])
        unpacked = [path for path in workdir.iterdir() if path.is_dir()]
        if len(unpacked) != 1:
            raise ReleaseError(f"expected one top-level folder in {artifact.name}, found {len(unpacked)}")
        cwd = unpacked[0]
    else:
        raise ReleaseError(f"unknown kind {kind!r} (npm, pypi or none)")
    result = runner(["bash", "-euo", "pipefail", "-c", command], cwd=cwd, env=env)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    if result.returncode != 0:
        raise ReleaseError(f"smoke command failed ({result.returncode}) on the installed {kind} artifact")


# --------------------------------------------------------------------------- registry


def registry_has(http: Http, *, kind: str, name: str, version: str) -> bool:
    parse_version(version)
    if kind == "npm":
        url = f"https://registry.npmjs.org/{name.replace('/', '%2F')}/{version}"
    elif kind == "pypi":
        url = f"https://pypi.org/pypi/{name}/{version}/json"
    else:
        raise ReleaseError(f"kind {kind!r} has no registry")
    status, _ = http("GET", url)
    if status == 200:
        return True
    if status == 404:
        return False
    raise ReleaseError(f"{url} answered {status}; cannot tell whether {name} {version} exists")


# --------------------------------------------------------------------------- notify


def pr_author(http: Http, *, repo_slug: str, sha: str, token: str) -> str | None:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "orbit-library-release"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    status, body = http("GET", f"https://api.github.com/repos/{repo_slug}/commits/{sha}/pulls", headers=headers)
    if status == 200:
        pulls = json.loads(body)
        if pulls:
            return pulls[0]["user"]["login"]
    status, body = http("GET", f"https://api.github.com/repos/{repo_slug}/commits/{sha}", headers=headers)
    if status == 200:
        author = json.loads(body).get("author") or {}
        return author.get("login")
    return None


def slack_mentions(people: dict, login: str | None) -> list[str]:
    slack_ids = people.get("slack_ids", {})
    if login and login in slack_ids:
        return [slack_ids[login]]
    return list(people.get("fallback", []))


def failure_message(*, repo_slug: str, sha: str, login: str | None, mentions: Sequence[str], run_url: str) -> str:
    who = " ".join(f"<@{slack_id}>" for slack_id in mentions)
    author = f"PR author {login}" if login else "author unknown"
    return (
        f"{who} Library release failed for {repo_slug} at {sha[:12]} ({author}). Run: {run_url}\n"
        "Fix forward with a PR (the next merge releases again), or re-run the failed jobs: "
        "a re-run re-uses the tag and skips a version the registry already has. "
        "To withdraw a published version, see the Releasing section of the repo docs."
    )


def valid_people(people: object) -> bool:
    """{"fallback": [str, ...], "slack_ids": {str: str}}; both keys optional."""
    if not isinstance(people, dict):
        return False
    slack_ids = people.get("slack_ids", {})
    fallback = people.get("fallback", [])
    return (
        isinstance(slack_ids, dict)
        and all(isinstance(key, str) and isinstance(value, str) for key, value in slack_ids.items())
        and isinstance(fallback, list)
        and all(isinstance(value, str) for value in fallback)
    )


def load_people(people_file: Path, env_json: str) -> dict:
    """The people map: the vendored file when present, else the RELEASE_PEOPLE_JSON secret, else empty.

    A map that is not valid JSON or has the wrong shape gives a warning and mentions nobody,
    so a bad map never stops the Slack ping itself."""
    if people_file.is_file():
        source, text = str(people_file), people_file.read_text(encoding="utf-8")
    elif env_json.strip():
        source, text = PEOPLE_ENV, env_json
    else:
        print(f"::warning::No {PEOPLE_FILE} and no {PEOPLE_ENV} secret; the ping mentions nobody.")
        return {}
    try:
        people = json.loads(text)
    except ValueError:
        print(f"::warning::{source} is not valid JSON; the ping mentions nobody.")
        return {}
    if not valid_people(people):
        print(f"::warning::{source} must be {{\"fallback\": [ids], \"slack_ids\": {{login: id}}}}; the ping mentions nobody.")
        return {}
    return people


def redact(message: str) -> str:
    """The message for the run log: Slack member ids stay out of logs (public repositories have public logs)."""
    return re.sub(r"<@[A-Z0-9]+>", "<@...>", message)


def notify(
    http: Http, *, webhook: str, repo_slug: str, sha: str, token: str, people_file: Path, run_url: str, people_json: str = ""
) -> str:
    people = load_people(people_file, people_json)
    login = pr_author(http, repo_slug=repo_slug, sha=sha, token=token)
    message = failure_message(repo_slug=repo_slug, sha=sha, login=login, mentions=slack_mentions(people, login), run_url=run_url)
    if not webhook:
        print("::warning::SLACK_WEBHOOK_URL is not set; the failure ping goes to this log only.")
        print(redact(message))
        return message
    status, body = http("POST", webhook, headers={"Content-Type": "application/json"}, body=json.dumps({"text": message}).encode())
    if status >= 300:
        raise ReleaseError(f"Slack webhook answered {status}: {body[:200]}")
    print(redact(message))
    return message


# --------------------------------------------------------------------------- kit pin


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_kit(repo: Path, *, public: bool = False) -> list[str]:
    """Problems with the vendored kit; empty when every file matches KIT.json.

    A public repository must not carry the people map (it maps employees to Slack ids)."""
    pin_file = repo / ".github" / "library-release" / "KIT.json"
    try:
        pinned = json.loads(pin_file.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        return [f"{pin_file}: {error}"]
    problems = []
    for relative in KIT_FILES:
        path = repo / relative
        if not path.is_file():
            problems.append(f"{relative} is missing")
        elif pinned.get("files", {}).get(relative) != digest(path):
            problems.append(f"{relative} differs from KIT.json; change the kit in orbit-infrastructure and re-sync")
    people = repo / PEOPLE_FILE
    pins_people = PEOPLE_FILE in pinned.get("files", {})
    if people.is_file():
        if public:
            problems.append(
                f"{PEOPLE_FILE} must not be in a public repository; delete it (sync.py --visibility public) "
                f"and set the {PEOPLE_ENV} organization secret instead"
            )
        elif pinned.get("files", {}).get(PEOPLE_FILE) != digest(people):
            problems.append(f"{PEOPLE_FILE} differs from KIT.json; change the kit in orbit-infrastructure and re-sync")
    elif pins_people and not public:
        problems.append(f"{PEOPLE_FILE} is missing but KIT.json pins it; re-sync with sync.py --visibility private")
    return problems


# --------------------------------------------------------------------------- CLI


def write_outputs(path: str | None, values: dict[str, str]) -> None:
    lines = "".join(f"{key}={value}\n" for key, value in values.items())
    if path:
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(lines)
    sys.stdout.write(lines)


def main(argv: Sequence[str] | None = None, *, runner: Runner | None = None, http: Http | None = None) -> int:
    runner = runner or Runner()
    http = http or Http()
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n", 1)[0])
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("plan")
    p.add_argument("--repo", type=Path, default=Path("."))
    p.add_argument("--head", default="HEAD")
    p.add_argument("--version-file", default="")
    p.add_argument("--initial-version", default="0.1.0")
    p.add_argument("--event", required=True)
    p.add_argument("--ref", required=True)
    p.add_argument("--default-branch", default="main")
    p.add_argument("--repo-slug", required=True)
    p.add_argument("--date", required=True)
    p.add_argument("--notes", type=Path, required=True)
    p.add_argument("--github-output")

    p = sub.add_parser("set-version")
    p.add_argument("--file", type=Path, required=True)
    p.add_argument("--version", required=True)

    p = sub.add_parser("build-artifact")
    p.add_argument("--repo", type=Path, default=Path("."))
    p.add_argument("--kind", choices=KINDS, required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--version", required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--github-output")

    p = sub.add_parser("smoke")
    p.add_argument("--kind", choices=KINDS, required=True)
    p.add_argument("--artifact", type=Path, required=True)
    p.add_argument("--run", required=True, help="shell command to run against the installed artifact")
    p.add_argument("--version", required=True)

    p = sub.add_parser("registry-has")
    p.add_argument("--kind", choices=("npm", "pypi"), required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--version", required=True)
    p.add_argument("--github-output")

    p = sub.add_parser("validate-version")
    p.add_argument("version")

    p = sub.add_parser("notify")
    p.add_argument("--repo-slug", required=True)
    p.add_argument("--sha", required=True)
    p.add_argument("--run-url", required=True)
    p.add_argument("--people", type=Path, default=KIT_DIR / "release_people.json")

    p = sub.add_parser("check-kit")
    p.add_argument("--repo", type=Path, default=Path("."))
    p.add_argument("--public", action="store_true", help="the repository is public: refuse a vendored people map")

    args = parser.parse_args(argv)
    try:
        if args.command == "plan":
            head = run_ok(runner, ["git", "rev-parse", args.head], cwd=args.repo).strip()
            plan = make_plan(
                runner,
                args.repo,
                head=head,
                version_file=args.version_file,
                initial_version=args.initial_version,
                event=args.event,
                ref=args.ref,
                default_branch=args.default_branch,
            )
            args.notes.write_text(release_notes(plan, repo_slug=args.repo_slug, head=head, date=args.date), encoding="utf-8")
            print(f"{plan.tag}: {plan.reason}; release={'yes' if plan.release else 'no (not a push to the default branch)'}")
            write_outputs(
                args.github_output,
                {
                    "version": plan.version,
                    "tag": plan.tag,
                    "release": str(plan.release).lower(),
                    "existing": str(plan.existing).lower(),
                },
            )
        elif args.command == "set-version":
            write_version_file(args.file, args.version)
            print(f"{args.file}: version {args.version}")
        elif args.command == "build-artifact":
            artifact = build_artifact(runner, args.repo, kind=args.kind, name=args.name, version=args.version, out=args.out)
            write_outputs(args.github_output, {"artifact": str(artifact)})
        elif args.command == "smoke":
            with tempfile.TemporaryDirectory(prefix="library-release-smoke-") as tmp:
                smoke(runner, kind=args.kind, artifact=args.artifact.resolve(), command=args.run, version=args.version, workdir=Path(tmp))
            print(f"smoke install of {args.artifact.name} passed")
        elif args.command == "registry-has":
            has = registry_has(http, kind=args.kind, name=args.name, version=args.version)
            write_outputs(args.github_output, {"published": str(has).lower()})
        elif args.command == "validate-version":
            parse_version(args.version)
            print(f"v{args.version}")
        elif args.command == "notify":
            notify(
                http,
                webhook=os.environ.get("SLACK_WEBHOOK_URL", ""),
                repo_slug=args.repo_slug,
                sha=args.sha,
                token=os.environ.get("GITHUB_TOKEN", ""),
                people_file=args.people,
                run_url=args.run_url,
                people_json=os.environ.get(PEOPLE_ENV, ""),
            )
        elif args.command == "check-kit":
            problems = check_kit(args.repo, public=args.public)
            for problem in problems:
                print(f"::error::{problem}")
            if problems:
                return 1
            print("library release kit matches KIT.json")
        else:  # every subcommand needs a branch above; never report success for an unhandled one
            raise ReleaseError(f"unhandled subcommand {args.command!r}")
    except ReleaseError as error:
        print(f"::error::{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
