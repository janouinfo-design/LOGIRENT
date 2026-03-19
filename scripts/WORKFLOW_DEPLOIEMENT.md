# LogiRent – Workflow de deploiement GitHub → VPS

## Le probleme

Quand le code est modifie sur Emergent puis pousse sur GitHub, le VPS ne se
met pas a jour automatiquement. Il faut un `git pull` manuel sur le VPS.

## Workflow complet

```
Emergent (dev) → GitHub (repo) → VPS (production)
      ↓               ↓                ↓
  Code modifie    "Save to GitHub"   git pull + restart
```

### Etape par etape

#### 1. Apres modifications sur Emergent
Utilisez le bouton **"Save to GitHub"** dans le chat Emergent pour pousser
les modifications vers votre repository GitHub.

#### 2. Sur votre VPS : deployer la nouvelle version

```bash
# Connexion SSH
ssh ubuntu@votre-vps

# Aller dans le projet
cd ~/apps/LOGIRENT

# Tirer la derniere version
git pull origin main

# Installer les nouvelles dependances (si necessaire)
cd backend && source venv/bin/activate
pip install -r requirements.txt
cd ..

# Rebuilder le frontend (si modifie)
cd frontend && yarn install && npx expo export --platform web
sudo cp -r dist/* /var/www/logirent/
cd ..

# Redemarrer le backend
./scripts/backend.sh restart

# Verifier que tout est coherent
./scripts/check_deploy.sh
```

#### 3. Verification rapide

```bash
# Version rapide
curl -s http://localhost:8001/api/version | python3 -m json.tool

# Le commit affiche doit correspondre au dernier commit GitHub
```

## Commande unique (deploiement rapide)

Pour les mises a jour backend uniquement (pas de changement frontend) :

```bash
cd ~/apps/LOGIRENT && \
git pull origin main && \
./scripts/backend.sh restart && \
./scripts/check_deploy.sh
```

## Erreurs courantes

| Symptome | Cause | Solution |
|---|---|---|
| API renvoie ancienne version | Backend pas redemarre | `./scripts/backend.sh restart` |
| Frontend affiche ancienne UI | Build web pas regenere | `cd frontend && npx expo export --platform web && sudo cp -r dist/* /var/www/logirent/` |
| git pull echoue (conflits) | Modifications locales sur VPS | `git stash && git pull && git stash pop` |
| Port 8001 already in use | Double lancement | `./scripts/backend.sh restart` |
| Variables .env differentes | .env pas dans git | Verifier manuellement avec `./scripts/check_deploy.sh` |

## IMPORTANT : Les fichiers .env ne sont PAS dans git

Les `.env` sont exclus de git (et c'est normal — securite). Quand vous
modifiez un `.env` sur Emergent, la modification ne sera PAS transmise
au VPS via git pull.

**Si un .env change**, vous devez le mettre a jour manuellement sur le VPS :
```bash
nano backend/.env   # Modifier la variable concernee
./scripts/backend.sh restart
```
