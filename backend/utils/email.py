import asyncio
import logging
import os
import resend
from datetime import datetime
from database import RESEND_API_KEY, SENDER_EMAIL

resend.api_key = RESEND_API_KEY
logger = logging.getLogger(__name__)


async def send_email(recipient: str, subject: str, html_content: str):
    if not RESEND_API_KEY or RESEND_API_KEY == 're_placeholder':
        logger.info(f"Email would be sent to {recipient}: {subject}")
        return None

    params = {
        "from": SENDER_EMAIL,
        "to": [recipient],
        "subject": subject,
        "html": html_content
    }

    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {recipient}: {email.get('id')}")
        return email.get("id")
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {str(e)}")
        return None


def generate_reservation_confirmation_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    start_date = reservation['start_date']
    end_date = reservation['end_date']
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))

    return f'''
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1E293B; margin: 0; padding: 0; background-color: #F8FAFC;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1E3A8A; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #FFFFFF; margin: 0; font-size: 28px;">LogiRent</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Reservation Confirmed</p>
            </div>
            <div style="background-color: #FFFFFF; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #1E3A8A; margin-top: 0;">Hello {user_name}!</h2>
                <p>Your reservation has been confirmed. Here are the details:</p>
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1E3A8A;">{vehicle['brand']} {vehicle['model']} ({vehicle['year']})</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #64748B;">Pick-up Date:</td><td style="padding: 8px 0; font-weight: bold;">{start_date.strftime('%B %d, %Y')}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748B;">Return Date:</td><td style="padding: 8px 0; font-weight: bold;">{end_date.strftime('%B %d, %Y')}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748B;">Duration:</td><td style="padding: 8px 0; font-weight: bold;">{reservation['total_days']} days</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748B;">Location:</td><td style="padding: 8px 0; font-weight: bold;">{vehicle['location']}</td></tr>
                    </table>
                </div>
                <div style="background-color: #1E3A8A; color: #FFFFFF; padding: 15px 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 14px;">Total Amount:</span>
                    <span style="font-size: 24px; font-weight: bold; margin-left: 10px;">CHF {reservation['total_price']:.2f}</span>
                </div>
                <p style="margin-top: 20px; color: #64748B; font-size: 14px;">
                    Please bring your valid driving license when picking up the vehicle.
                    For any questions, contact us at {SENDER_EMAIL}.
                </p>
                <p style="margin-top: 30px;">Safe travels!<br><strong>The RentDrive Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #64748B; font-size: 12px;">
                <p>&copy; 2024 RentDrive. All rights reserved.</p><p>LogiTrak Switzerland</p>
            </div>
        </div>
    </body></html>
    '''


async def send_reservation_confirmation(user: dict, vehicle: dict, reservation: dict):
    html = generate_reservation_confirmation_email(user['name'], vehicle, reservation)
    await send_email(
        user['email'],
        f"Reservation Confirmed - {vehicle['brand']} {vehicle['model']}",
        html
    )


def generate_cash_reservation_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    start_date = reservation['start_date']
    end_date = reservation['end_date']
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))

    return f'''
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1E293B; margin: 0; padding: 0; background-color: #F8FAFC;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #F59E0B; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #FFFFFF; margin: 0; font-size: 28px;">LogiRent</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Réservation en attente - Paiement en espèces</p>
            </div>
            <div style="background-color: #FFFFFF; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #F59E0B; margin-top: 0;">Bonjour {user_name}!</h2>
                <p>Votre réservation a été enregistrée avec paiement en espèces. Voici les détails:</p>
                <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                    <p style="margin: 0; color: #92400E;"><strong>Important:</strong> Le paiement sera effectué lors de la prise du véhicule.</p>
                </div>
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1E3A8A;">{vehicle['brand']} {vehicle['model']} ({vehicle['year']})</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #64748B;">Date de prise:</td><td style="padding: 8px 0; font-weight: bold;">{start_date.strftime('%d %B %Y')}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748B;">Date de retour:</td><td style="padding: 8px 0; font-weight: bold;">{end_date.strftime('%d %B %Y')}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748B;">Durée:</td><td style="padding: 8px 0; font-weight: bold;">{reservation['total_days']} jours</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748B;">Lieu:</td><td style="padding: 8px 0; font-weight: bold;">{vehicle['location']}</td></tr>
                    </table>
                </div>
                <div style="background-color: #F59E0B; color: #FFFFFF; padding: 15px 20px; border-radius: 8px; text-align: center;">
                    <span style="font-size: 14px;">Montant à payer en espèces:</span>
                    <span style="font-size: 24px; font-weight: bold; margin-left: 10px;">CHF {reservation['total_price']:.2f}</span>
                </div>
                <p style="margin-top: 20px; color: #64748B; font-size: 14px;">
                    N'oubliez pas d'apporter votre permis de conduire valide.
                    Pour toute question, contactez-nous à {SENDER_EMAIL}.
                </p>
                <p style="margin-top: 30px;">Bonne route!<br><strong>L'équipe RentDrive</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #64748B; font-size: 12px;">
                <p>&copy; 2024 RentDrive. Tous droits réservés.</p><p>LogiTrak Suisse</p>
            </div>
        </div>
    </body></html>
    '''


async def send_cash_reservation_email(user: dict, vehicle: dict, reservation: dict):
    html = generate_cash_reservation_email(user['name'], vehicle, reservation)
    await send_email(
        user['email'],
        f"Réservation en attente - {vehicle['brand']} {vehicle['model']} (Paiement espèces)",
        html
    )


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


async def send_welcome_email(recipient: str, client_name: str, password: str, agency_name: str):
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

    return await send_email(recipient, subject, html)
