# Guide de Deploiement LogiRent sur VPS

## Prerequis

- VPS avec Ubuntu 20.04+ (ou Debian)
- Node.js 18+ et npm/yarn
- Python 3.10+
- Un nom de domaine pointe vers votre VPS (ex: app.logirent.ch)

---

## Etape 1 : Installer les dependances systeme

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3.10+ et pip
sudo apt install -y python3 python3-pip python3-venv

# PM2 (gestionnaire de processus)
sudo npm install -g pm2

# Nginx (reverse proxy)
sudo apt install -y nginx

# Certbot pour SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## Etape 2 : Cloner le projet

```bash
cd /home/$USER/apps
git clone <votre-repo-url> LOGIRENT
cd LOGIRENT
chmod +x scripts/*.sh
```

---

## Etape 3 : Configurer le Backend

### 3.1 Creer l'environnement virtuel Python

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3.2 Configurer le fichier .env du backend

Creez `backend/.env` :

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=logirent
JWT_SECRET=CHANGEZ-CECI-par-une-cle-aleatoire-de-32-caracteres-minimum
STRIPE_API_KEY=votre_cle_stripe
RESEND_API_KEY=votre_cle_resend
SENDER_EMAIL=contact@logirent.ch
NAVIXY_API_URL=https://login.logitrak.fr/api-v2
NAVIXY_HASH=votre_hash_navixy
```

**IMPORTANT** :
- Generez un JWT_SECRET aleatoire : `python3 -c "import secrets;print(secrets.token_hex(32))"`
- Ne copiez JAMAIS un JWT_SECRET depuis un autre projet

### 3.3 Installer MongoDB local

```bash
sudo ./scripts/01_install_mongodb.sh
```

### 3.4 Migrer les donnees depuis Atlas (si applicable)

```bash
cp scripts/migration.env.example scripts/migration.env
nano scripts/migration.env   # Remplissez votre ATLAS_URL
./scripts/02_migrate_data.sh
./scripts/03_update_env.sh
```

### 3.5 OU Seeder les donnees de demo

```bash
cd scripts
source ../backend/venv/bin/activate
python3 seed_demo.py
```

### 3.6 Demarrer le backend

```bash
# TOUJOURS utiliser backend.sh pour gerer le backend
./scripts/backend.sh start
```

Commandes disponibles :
```bash
./scripts/backend.sh start     # Demarre (tue l'ancien si existant)
./scripts/backend.sh stop      # Arrete
./scripts/backend.sh restart   # Redemarre proprement
./scripts/backend.sh status    # Affiche l'etat
./scripts/backend.sh logs      # Logs en temps reel
```

**NE LANCEZ JAMAIS `uvicorn` directement.** Utilisez toujours `backend.sh`.

---

## Etape 4 : Configurer le Frontend

### 4.1 Installer les dependances

```bash
cd frontend
yarn install
```

### 4.2 Configurer le fichier .env du frontend

```env
EXPO_PUBLIC_BACKEND_URL=https://app.logirent.ch
```

### 4.3 Build pour le Web

```bash
npx expo export --platform web
```

Les fichiers seront generes dans `dist/`.

### 4.4 Deployer les fichiers statiques

```bash
sudo mkdir -p /var/www/logirent
sudo cp -r dist/* /var/www/logirent/
```

---

## Etape 5 : Configurer Nginx (Reverse Proxy)

Creez `/etc/nginx/sites-available/logirent` :

```nginx
server {
    listen 80;
    server_name app.logirent.ch;

    # Frontend - fichiers statiques
    location / {
        root /var/www/logirent;
        try_files $uri $uri/ /index.html;
    }

    # Backend API - proxy vers FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

Activez :

```bash
sudo ln -s /etc/nginx/sites-available/logirent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Etape 6 : SSL (HTTPS)

```bash
sudo certbot --nginx -d app.logirent.ch
```

---

## Etape 7 : Demarrage automatique

```bash
pm2 save
pm2 startup
# Suivez les instructions affichees
```

---

## Etape 8 : Backups automatiques

```bash
crontab -e
# Ajouter:
0 2 * * * /home/$USER/apps/LOGIRENT/scripts/cron_backup.sh
```

---

## Verification

```bash
# Verifier tout d'un coup
./scripts/04_verify.sh

# Ou manuellement
./scripts/backend.sh status
curl http://localhost:8001/api/vehicles
```

Ouvrez `https://app.logirent.ch` et connectez-vous :
- **Super Admin** : superadmin@logirent.ch / LogiRent2024!
- **Admin agence** : admin-geneva@logirent.ch / LogiRent2024!

---

## Commandes utiles

```bash
# GESTION BACKEND (TOUJOURS via backend.sh)
./scripts/backend.sh start
./scripts/backend.sh stop
./scripts/backend.sh restart
./scripts/backend.sh status
./scripts/backend.sh logs

# BACKUPS
python3 scripts/backup.py status
python3 scripts/backup.py backup
python3 scripts/backup.py restore

# NGINX
sudo tail -f /var/log/nginx/error.log
sudo systemctl reload nginx

# MONGODB
mongosh logirent --eval 'db.stats()'
```

---

## RESOLUTION : Erreur "port 8001 already in use"

Si vous obtenez `[Errno 98] address already in use` :

```bash
# Methode 1 : Utiliser backend.sh (recommande)
./scripts/backend.sh restart

# Methode 2 : Tuer manuellement tout ce qui occupe le port
lsof -ti :8001 | xargs kill -9
./scripts/backend.sh start

# Methode 3 : Nettoyage complet
pm2 delete all
lsof -ti :8001 | xargs kill -9 2>/dev/null
./scripts/backend.sh start
```

**Cause habituelle** : Lancer `uvicorn` manuellement puis oublier de l'arreter avant de demarrer PM2.

---

## Checklist de securite

- [ ] JWT_SECRET genere aleatoirement (32+ caracteres)
- [ ] Changer le mot de passe Super Admin apres premiere connexion
- [ ] Firewall : `sudo ufw allow 80,443/tcp`
- [ ] Verifier le domaine Resend pour les emails
- [ ] Backups automatiques configures (crontab)
- [ ] Ne JAMAIS lancer `uvicorn` directement, toujours `backend.sh`
