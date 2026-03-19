# LogiRent - Guide de Migration et Maintenance
================================================

## MIGRATION EFFECTUEE

### Résumé
- **Source**: MongoDB local (logirent) - Emergent Preview
- **Cible**: MongoDB Atlas (logirent) - cluster0.isugn1l.mongodb.net
- **Documents migrés**: 312
- **Relations vérifiées**: 100% valides
- **Données nettoyées**: 333 corrections automatiques

### Base de données finale (logirent)

| Collection | Documents | Description |
|---|---|---|
| agencies | 15 | Agences de location |
| users | 93 | Admins + clients |
| vehicles | 35 | Flotte de véhicules |
| reservations | 58 | Réservations clients |
| contracts | 22 | Contrats PDF signés |
| contract_templates | 6 | Modèles par agence |
| notifications | 71 | Alertes in-app |
| payment_transactions | 26 | Sessions Stripe |
| push_tokens | 3 | Tokens notifications |
| password_resets | 2 | Demandes reset |

### Relations entre collections

```
agencies
  ├── users (agency_id)
  ├── vehicles (agency_id)
  ├── reservations (agency_id)
  ├── contracts (agency_id)
  └── contract_templates (agency_id)

users
  ├── reservations (user_id)
  ├── contracts (user_id)
  ├── notifications (user_id)
  └── payment_transactions (user_id)

vehicles
  ├── reservations (vehicle_id)
  └── contracts (vehicle_id)

reservations
  ├── contracts (reservation_id)
  └── payment_transactions (reservation_id)
```

---

## SCRIPTS DISPONIBLES

### 1. Migration complète
```bash
cd ~/apps/LOGIRENT/scripts
python3 migrate.py full      # Export + Normalise + Import + Vérifie
python3 migrate.py export    # Export seulement
python3 migrate.py normalize # Nettoyage seulement
python3 migrate.py import    # Import seulement
python3 migrate.py audit     # Audit source + cible
python3 migrate.py verify    # Vérification relations
```

### 2. Backup / Restauration
```bash
python3 backup.py backup              # Crée un backup horodaté
python3 backup.py restore             # Restaure le dernier backup
python3 backup.py restore backup_20260318.json  # Restaure un backup spécifique
python3 backup.py reset               # Vide la base (avec confirmation)
```

### 3. Seed données de démo
```bash
python3 seed_demo.py    # Insère clients, véhicules, réservations réalistes
```

### 4. Backup automatique quotidien
```bash
# Installer le cron (backup à 2h du matin)
crontab -e
# Ajouter cette ligne:
0 2 * * * /home/user/apps/LOGIRENT/scripts/cron_backup.sh
```

---

## CONFIGURATION BACKEND (.env)

```env
MONGO_URL=mongodb+srv://janouinfo_db_user:Omar2007@cluster0.isugn1l.mongodb.net/?appName=Cluster0
DB_NAME=logirent
JWT_SECRET=CHANGEZ-PAR-CLE-ALEATOIRE-32-CHARS
STRIPE_API_KEY=sk_test_...
RESEND_API_KEY=re_...
SENDER_EMAIL=contact@logirent.ch
NAVIXY_API_URL=https://login.logitrak.fr/api-v2
NAVIXY_HASH=votre_hash
```

## CONFIGURATION FRONTEND (.env)

```env
EXPO_PUBLIC_BACKEND_URL=https://app.logirent.ch
```

---

## COMPTES DE TEST

| Rôle | Email | Mot de passe |
|---|---|---|
| Super Admin | test@example.com | password123 |
| Super Admin | superadmin@logirent.ch | LogiRent2024! |
| Admin Genève | admin-geneva@logirent.ch | LogiRent2024 |
| Admin Lausanne | admin-lausanne@logirent.ch | LogiRent2024! |
| Client | client1@test.com | test1234 |
| Client | jean.dupont@gmail.com | LogiRent2024! |

---

## SÉCURITÉ

- Credentials dans .env uniquement (jamais en dur)
- JWT_SECRET: 32+ caractères aléatoires
- MongoDB Atlas: accès limité par IP whitelist
- HTTPS via Let's Encrypt (certbot)
- Rotation des backups: 7 derniers conservés

---

## DÉPANNAGE

### Backend ne démarre pas
```bash
pm2 logs logirent-backend --lines 50
```

### Frontend page blanche
```bash
# Rebuild le frontend
cd ~/apps/LOGIRENT/frontend
npx expo export --platform web
sudo cp -r dist/* /var/www/logirent/
sudo systemctl reload nginx
```

### Base corrompue
```bash
cd ~/apps/LOGIRENT/scripts
python3 backup.py restore    # Restaure le dernier backup
```

### Recréer toutes les données
```bash
python3 backup.py reset
python3 seed_demo.py
```
