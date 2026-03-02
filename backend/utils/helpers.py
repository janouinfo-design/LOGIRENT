import re
import uuid
import logging
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
            system_message="Tu es un expert en vérification de documents d'identité. Tu dois analyser les images soumises et déterminer si elles représentent de vrais documents officiels. Réponds UNIQUEMENT en JSON valide."
        ).with_model("openai", "gpt-5.2")

        image_content = ImageContent(image_base64=raw_b64)

        prompt = f"""Analyse cette image et détermine si c'est un(e) {doc_name} valide.

Critères de vérification:
1. L'image montre-t-elle un document officiel (pas une photo d'écran, pas un dessin) ?
2. Le document est-il lisible (pas trop flou, pas coupé) ?
3. Le document ressemble-t-il à un vrai {doc_name} (format, éléments de sécurité visibles) ?
4. L'image n'est-elle pas une photo d'un autre objet (voiture, animal, paysage, etc.) ?

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans backticks):
{{"is_valid": true/false, "confidence": 0-100, "reason": "explication courte en français", "document_type_detected": "type détecté", "name_detected": "nom si lisible ou null", "warnings": ["liste d'avertissements si applicable"]}}"""

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
