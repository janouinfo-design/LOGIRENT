import re
import uuid
import logging
from datetime import datetime
from database import EMERGENT_LLM_KEY

logger = logging.getLogger(__name__)


def generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[àáâãäå]', 'a', slug)
    slug = re.sub(r'[èéêë]', 'e', slug)
    slug = re.sub(r'[ìíîï]', 'i', slug)
    slug = re.sub(r'[òóôõö]', 'o', slug)
    slug = re.sub(r'[ùúûü]', 'u', slug)
    slug = re.sub(r'[ç]', 'c', slug)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


async def verify_document_with_ai(image_base64: str, doc_type: str) -> dict:
    if not EMERGENT_LLM_KEY:
        return {"is_valid": True, "confidence": 0, "reason": "Vérification IA non configurée", "details": {}}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

        raw_b64 = image_base64
        if ";base64," in raw_b64:
            raw_b64 = raw_b64.split(";base64,")[1]

        doc_name = "carte d'identité" if doc_type == "id" else "permis de conduire"

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"doc-verify-{uuid.uuid4()}",
            system_message="Tu es un expert en vérification de documents d'identité. Analyse les images soumises avec rigueur. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks."
        ).with_model("openai", "gpt-5.2")

        image_content = ImageContent(image_base64=raw_b64)

        prompt = f"""Analyse cette image et détermine si c'est un(e) {doc_name} valide.

Critères de vérification STRICTS:
1. DOCUMENT OFFICIEL: L'image montre-t-elle un vrai document officiel? (pas une capture d'écran, pas un dessin, pas un document imprimé à la maison)
2. TYPE CORRECT: Le document correspond-il bien à un(e) {doc_name}? Si c'est un autre type de document, rejeter.
3. LISIBILITÉ: Le document est-il lisible? Vérifier: image floue, trop sombre, coupée, surexposée, trop petite.
4. QUALITÉ IMAGE: L'image est-elle de qualité suffisante? Rejeter si: image vide, entièrement noire/blanche, très basse résolution.
5. CONTENU PERTINENT: L'image ne montre-t-elle pas un objet sans rapport (voiture, animal, paysage, selfie, etc.)?
6. DATE D'EXPIRATION: Si une date d'expiration est visible et lisible, vérifier si le document est expiré (date actuelle: {datetime.utcnow().strftime('%Y-%m-%d')}).
7. FACE DU DOCUMENT: Identifier s'il s'agit du recto ou du verso du document.

Réponds UNIQUEMENT avec ce JSON:
{{"is_valid": true/false, "confidence": 0-100, "reason": "explication courte en français", "document_type_detected": "type détecté", "face": "recto/verso/inconnu", "name_detected": "nom si lisible ou null", "expiry_date": "date si visible ou null", "is_expired": false, "is_blurry": false, "is_wrong_document": false, "quality_score": 0-100, "warnings": ["liste d'avertissements"], "rejection_reasons": ["raisons de rejet si invalide"]}}"""

        user_message = UserMessage(text=prompt, file_contents=[image_content])
        response = await chat.send_message(user_message)

        import json as json_module
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json_module.loads(response_text)
        return result
    except Exception as e:
        logger.error(f"AI document verification failed: {e}")
        return {"is_valid": True, "confidence": 0, "reason": f"Vérification IA échouée: {str(e)[:100]}", "details": {}}


async def analyze_vehicle_damage(image_base64: str, context: str = "general") -> dict:
    """Analyse une photo de véhicule pour détecter des dommages via IA."""
    if not EMERGENT_LLM_KEY:
        return {"damages_detected": False, "damages": [], "overall_condition": "unknown", "confidence": 0, "summary": "IA non configuree"}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

        raw_b64 = image_base64
        if ";base64," in raw_b64:
            raw_b64 = raw_b64.split(";base64,")[1]

        context_text = {
            "checkout": "Cette photo a ete prise AVANT la location (depart/checkout).",
            "checkin": "Cette photo a ete prise APRES la location (retour/checkin).",
            "general": "Analyse generale du vehicule.",
        }.get(context, "Analyse generale du vehicule.")

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"damage-detect-{uuid.uuid4()}",
            system_message="Tu es un expert en inspection automobile. Tu analyses des photos de vehicules pour detecter rayures, bosses, fissures, et tout dommage visible. Reponds UNIQUEMENT en JSON valide, sans markdown ni backticks."
        ).with_model("openai", "gpt-5.2")

        image_content = ImageContent(image_base64=raw_b64)

        prompt = f"""{context_text}

Analyse cette photo de vehicule et detecte TOUS les dommages visibles.

Pour chaque dommage detecte, indique:
- type: rayure, bosse, fissure, eclat, decoloration, autre
- zone: avant, arriere, cote_gauche, cote_droit, toit, capot, pare-brise, pare-chocs, portiere, aile, retroviseur, jante
- severite: leger, modere, important
- description: description courte en francais

Reponds UNIQUEMENT avec ce JSON:
{{"damages_detected": true/false, "damages": [{{"type": "rayure", "zone": "portiere", "severite": "leger", "description": "Rayure superficielle sur la portiere avant gauche"}}], "overall_condition": "excellent/bon/moyen/mauvais", "confidence": 0-100, "summary": "Resume court en francais de l'etat du vehicule", "photo_quality": "bonne/moyenne/mauvaise", "recommendations": ["liste de recommandations si necessaire"]}}"""

        user_message = UserMessage(text=prompt, file_contents=[image_content])
        response = await chat.send_message(user_message)

        import json as json_module
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json_module.loads(response_text)
        return result
    except Exception as e:
        logger.error(f"AI damage detection failed: {e}")
        return {"damages_detected": False, "damages": [], "overall_condition": "unknown", "confidence": 0, "summary": f"Analyse IA echouee: {str(e)[:100]}"}
