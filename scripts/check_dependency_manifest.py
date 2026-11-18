#!/usr/bin/env python3
"""Vérifie la cohérence des manifestes npm et l'hygiène Git du projet.

Usage (depuis la racine, avec l'environnement Python 3.12 du projet) :
    .venv\\Scripts\\python.exe scripts/check_dependency_manifest.py

Contrôles :
- Python >= 3.12 ;
- dépendances directes identiques dans package.json et package-lock.json ;
- aucune dépendance déclarée à la fois en runtime et en développement ;
- exclusions Git indispensables (.venv, __pycache__, node_modules, secrets locaux) ;
- aucun fichier interdit suivi par Git.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_GITIGNORE = (
    "node_modules/",
    ".venv/",
    "__pycache__/",
    "scripts/*serviceAccount*.json",
    "scripts/*service-account*.json",
    "scripts/remote-config.seed.json",
)
FORBIDDEN_PREFIXES = ("node_modules/", ".venv/", "__pycache__/")
FORBIDDEN_NAMES = ("serviceAccount", "service-account", "remote-config.seed.json")


def reject_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"clé dupliquée dans un manifeste JSON : {key}")
        result[key] = value
    return result


def read_json(name: str) -> dict[str, Any]:
    path = ROOT / name
    with path.open(encoding="utf-8") as handle:
        return json.load(handle, object_pairs_hook=reject_duplicates)


def tracked_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "-z"],
        cwd=ROOT,
        capture_output=True,
        check=True,
    )
    return [item.replace("\\", "/") for item in result.stdout.decode("utf-8").split("\0") if item]


def main() -> int:
    errors: list[str] = []
    if sys.version_info < (3, 12):
        errors.append(f"Python 3.12 attendu, trouvé {sys.version.split()[0]}")

    try:
        package = read_json("package.json")
        lock = read_json("package-lock.json")
    except (OSError, ValueError) as exc:
        print(f"ERREUR : lecture des manifestes impossible : {exc}")
        return 1

    lock_root = lock.get("packages", {}).get("", {})
    for key in ("dependencies", "devDependencies"):
        declared = package.get(key, {})
        recorded = lock_root.get(key, {})
        if declared != recorded:
            errors.append(f"{key} divergentes entre package.json et package-lock.json")
            for name in sorted(set(declared) | set(recorded)):
                if declared.get(name) != recorded.get(name):
                    errors.append(f"  {name}: package.json={declared.get(name)!r}, lock={recorded.get(name)!r}")

    overlap = sorted(set(package.get("dependencies", {})) & set(package.get("devDependencies", {})))
    if overlap:
        errors.append("dépendances déclarées en runtime et en développement : " + ", ".join(overlap))

    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
    missing = [pattern for pattern in REQUIRED_GITIGNORE if pattern not in gitignore]
    if missing:
        errors.append("règles .gitignore absentes : " + ", ".join(missing))

    files = tracked_files()
    forbidden = [
        path
        for path in files
        if path.startswith(FORBIDDEN_PREFIXES)
        or any(name in Path(path).name for name in FORBIDDEN_NAMES)
    ]
    if forbidden:
        errors.append("fichiers interdits suivis par Git : " + ", ".join(forbidden))

    print(f"Python {sys.version.split()[0]} - {len(package.get('dependencies', {}))} dependances directes, "
          f"{len(package.get('devDependencies', {}))} dependances de developpement, {len(files)} fichiers suivis.")
    if errors:
        for error in errors:
            print("[ERREUR] " + error)
        return 1

    print("[OK] Manifestes coherents et hygiene Git conforme.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
