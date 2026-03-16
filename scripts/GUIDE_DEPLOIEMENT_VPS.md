# Guide de Deploiement LogiRent sur VPS

## Prerequis

- VPS avec Ubuntu 20.04+ (ou Debian)
- Node.js 18+ et npm/yarn
- Python 3.10+
- MongoDB Atlas (votre cluster est deja configure)
- Un nom de domaine pointe vers votre VPS (ex: app.logirent.ch)

---

## Etape 1 : Installer les dependances systeme

```bash
# Mettre a jour le systeme
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer Python 3.10+ et pip
sudo apt install -y python3 python3-pip python3-venv

# Installer PM2 (gestionnaire de processus)
sudo npm install -g pm2

# Installer Nginx (reverse proxy)
sudo apt install -y nginx

# Installer certbot pour SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
```

---

## Etape 2 : Cloner le projet

```bash
cd /home/votre-utilisateur
git clone <votre-repo-url> logirent
cd logirent
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

Creez le fichier `/home/votre-utilisateur/logirent/backend/.env` :

```env
MONGO_URL=mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0
DB_NAME=logirent
JWT_SECRET=CHANGEZ-CECI-PAR-UNE-CLE-SECRETE-ALEATOIRE
STRIPE_API_KEY=votre_cle_stripe
RESEND_API_KEY=votre_cle_resend
SENDER_EMAIL=contact@logirent.ch
NAVIXY_API_URL=https://login.logitrak.fr/api-v2
NAVIXY_HASH=votre_hash_navixy
EMERGENT_LLM_KEY=votre_cle_emergent
```

**IMPORTANT** : Changez `DB_NAME` en `logirent` (ou le nom que vous voulez pour la production).

### 3.3 Creer le Super Admin dans la base de donnees

```bash
# Installez les dependances du script
pip install pymongo bcrypt dnspython

# Executez le script de seed
python3 ../scripts/seed_superadmin.py
```

Cela creera votre premier compte Super Admin :
- **Email** : admin@logirent.ch
- **Mot de passe** : LogiRent2024!

### 3.4 Lancer le backend

```bash
# Tester que ca fonctionne
uvicorn server:app --host 0.0.0.0 --port 8001

# Si ca marche, arreter (Ctrl+C) et utiliser PM2
pm2 start "uvicorn server:app --host 0.0.0.0 --port 8001" --name logirent-backend
pm2 save
```

---

## Etape 4 : Configurer le Frontend

### 4.1 Installer les dependances

```bash
cd ../frontend
yarn install
```

### 4.2 Configurer le fichier .env du frontend

Creez le fichier `/home/votre-utilisateur/logirent/frontend/.env` :

```env
EXPO_PUBLIC_BACKEND_URL=https://app.logirent.ch
```

### 4.3 Build pour le Web

```bash
npx expo export:web
# Ou selon votre version d'Expo :
npx expo export --platform web
```

Les fichiers seront generes dans le dossier `dist/` ou `web-build/`.

### 4.4 Servir le frontend avec Nginx ou PM2

**Option A : Fichiers statiques via Nginx** (recommande pour le web) :
```bash
sudo cp -r dist/* /var/www/logirent/
```

**Option B : Avec PM2** (si vous utilisez un serveur de dev) :
```bash
pm2 start "npx expo start --web --port 3000" --name logirent-frontend
pm2 save
```

---

## Etape 5 : Configurer Nginx (Reverse Proxy)

Creez le fichier `/etc/nginx/sites-available/logirent` :

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

Activez le site :

```bash
sudo ln -s /etc/nginx/sites-available/logirent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Etape 6 : Configurer SSL (HTTPS)

```bash
sudo certbot --nginx -d app.logirent.ch
```

Certbot modifiera automatiquement votre configuration Nginx pour HTTPS.

---

## Etape 7 : Demarrage automatique

```bash
# Sauvegarder la config PM2
pm2 save

# Configurer PM2 pour demarrer au boot
pm2 startup
# Suivez les instructions affichees
```

---

## Verification

1. Ouvrez `https://app.logirent.ch` dans votre navigateur
2. Connectez-vous avec : `admin@logirent.ch` / `LogiRent2024!`
3. Creez votre premiere agence depuis le panneau Super Admin

---

## Commandes utiles

```bash
# Voir les logs du backend
pm2 logs logirent-backend

# Redemarrer le backend
pm2 restart logirent-backend

# Voir le statut des services
pm2 status

# Voir les logs Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## Checklist de securite

- [ ] Changer le JWT_SECRET par une cle aleatoire (32+ caracteres)
- [ ] Changer le mot de passe du Super Admin apres la premiere connexion
- [ ] Configurer le firewall (UFW) : `sudo ufw allow 80,443/tcp`
- [ ] Verifier le domaine avec Resend pour les emails
- [ ] Sauvegardes automatiques de MongoDB Atlas
