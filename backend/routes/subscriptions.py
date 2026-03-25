from fastapi import APIRouter, Depends
from config import db
from utils.auth import get_current_user

router = APIRouter()

@router.get("/subscriptions/plans")
async def get_plans(user=Depends(get_current_user)):
    return [
        {'id': 'basic', 'name': 'Basic', 'price': 5, 'currency': 'CHF', 'per': 'employe/mois',
         'features': ['Pointage', 'Absences', 'Rapports de base', 'Max 10 employes']},
        {'id': 'pro', 'name': 'Professional', 'price': 12, 'currency': 'CHF', 'per': 'employe/mois',
         'features': ['Tout Basic', 'GPS Geofencing', 'Planning', 'Notes de frais', 'Facturation', 'Export paie', 'Employes illimites']},
        {'id': 'enterprise', 'name': 'Enterprise', 'price': 25, 'currency': 'CHF', 'per': 'employe/mois',
         'features': ['Tout Professional', 'Multi-entreprise', 'API avancee', 'Support prioritaire', 'Audit complet', 'SSO / LDAP']}
    ]

@router.get("/subscriptions/current")
async def get_current_subscription(user=Depends(get_current_user)):
    sub = await db.subscriptions.find_one({'company_id': user.get('company_id', 'default')})
    if not sub:
        return {'plan': 'pro', 'status': 'active', 'employees': 8, 'next_billing': '2026-04-01'}
    return {
        'plan': sub.get('plan', 'basic'), 'status': sub.get('status', 'active'),
        'employees': sub.get('employees', 0), 'next_billing': sub.get('next_billing', '')
    }
