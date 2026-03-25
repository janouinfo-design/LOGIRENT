"""
Script de seed pour TimeSheet - Données cohérentes pour une entreprise suisse
Crée: départements, clients, projets, employés, pointages, absences, notes de frais, 
documents RH, factures, messages, notifications, planning
"""
import asyncio
import os
from datetime import datetime, timedelta
import random
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "timesheet")

# Données réalistes suisses
DEPARTMENTS = [
    {"name": "Direction", "description": "Direction générale et stratégie"},
    {"name": "Informatique", "description": "Développement et infrastructure IT"},
    {"name": "Ressources Humaines", "description": "Gestion du personnel et recrutement"},
    {"name": "Finance", "description": "Comptabilité, contrôle de gestion"},
    {"name": "Commercial", "description": "Ventes et relation client"},
    {"name": "Chantier", "description": "Equipes terrain et construction"},
]

CLIENTS = [
    {"name": "Swisscom SA", "email": "contact@swisscom.ch", "phone": "+41 58 221 00 00", "address": "Alte Tiefenaustrasse 6, 3048 Worblaufen"},
    {"name": "Nestlé Suisse SA", "email": "info@nestle.ch", "phone": "+41 21 924 21 11", "address": "Avenue Nestlé 55, 1800 Vevey"},
    {"name": "Commune de Lausanne", "email": "info@lausanne.ch", "phone": "+41 21 315 21 11", "address": "Place de la Palud 2, 1003 Lausanne"},
    {"name": "EPFL", "email": "contact@epfl.ch", "phone": "+41 21 693 11 11", "address": "Route Cantonale, 1015 Lausanne"},
    {"name": "Hôpital du Valais", "email": "info@hopitalvs.ch", "phone": "+41 27 603 40 00", "address": "Avenue du Grand-Champsec 80, 1950 Sion"},
    {"name": "Migros Genève", "email": "contact@migros-geneve.ch", "phone": "+41 22 791 21 11", "address": "Rue des Alpes 11, 1201 Genève"},
]

PROJECTS = [
    {"name": "Migration Cloud Swisscom", "client_idx": 0, "dept_idx": 1, "budget": 250000, "hourly_rate": 150, "currency": "CHF", "description": "Migration infrastructure vers Azure Cloud", "location": "Berne", "lat": 46.9480, "lng": 7.4474, "radius": 200},
    {"name": "Refonte ERP Nestlé", "client_idx": 1, "dept_idx": 1, "budget": 180000, "hourly_rate": 130, "currency": "CHF", "description": "Modernisation du système ERP SAP vers S/4HANA", "location": "Vevey", "lat": 46.4602, "lng": 6.8432, "radius": 150},
    {"name": "Smart City Lausanne", "client_idx": 2, "dept_idx": 1, "budget": 320000, "hourly_rate": 140, "currency": "CHF", "description": "Capteurs IoT et plateforme de monitoring urbain", "location": "Lausanne", "lat": 46.5197, "lng": 6.6323, "radius": 300},
    {"name": "Laboratoire IA EPFL", "client_idx": 3, "dept_idx": 1, "budget": 95000, "hourly_rate": 120, "currency": "CHF", "description": "Développement de modèles ML pour la recherche", "location": "EPFL Lausanne", "lat": 46.5191, "lng": 6.5668, "radius": 250},
    {"name": "Rénovation Hôpital Sion", "client_idx": 4, "dept_idx": 5, "budget": 450000, "hourly_rate": 95, "currency": "CHF", "description": "Travaux de rénovation aile sud", "location": "Sion", "lat": 46.2330, "lng": 7.3600, "radius": 200},
    {"name": "Installation Réseau Migros", "client_idx": 5, "dept_idx": 1, "budget": 75000, "hourly_rate": 110, "currency": "CHF", "description": "Déploiement réseau fibre optique magasins", "location": "Genève", "lat": 46.2044, "lng": 6.1432, "radius": 150},
]

EMPLOYEES = [
    {"first_name": "Marc", "last_name": "Dubois", "email": "admin@timesheet.ch", "password": "admin123", "role": "admin", "dept_idx": 0, "phone": "+41 79 312 45 67", "contract_hours": 42},
    {"first_name": "Sophie", "last_name": "Favre", "email": "manager@test.ch", "password": "test123", "role": "manager", "dept_idx": 1, "phone": "+41 79 445 23 89", "contract_hours": 42},
    {"first_name": "Pierre", "last_name": "Bonnet", "email": "employe@test.ch", "password": "test123", "role": "employee", "dept_idx": 1, "phone": "+41 79 567 12 34", "contract_hours": 42},
    {"first_name": "Marie", "last_name": "Martin", "email": "marie.martin@timesheet.ch", "password": "test123", "role": "employee", "dept_idx": 2, "phone": "+41 79 678 34 56", "contract_hours": 42},
    {"first_name": "Lucas", "last_name": "Girard", "email": "lucas.girard@timesheet.ch", "password": "test123", "role": "employee", "dept_idx": 5, "phone": "+41 79 789 45 67", "contract_hours": 42},
    {"first_name": "Camille", "last_name": "Roux", "email": "camille.roux@timesheet.ch", "password": "test123", "role": "employee", "dept_idx": 4, "phone": "+41 79 890 56 78", "contract_hours": 42},
    {"first_name": "Thomas", "last_name": "Müller", "email": "thomas.muller@timesheet.ch", "password": "test123", "role": "employee", "dept_idx": 1, "phone": "+41 79 901 67 89", "contract_hours": 42},
    {"first_name": "Laura", "last_name": "Schneider", "email": "laura.schneider@timesheet.ch", "password": "test123", "role": "manager", "dept_idx": 3, "phone": "+41 79 012 78 90", "contract_hours": 42},
    {"first_name": "Nicolas", "last_name": "Bianchi", "email": "nicolas.bianchi@timesheet.ch", "password": "test123", "role": "employee", "dept_idx": 5, "phone": "+41 79 123 89 01", "contract_hours": 42},
    {"first_name": "Isabelle", "last_name": "Petit", "email": "isabelle.petit@timesheet.ch", "password": "test123", "role": "employee", "dept_idx": 2, "phone": "+41 79 234 90 12", "contract_hours": 40},
]

ACTIVITIES = [
    {"name": "Développement", "code": "DEV", "description": "Programmation et développement logiciel"},
    {"name": "Design", "code": "DES", "description": "Conception graphique et UX/UI"},
    {"name": "Réunion", "code": "REU", "description": "Réunions internes et externes"},
    {"name": "Formation", "code": "FOR", "description": "Formation et montée en compétences"},
    {"name": "Support", "code": "SUP", "description": "Support technique et maintenance"},
    {"name": "Chantier", "code": "CHA", "description": "Travaux sur site"},
    {"name": "Administration", "code": "ADM", "description": "Tâches administratives"},
]

EXPENSE_TEMPLATES = [
    {"category": "Transport", "descriptions": ["Train Lausanne-Berne AR", "Taxi aéroport Genève", "Abonnement CFF mensuel", "Parking Lausanne centre", "Frais kilométriques visite client"]},
    {"category": "Repas", "descriptions": ["Déjeuner client Swisscom", "Repas d'équipe fin de sprint", "Dîner séminaire Montreux", "Lunch meeting partenaire"]},
    {"category": "Materiel", "descriptions": ["Câbles réseau Cat6", "Clavier ergonomique", "Ecran 27 pouces", "Casque antibruit"]},
    {"category": "Hebergement", "descriptions": ["Hôtel Berne 2 nuits", "Hôtel Zurich conférence", "Airbnb Genève mission"]},
    {"category": "Communication", "descriptions": ["Forfait mobile pro", "Licence Zoom annuelle", "Abonnement Teams"]},
]

HR_DOC_TEMPLATES = [
    {"category": "Contrat", "titles": ["Contrat de travail CDI", "Avenant contrat - augmentation", "Convention de télétravail"]},
    {"category": "Certificat", "titles": ["Certificat de travail intermédiaire", "Attestation employeur", "Certificat de salaire 2025"]},
    {"category": "Formation", "titles": ["Attestation formation Scrum Master", "Diplôme CAS Management", "Certificat Azure AZ-900"]},
    {"category": "Evaluation", "titles": ["Entretien annuel 2025", "Objectifs Q1 2026", "Bilan mi-parcours"]},
    {"category": "Medical", "titles": ["Certificat médical - 3 jours", "Attestation aptitude travail"]},
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Drop all collections
    for col in ['departments', 'clients', 'projects', 'users', 'activities', 'timeentries', 'leaves', 'expenses', 'hr_documents', 'invoices', 'messages', 'conversations', 'notifications', 'schedules']:
        await db[col].drop()

    print("Collections nettoyées")

    # 1. Départements
    dept_ids = []
    for d in DEPARTMENTS:
        r = await db.departments.insert_one({**d, 'is_active': True, 'created_at': datetime.utcnow()})
        dept_ids.append(str(r.inserted_id))
    print(f"  {len(dept_ids)} départements créés")

    # 2. Clients
    client_ids = []
    for c in CLIENTS:
        r = await db.clients.insert_one({**c, 'is_active': True, 'created_at': datetime.utcnow()})
        client_ids.append(str(r.inserted_id))
    print(f"  {len(client_ids)} clients créés")

    # 3. Projets
    project_ids = []
    for p in PROJECTS:
        doc = {
            'name': p['name'], 'client_id': client_ids[p['client_idx']], 'description': p['description'],
            'location': p['location'], 'budget': p['budget'], 'hourly_rate': p['hourly_rate'], 'currency': p['currency'],
            'latitude': p['lat'], 'longitude': p['lng'], 'geofence_radius': p['radius'],
            'status': 'active', 'is_active': True, 'created_at': datetime.utcnow(),
            'start_date': '2026-01-01', 'end_date': '2026-12-31',
        }
        r = await db.projects.insert_one(doc)
        project_ids.append(str(r.inserted_id))
    print(f"  {len(project_ids)} projets créés")

    # 4. Activités
    for a in ACTIVITIES:
        await db.activities.insert_one({**a, 'is_active': True, 'created_at': datetime.utcnow()})
    print(f"  {len(ACTIVITIES)} activités créées")

    # 5. Utilisateurs
    user_ids = []
    user_map = {}
    for emp in EMPLOYEES:
        doc = {
            'first_name': emp['first_name'], 'last_name': emp['last_name'],
            'email': emp['email'], 'password_hash': pwd_context.hash(emp['password']),
            'role': emp['role'], 'department_id': dept_ids[emp['dept_idx']],
            'phone': emp['phone'], 'contract_hours': emp['contract_hours'],
            'vacation_days': 25, 'is_active': True, 'created_at': datetime.utcnow(),
        }
        r = await db.users.insert_one(doc)
        uid = str(r.inserted_id)
        user_ids.append(uid)
        user_map[uid] = emp
    print(f"  {len(user_ids)} utilisateurs créés")

    # 6. Pointages - 2 mois complets (février + mars 2026)
    entry_count = 0
    locations = ['office', 'home', 'onsite']
    # Assigner chaque employé à 1-2 projets
    emp_projects = {}
    for i, uid in enumerate(user_ids):
        if EMPLOYEES[i]['dept_idx'] == 5:  # Chantier
            emp_projects[uid] = [project_ids[4]]  # Rénovation Hôpital
        elif EMPLOYEES[i]['dept_idx'] == 1:  # IT
            emp_projects[uid] = [project_ids[i % 4]]
        elif EMPLOYEES[i]['dept_idx'] == 4:  # Commercial
            emp_projects[uid] = [project_ids[5]]
        else:
            emp_projects[uid] = [project_ids[2]]  # Smart City

    for month in [2, 3]:
        end_day = 28 if month == 2 else 4  # Février complet + début mars
        for day in range(1, end_day + 1):
            date_str = f"2026-{month:02d}-{day:02d}"
            dt = datetime(2026, month, day)
            if dt.weekday() >= 5:  # Skip weekends
                continue
            for uid in user_ids[1:]:  # Skip admin pour certaines entrées
                if random.random() < 0.08:  # 8% absence aléatoire
                    continue
                proj_id = random.choice(emp_projects.get(uid, [project_ids[0]]))
                loc = random.choice(locations)
                hour_start = random.choice([7, 7, 7, 8, 8])
                min_start = random.choice([0, 15, 30, 45])
                hour_end = random.choice([16, 16, 17, 17, 17])
                min_end = random.choice([0, 15, 30, 45])
                clock_in = datetime(2026, month, day, hour_start, min_start)
                clock_out = datetime(2026, month, day, hour_end, min_end)
                break_start = datetime(2026, month, day, 12, 0)
                break_end = datetime(2026, month, day, 12, random.choice([30, 45]))
                total = (clock_out - clock_in).total_seconds() / 3600 - (break_end - break_start).total_seconds() / 3600
                status = 'approved' if month == 2 else random.choice(['approved', 'approved', 'pending'])
                await db.timeentries.insert_one({
                    'user_id': uid, 'project_id': proj_id, 'date': date_str,
                    'clock_in': clock_in, 'clock_out': clock_out,
                    'break_start': break_start, 'break_end': break_end,
                    'duration': round(total, 2), 'work_location': loc,
                    'status': status, 'billable': True, 'created_at': datetime.utcnow(),
                })
                entry_count += 1
    print(f"  {entry_count} pointages créés")

    # 7. Absences (variées)
    leave_types = ['vacation', 'sick', 'training', 'special']
    leave_reasons = {
        'vacation': ['Vacances ski Verbier', 'Vacances famille Tessin', 'Semaine relâche', 'Congé personnel', 'Vacances été'],
        'sick': ['Grippe', 'Mal de dos', 'Rendez-vous médical', 'Maladie'],
        'training': ['Formation Scrum Master', 'Cours Azure certif', 'Workshop sécurité', 'Conférence tech Zurich'],
        'special': ['Déménagement', 'Mariage ami', 'Rendez-vous administratif'],
    }
    leave_count = 0
    for uid in user_ids[2:]:
        num_leaves = random.randint(1, 3)
        for _ in range(num_leaves):
            lt = random.choice(leave_types)
            start_day = random.randint(10, 25)
            duration = random.randint(1, 5) if lt == 'vacation' else random.randint(1, 3)
            start = f"2026-03-{start_day:02d}"
            end = f"2026-03-{min(start_day + duration, 31):02d}"
            status = random.choice(['pending', 'approved', 'approved'])
            await db.leaves.insert_one({
                'user_id': uid, 'type': lt, 'start_date': start, 'end_date': end,
                'reason': random.choice(leave_reasons[lt]), 'status': status,
                'created_at': datetime.utcnow(),
            })
            leave_count += 1
    print(f"  {leave_count} absences créées")

    # 8. Notes de frais
    expense_count = 0
    for uid in user_ids[1:]:
        num_exp = random.randint(2, 5)
        for _ in range(num_exp):
            cat = random.choice(EXPENSE_TEMPLATES)
            day = random.randint(1, 28)
            month = random.choice([2, 3])
            amount_ranges = {'Transport': (15, 180), 'Repas': (20, 85), 'Materiel': (50, 500), 'Hebergement': (120, 350), 'Communication': (30, 90)}
            mn, mx = amount_ranges.get(cat['category'], (20, 100))
            amount = round(random.uniform(mn, mx), 2)
            proj_id = random.choice(emp_projects.get(uid, [project_ids[0]]))
            status = random.choice(['pending', 'approved', 'approved', 'approved'])
            await db.expenses.insert_one({
                'user_id': uid, 'amount': amount, 'category': cat['category'],
                'description': random.choice(cat['descriptions']),
                'date': f"2026-{month:02d}-{day:02d}", 'project_id': proj_id,
                'status': status, 'created_at': datetime.utcnow(),
            })
            expense_count += 1
    print(f"  {expense_count} notes de frais créées")

    # 9. Documents RH
    doc_count = 0
    for uid in user_ids:
        num_docs = random.randint(1, 3)
        for _ in range(num_docs):
            cat = random.choice(HR_DOC_TEMPLATES)
            await db.hr_documents.insert_one({
                'user_id': uid, 'title': random.choice(cat['titles']),
                'category': cat['category'], 'content': f"Document {cat['category']} pour {user_map[uid]['first_name']} {user_map[uid]['last_name']}",
                'created_at': datetime.utcnow() - timedelta(days=random.randint(0, 90)),
            })
            doc_count += 1
    print(f"  {doc_count} documents RH créés")

    # 10. Factures
    inv_count = 0
    statuses = ['draft', 'sent', 'paid', 'paid', 'paid', 'overdue']
    for i, proj in enumerate(PROJECTS):
        for m in range(1, 4):
            inv_num = f"FAC-2026-{(i*3+m):04d}"
            hours = round(random.uniform(40, 180), 1)
            amount = round(hours * proj['hourly_rate'], 2)
            status = random.choice(statuses) if m < 3 else 'draft'
            await db.invoices.insert_one({
                'invoice_number': inv_num, 'client_id': client_ids[proj['client_idx']],
                'project_id': project_ids[i], 'amount': amount, 'hours': hours,
                'status': status, 'due_date': f"2026-{m+1:02d}-15",
                'notes': f"Prestations {proj['name']} - mois {m}/2026",
                'created_at': datetime.utcnow() - timedelta(days=(3-m)*30),
            })
            inv_count += 1
    print(f"  {inv_count} factures créées")

    # 11. Conversations et messages
    conv_count = 0
    msg_count = 0
    conversations = [
        {"participants": [user_ids[0], user_ids[1]], "topic": "Planning sprint 12"},
        {"participants": [user_ids[1], user_ids[2], user_ids[6]], "topic": "Bug production urgent"},
        {"participants": [user_ids[0], user_ids[7]], "topic": "Budget Q2 2026"},
        {"participants": [user_ids[3], user_ids[9]], "topic": "Planification recrutement"},
        {"participants": [user_ids[1], user_ids[4], user_ids[8]], "topic": "Avancement chantier Sion"},
    ]
    for conv in conversations:
        r = await db.conversations.insert_one({
            'participants': conv['participants'], 'topic': conv['topic'],
            'created_at': datetime.utcnow() - timedelta(days=random.randint(1, 14)),
            'updated_at': datetime.utcnow(),
        })
        conv_id = str(r.inserted_id)
        conv_count += 1
        messages = [
            "Bonjour, on peut faire le point rapidement ?",
            "Oui bien sûr, je suis disponible à 14h",
            "Parfait, je t'envoie l'invitation Teams",
            "J'ai mis à jour le board Jira avec les nouvelles tâches",
            "Super, je regarde ça cet après-midi",
            "N'oublie pas la deadline vendredi pour le livrable",
            "C'est noté, je fais le nécessaire",
            "Est-ce que tu as validé les heures de février ?",
        ]
        num_msgs = random.randint(3, 6)
        for j in range(num_msgs):
            sender = random.choice(conv['participants'])
            await db.messages.insert_one({
                'conversation_id': conv_id, 'sender_id': sender,
                'content': messages[j % len(messages)],
                'created_at': datetime.utcnow() - timedelta(hours=random.randint(1, 48*num_msgs) - j*2),
                'read_by': [sender],
            })
            msg_count += 1
    print(f"  {conv_count} conversations, {msg_count} messages créés")

    # 12. Notifications
    notif_count = 0
    notif_templates = [
        {"type": "info", "title": "Pointage validé", "msg": "Vos heures de la semaine ont été validées par votre manager"},
        {"type": "success", "title": "Absence approuvée", "msg": "Votre demande de congé a été approuvée"},
        {"type": "warning", "title": "Heures manquantes", "msg": "Il manque des pointages pour le {date}. Veuillez compléter."},
        {"type": "info", "title": "Nouvelle tâche assignée", "msg": "Vous avez été assigné au projet {project}"},
        {"type": "success", "title": "Note de frais remboursée", "msg": "Votre note de frais de {amount} CHF a été remboursée"},
        {"type": "warning", "title": "Rappel: feuille de temps", "msg": "N'oubliez pas de soumettre votre feuille de temps hebdomadaire"},
        {"type": "error", "title": "Pointage refusé", "msg": "Votre pointage du {date} a été refusé. Contactez votre manager."},
        {"type": "info", "title": "Réunion d'équipe", "msg": "Rappel: réunion d'équipe demain à 09h00 en salle A"},
    ]
    for uid in user_ids:
        num_notifs = random.randint(3, 7)
        for _ in range(num_notifs):
            tmpl = random.choice(notif_templates)
            msg = tmpl['msg'].replace('{date}', '2026-03-03').replace('{project}', random.choice([p['name'] for p in PROJECTS])).replace('{amount}', str(random.randint(50, 300)))
            await db.notifications.insert_one({
                'user_id': uid, 'type': tmpl['type'], 'title': tmpl['title'],
                'message': msg, 'read': random.choice([True, True, False]),
                'created_at': datetime.utcnow() - timedelta(hours=random.randint(1, 168)),
            })
            notif_count += 1
    print(f"  {notif_count} notifications créées")

    # 13. Horaires/Schedules
    for uid in user_ids:
        schedule_type = 'fixed' if random.random() > 0.3 else 'flexible'
        schedule = {'user_id': uid, 'type': schedule_type, 'weekly_hours': user_map[uid]['contract_hours'], 'created_at': datetime.utcnow()}
        if schedule_type == 'fixed':
            schedule['days'] = {
                'monday': {'start': '08:00', 'end': '17:00', 'break': 45},
                'tuesday': {'start': '08:00', 'end': '17:00', 'break': 45},
                'wednesday': {'start': '08:00', 'end': '17:00', 'break': 45},
                'thursday': {'start': '08:00', 'end': '17:00', 'break': 45},
                'friday': {'start': '08:00', 'end': '16:00', 'break': 45},
            }
        await db.schedules.insert_one(schedule)
    print(f"  {len(user_ids)} horaires créés")

    print("\n Seed terminé avec succès!")
    print(f"  Total: {len(dept_ids)} depts, {len(client_ids)} clients, {len(project_ids)} projets, {len(user_ids)} users")
    print(f"  {entry_count} pointages, {leave_count} absences, {expense_count} frais")
    print(f"  {doc_count} docs RH, {inv_count} factures, {msg_count} messages, {notif_count} notifs")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
