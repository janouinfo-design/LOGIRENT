import asyncio
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import base64
import resend
from datetime import datetime
from database import RESEND_API_KEY, SENDER_EMAIL, db

resend.api_key = RESEND_API_KEY
logger = logging.getLogger(__name__)


async def _send_via_smtp(smtp_config: dict, recipient: str, subject: str, html_content: str, attachments: list = None):
    """Send email via custom SMTP server."""
    host = smtp_config.get('host')
    port = int(smtp_config.get('port', 587))
    email = smtp_config.get('email')
    password = smtp_config.get('password')
    use_tls = smtp_config.get('use_tls', True)
    sender_name = smtp_config.get('sender_name', '')

    sender = f"{sender_name} <{email}>" if sender_name else email

    msg = MIMEMultipart('alternative')
    msg['From'] = sender
    msg['To'] = recipient
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))

    if attachments:
        for att in attachments:
            part = MIMEBase('application', 'octet-stream')
            content = att.get('content', '')
            if isinstance(content, str):
                content = base64.b64decode(content)
            part.set_payload(content)
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="{att.get("filename", "file")}"')
            msg.attach(part)

    def _do_send():
        if use_tls:
            server = smtplib.SMTP(host, port, timeout=15)
            server.starttls()
        else:
            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=15)
            else:
                server = smtplib.SMTP(host, port, timeout=15)
        server.login(email, password)
        server.sendmail(email, [recipient], msg.as_string())
        server.quit()

    await asyncio.to_thread(_do_send)
    logger.info(f"SMTP email sent to {recipient} via {host}")
    return True


async def send_email(recipient: str, subject: str, html_content: str, attachments: list = None, agency_id: str = None):
    """Send email. Uses agency SMTP if configured, otherwise falls back to Resend."""

    # Try agency SMTP first
    smtp = None
    if agency_id:
        try:
            agency = await db.agencies.find_one({"id": agency_id}, {"_id": 0, "smtp_config": 1})
            smtp = agency.get('smtp_config') if agency else None
        except Exception as e:
            logger.error(f"Error fetching agency SMTP config: {e}")

    # If no agency_id or no SMTP config, try any agency with SMTP configured
    if not smtp or not smtp.get('host'):
        try:
            any_agency = await db.agencies.find_one(
                {"smtp_config.host": {"$exists": True, "$ne": ""}},
                {"_id": 0, "smtp_config": 1}
            )
            if any_agency:
                smtp = any_agency.get('smtp_config')
        except Exception as e:
            logger.error(f"Error finding any agency SMTP: {e}")

    if smtp and smtp.get('host') and smtp.get('email') and smtp.get('password'):
        try:
            await _send_via_smtp(smtp, recipient, subject, html_content, attachments)
            return "smtp_sent"
        except Exception as e:
            logger.error(f"Agency SMTP failed, falling back to Resend: {e}")

    # Fallback to Resend
    if not RESEND_API_KEY or RESEND_API_KEY == 're_placeholder':
        logger.info(f"Email would be sent to {recipient}: {subject}")
        return None

    params = {
        "from": SENDER_EMAIL,
        "to": [recipient],
        "subject": subject,
        "html": html_content
    }

    if attachments:
        params["attachments"] = attachments

    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {recipient}: {email.get('id')}")
        return email.get("id")
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {str(e)}")
        return None


def _format_date(d):
    if isinstance(d, str):
        try:
            d = datetime.fromisoformat(d.replace('Z', '+00:00'))
        except Exception:
            return d
    if isinstance(d, datetime):
        return d.strftime('%d/%m/%Y')
    return str(d)


def _email_wrapper(title_text: str, accent_color: str, body_html: str) -> str:
    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1E293B;margin:0;padding:0;background-color:#F8FAFC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#1A1A2E;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px;">LogiRent</h1>
    <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">{title_text}</p>
  </div>
  <div style="background-color:#FFFFFF;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    {body_html}
    <p style="color:#64748B;font-size:13px;margin-top:20px;">Pour toute question, contactez-nous a {SENDER_EMAIL}.</p>
    <p style="margin-top:24px;">Cordialement,<br><strong>L\'equipe LogiRent</strong></p>
  </div>
  <div style="text-align:center;padding:16px;color:#64748B;font-size:11px;">LogiRent - Location de vehicules en Suisse</div>
</div></body></html>'''


def _documents_reminder_block() -> str:
    return '''<div style="background-color:#FEF3C7;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #F59E0B;">
      <p style="margin:0 0 8px;color:#92400E;font-weight:bold;">Documents obligatoires a presenter</p>
      <ul style="margin:0;padding-left:20px;color:#92400E;">
        <li>Carte d\'identite physique (originale, en cours de validite)</li>
        <li>Permis de conduire physique (original, en cours de validite)</li>
      </ul>
      <p style="margin:8px 0 0;color:#92400E;font-size:12px;">Sans ces documents, le vehicule ne pourra pas vous etre remis.</p>
    </div>'''


def _reservation_details_block(vehicle: dict, reservation: dict) -> str:
    start = _format_date(reservation.get('start_date', ''))
    end = _format_date(reservation.get('end_date', ''))
    vname = f"{vehicle['brand']} {vehicle['model']}"
    category = vehicle.get('type', 'Standard')
    location = vehicle.get('location', '')
    total_days = reservation.get('total_days', 0)
    total_price = reservation.get('total_price', 0)
    return f'''<div style="background-color:#F8FAFC;padding:20px;border-radius:8px;margin:20px 0;">
      <h3 style="margin-top:0;color:#1A1A2E;">{vname}</h3>
      <p style="margin:0 0 12px;color:#64748B;font-size:13px;">Categorie : {category}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">Date de prise en charge :</td><td style="padding:6px 0;font-weight:bold;">{start}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Date de retour :</td><td style="padding:6px 0;font-weight:bold;">{end}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Duree :</td><td style="padding:6px 0;font-weight:bold;">{total_days} jour(s)</td></tr>
        {"<tr><td style='padding:6px 0;color:#64748B;'>Lieu :</td><td style='padding:6px 0;font-weight:bold;'>" + location + "</td></tr>" if location else ""}
      </table>
    </div>
    <div style="background-color:#1A1A2E;color:#FFFFFF;padding:15px 20px;border-radius:8px;text-align:center;">
      <span style="font-size:14px;">Montant total :</span>
      <span style="font-size:24px;font-weight:bold;margin-left:10px;">CHF {total_price:.2f}</span>
    </div>'''


def generate_reservation_confirmation_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    payment_method = reservation.get('payment_method', 'card')
    cash_note = ''
    if payment_method == 'cash':
        cash_note = '''<div style="background-color:#EEF2FF;padding:12px;border-radius:8px;margin:16px 0;">
          <p style="margin:0;color:#4338CA;font-size:13px;">Le paiement sera effectue en especes lors de la prise en charge du vehicule.</p>
        </div>'''

    body = f'''
    <div style="text-align:center;padding:16px;background-color:#10B98115;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#10B981;margin:0;font-size:20px;">Reservation Confirmee</h2>
    </div>
    <p>Bonjour <strong>{user_name}</strong>,</p>
    <p>Nous avons le plaisir de vous confirmer votre reservation. Nous vous garantissons le vehicule reserve ou un vehicule equivalent de la meme categorie.</p>
    {_reservation_details_block(vehicle, reservation)}
    {cash_note}
    {_documents_reminder_block()}'''

    return _email_wrapper('Confirmation de reservation', '#10B981', body)


async def send_reservation_confirmation(user: dict, vehicle: dict, reservation: dict, agency_id: str = None):
    html = generate_reservation_confirmation_email(user['name'], vehicle, reservation)
    vname = f"{vehicle['brand']} {vehicle['model']}"
    await send_email(
        user['email'],
        f"Reservation confirmee - {vname} | LogiRent",
        html,
        agency_id=agency_id
    )


def generate_payment_confirmation_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    body = f'''
    <div style="text-align:center;padding:16px;background-color:#10B98115;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#10B981;margin:0;font-size:20px;">Paiement Confirme</h2>
    </div>
    <p>Bonjour <strong>{user_name}</strong>,</p>
    <p>Nous confirmons la bonne reception de votre paiement. Votre reservation est desormais entierement validee.</p>
    {_reservation_details_block(vehicle, reservation)}
    <div style="background-color:#10B98115;padding:12px;border-radius:8px;margin:16px 0;text-align:center;">
      <p style="margin:0;color:#047857;font-weight:bold;">Paiement recu - Reservation validee</p>
    </div>
    {_documents_reminder_block()}'''

    return _email_wrapper('Confirmation de paiement', '#10B981', body)


async def send_payment_confirmation(user: dict, vehicle: dict, reservation: dict):
    html = generate_payment_confirmation_email(user['name'], vehicle, reservation)
    vname = f"{vehicle['brand']} {vehicle['model']}"
    await send_email(
        user['email'],
        f"Paiement confirme - {vname} | LogiRent",
        html
    )


def generate_reminder_24h_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    start = _format_date(reservation.get('start_date', ''))
    location = vehicle.get('location', '')

    body = f'''
    <div style="text-align:center;padding:16px;background-color:#3B82F615;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#3B82F6;margin:0;font-size:20px;">Rappel - Votre location commence demain</h2>
    </div>
    <p>Bonjour <strong>{user_name}</strong>,</p>
    <p>Nous vous rappelons que votre location debute <strong>demain le {start}</strong>.</p>
    {_reservation_details_block(vehicle, reservation)}
    {_documents_reminder_block()}
    <div style="background-color:#EEF2FF;padding:12px;border-radius:8px;margin:16px 0;">
      <p style="margin:0;color:#4338CA;font-size:13px;">{"Lieu de prise en charge : <strong>" + location + "</strong>" if location else "Le lieu de prise en charge vous sera communique par votre agence."}</p>
    </div>'''

    return _email_wrapper('Rappel - Location demain', '#3B82F6', body)


async def send_reminder_24h(user: dict, vehicle: dict, reservation: dict):
    html = generate_reminder_24h_email(user['name'], vehicle, reservation)
    vname = f"{vehicle['brand']} {vehicle['model']}"
    await send_email(
        user['email'],
        f"Rappel : votre location de {vname} commence demain | LogiRent",
        html
    )


def generate_cash_reservation_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    """Legacy - now handled by generate_reservation_confirmation_email with payment_method=cash"""
    return generate_reservation_confirmation_email(user_name, vehicle, reservation)


async def send_cash_reservation_email(user: dict, vehicle: dict, reservation: dict):
    """Legacy - now uses the unified confirmation email"""
    await send_reservation_confirmation(user, vehicle, reservation)


def generate_status_change_email(user_name: str, vehicle_name: str, status: str, reservation: dict) -> str:
    start_date = reservation.get('start_date', '')
    end_date = reservation.get('end_date', '')
    if isinstance(start_date, datetime):
        start_date = start_date.strftime('%d/%m/%Y')
    elif isinstance(start_date, str):
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).strftime('%d/%m/%Y')
        except Exception:
            pass
    if isinstance(end_date, datetime):
        end_date = end_date.strftime('%d/%m/%Y')
    elif isinstance(end_date, str):
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).strftime('%d/%m/%Y')
        except Exception:
            pass

    status_info = {
        'confirmed': {'title': 'Réservation Confirmée', 'color': '#10B981', 'msg': f'Votre réservation pour <strong>{vehicle_name}</strong> a été confirmée.'},
        'active': {'title': 'Location En Cours', 'color': '#7C3AED', 'msg': f'Votre location de <strong>{vehicle_name}</strong> est maintenant active. Bon trajet !'},
        'completed': {'title': 'Location Terminée', 'color': '#6B7280', 'msg': f'Votre location de <strong>{vehicle_name}</strong> est terminée. Merci de votre confiance !'},
        'cancelled': {'title': 'Réservation Annulée', 'color': '#EF4444', 'msg': f'Votre réservation pour <strong>{vehicle_name}</strong> a été annulée.'},
    }
    info = status_info.get(status, {'title': 'Mise à jour', 'color': '#6B7280', 'msg': 'Le statut de votre réservation a été mis à jour.'})

    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1E293B;margin:0;padding:0;background-color:#F8FAFC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#1A1A2E;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px;">LogiRent</h1>
    <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">Mise à jour de votre réservation</p>
  </div>
  <div style="background-color:#FFFFFF;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align:center;padding:16px;background-color:{info["color"]}15;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:{info["color"]};margin:0;font-size:20px;">{info["title"]}</h2>
    </div>
    <p>Bonjour <strong>{user_name}</strong>,</p>
    <p>{info["msg"]}</p>
    <div style="background-color:#F8FAFC;padding:16px;border-radius:8px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">Véhicule:</td><td style="padding:6px 0;font-weight:bold;">{vehicle_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Du:</td><td style="padding:6px 0;font-weight:bold;">{start_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Au:</td><td style="padding:6px 0;font-weight:bold;">{end_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Montant:</td><td style="padding:6px 0;font-weight:bold;">CHF {reservation.get("total_price", 0):.2f}</td></tr>
      </table>
    </div>
    <p style="color:#64748B;font-size:13px;">Pour toute question, contactez-nous à {SENDER_EMAIL}.</p>
    <p style="margin-top:24px;">Cordialement,<br><strong>L'équipe LogiRent</strong></p>
  </div>
  <div style="text-align:center;padding:16px;color:#64748B;font-size:11px;">LogiRent - Location de véhicules</div>
</div></body></html>'''


async def send_welcome_email(recipient: str, client_name: str, password: str, agency_name: str, agency_id: str = None):
    """Send welcome email with credentials and QR code for mobile app"""
    import qrcode
    import io
    import base64

    # Generate QR code for the mobile app link
    app_url = os.environ.get('APP_URL', 'https://logirent.ch')
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(app_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    qr_img.save(buf, format='PNG')
    qr_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

    subject = f"Bienvenue chez {agency_name} - Vos identifiants de connexion"

    html = f'''<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#F1F5F9;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1A1A2E,#6366F1);padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">{agency_name}</h1>
    <p style="color:#C7D2FE;margin:8px 0 0;">Bienvenue sur notre plateforme de location</p>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:16px;color:#1E293B;">Bonjour <strong>{client_name}</strong>,</p>
    <p style="color:#475569;line-height:1.6;">
      Votre compte a été créé avec succès par <strong>{agency_name}</strong>.
      Vous pouvez désormais vous connecter pour consulter nos véhicules disponibles et effectuer vos réservations.
    </p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;">Vos identifiants de connexion</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#64748B;font-size:13px;width:100px;">Email</td>
          <td style="padding:8px 0;color:#1E293B;font-weight:700;font-size:14px;">{recipient}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748B;font-size:13px;">Mot de passe</td>
          <td style="padding:8px 0;font-size:14px;">
            <code style="background:#EEF2FF;padding:4px 10px;border-radius:6px;color:#4338CA;font-weight:700;font-size:15px;letter-spacing:1px;">
              {password}
            </code>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;color:#EF4444;font-size:11px;">
        Nous vous recommandons de changer votre mot de passe après votre première connexion.
      </p>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="{app_url}" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px;">
        Se connecter maintenant
      </a>
    </div>

    <div style="background:#FAFAFA;border:1px solid #E5E7EB;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
      <h3 style="margin:0 0 8px;color:#1A1A2E;font-size:14px;">Application mobile</h3>
      <p style="color:#64748B;font-size:12px;margin:0 0 12px;">Scannez ce QR code pour accéder à l'application</p>
      <img src="data:image/png;base64,{qr_b64}" alt="QR Code" style="width:150px;height:150px;" />
      <p style="color:#6366F1;font-size:11px;margin:8px 0 0;">{app_url}</p>
    </div>

    <p style="color:#64748B;font-size:13px;margin-top:20px;">
      Pour toute question, n'hésitez pas à nous contacter.
    </p>
    <p style="margin-top:16px;color:#1E293B;">
      Cordialement,<br><strong>L'équipe {agency_name}</strong>
    </p>
  </div>
  <div style="text-align:center;padding:16px;color:#94A3B8;font-size:11px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
    {agency_name} — Location de véhicules | <a href="{app_url}" style="color:#6366F1;">{app_url}</a>
  </div>
</div></body></html>'''

    return await send_email(recipient, subject, html, agency_id=agency_id)



def generate_contract_signed_email(client_name: str, vehicle_name: str, contract_number: str, reservation: dict, agency_name: str = "LogiRent") -> str:
    start_date = reservation.get('start_date', '')
    end_date = reservation.get('end_date', '')
    if isinstance(start_date, datetime):
        start_date = start_date.strftime('%d/%m/%Y')
    elif isinstance(start_date, str):
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).strftime('%d/%m/%Y')
        except Exception:
            pass
    if isinstance(end_date, datetime):
        end_date = end_date.strftime('%d/%m/%Y')
    elif isinstance(end_date, str):
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).strftime('%d/%m/%Y')
        except Exception:
            pass

    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1E293B;margin:0;padding:0;background-color:#F8FAFC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#1A1A2E;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px;">{agency_name}</h1>
    <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">Contrat de location signe</p>
  </div>
  <div style="background-color:#FFFFFF;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align:center;padding:16px;background-color:#10B98115;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#10B981;margin:0;font-size:20px;">Contrat Signe avec Succes</h2>
    </div>
    <p>Bonjour <strong>{client_name}</strong>,</p>
    <p>Votre contrat de location <strong>N&deg; {contract_number}</strong> pour le vehicule <strong>{vehicle_name}</strong> a ete signe avec succes.</p>
    <p>Vous trouverez le contrat signe en piece jointe de cet email au format PDF.</p>
    <div style="background-color:#F8FAFC;padding:16px;border-radius:8px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">Vehicule:</td><td style="padding:6px 0;font-weight:bold;">{vehicle_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Du:</td><td style="padding:6px 0;font-weight:bold;">{start_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Au:</td><td style="padding:6px 0;font-weight:bold;">{end_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Montant:</td><td style="padding:6px 0;font-weight:bold;">CHF {reservation.get("total_price", 0):.2f}</td></tr>
      </table>
    </div>
    <div style="text-align:center;padding:12px;background-color:#EEF2FF;border-radius:8px;margin:16px 0;">
      <p style="margin:0;color:#4338CA;font-size:13px;">Le PDF du contrat est joint a cet email</p>
    </div>
    <p style="color:#64748B;font-size:13px;">Pour toute question, contactez-nous a {SENDER_EMAIL}.</p>
    <p style="margin-top:24px;">Cordialement,<br><strong>L'equipe {agency_name}</strong></p>
  </div>
  <div style="text-align:center;padding:16px;color:#64748B;font-size:11px;">{agency_name} - Location de vehicules</div>
</div></body></html>'''
