"""
LogiRent - Chargement securise des variables d'environnement
=============================================================
Charge les variables depuis backend/.env ou un fichier specifie.
Utilise par tous les scripts Python (backup, seed, migration).

Usage:
    from env_loader import load_env, get_project_dir
    env = load_env()
    mongo_url = env["MONGO_URL"]
"""

import os
from pathlib import Path


def get_project_dir():
    """Determine le repertoire du projet de maniere fiable.
    Fonctionne meme avec sudo (evite le probleme $HOME=/root).
    """
    # Le dossier scripts/ est dans le projet
    scripts_dir = Path(__file__).resolve().parent
    project_dir = scripts_dir.parent
    return project_dir


def load_env(env_file=None):
    """Charge un fichier .env et retourne un dict.
    
    Priorite:
      1. Fichier passe en parametre
      2. backend/.env relatif au projet
    
    Ne definit PAS de fallback dangereux.
    Leve une erreur si le fichier est introuvable.
    """
    if env_file is None:
        env_file = get_project_dir() / "backend" / ".env"
    else:
        env_file = Path(env_file)

    if not env_file.exists():
        raise FileNotFoundError(
            f"Fichier .env introuvable: {env_file}\n"
            f"Assurez-vous que backend/.env existe dans votre projet."
        )

    env = {}
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                env[key] = value

    return env


def load_migration_env():
    """Charge les credentials de migration depuis scripts/migration.env.
    
    Ce fichier contient ATLAS_URL et est separe du backend/.env
    pour ne jamais exposer les credentials Atlas dans le code.
    """
    migration_file = Path(__file__).resolve().parent / "migration.env"

    if not migration_file.exists():
        raise FileNotFoundError(
            f"Fichier migration.env introuvable: {migration_file}\n"
            f"Copiez migration.env.example vers migration.env et remplissez ATLAS_URL:\n"
            f"  cp scripts/migration.env.example scripts/migration.env\n"
            f"  nano scripts/migration.env"
        )

    env = {}
    with open(migration_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip().strip('"').strip("'")

    if "ATLAS_URL" not in env or not env["ATLAS_URL"]:
        raise ValueError(
            "ATLAS_URL non defini dans migration.env.\n"
            "Editez scripts/migration.env et ajoutez votre URL Atlas."
        )

    return env


def require_keys(env, *keys):
    """Verifie que les cles requises sont presentes et non vides."""
    missing = [k for k in keys if not env.get(k)]
    if missing:
        raise ValueError(
            f"Variables manquantes dans .env: {', '.join(missing)}\n"
            f"Verifiez votre fichier backend/.env"
        )
    return env
