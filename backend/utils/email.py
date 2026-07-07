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
from utils.email_texts import tr

resend.api_key = RESEND_API_KEY
logger = logging.getLogger(__name__)


def _user_lang(user: dict) -> str:
    if not user:
        return 'fr'
    lang = user.get('preferred_language') or 'fr'
    return lang if lang in ('fr', 'en', 'de') else 'fr'


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


def _email_wrapper(title_text: str, accent_color: str, body_html: str, lang: str = 'fr') -> str:
    T = tr(lang)
    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1E293B;margin:0;padding:0;background-color:#F8FAFC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#1A1A2E;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px;">LogiRent</h1>
    <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">{title_text}</p>
  </div>
  <div style="background-color:#FFFFFF;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    {body_html}
    <p style="color:#64748B;font-size:13px;margin-top:20px;">{T['contact'].format(email=SENDER_EMAIL)}</p>
    <p style="margin-top:24px;">{T['regards']}<br><strong>{T['team'].format(name='LogiRent')}</strong></p>
  </div>
  <div style="text-align:center;padding:16px;color:#64748B;font-size:11px;">{T['footer'].format(name='LogiRent')}</div>
</div></body></html>'''


def _documents_reminder_block(lang: str = 'fr') -> str:
    T = tr(lang)
    return f'''<div style="background-color:#FEF3C7;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #F59E0B;">
      <p style="margin:0 0 8px;color:#92400E;font-weight:bold;">{T['docs_title']}</p>
      <ul style="margin:0;padding-left:20px;color:#92400E;">
        <li>{T['docs_id']}</li>
        <li>{T['docs_license']}</li>
      </ul>
      <p style="margin:8px 0 0;color:#92400E;font-size:12px;">{T['docs_warning']}</p>
    </div>'''


def _reservation_details_block(vehicle: dict, reservation: dict, lang: str = 'fr') -> str:
    T = tr(lang)
    start = _format_date(reservation.get('start_date', ''))
    end = _format_date(reservation.get('end_date', ''))
    vname = f"{vehicle['brand']} {vehicle['model']}"
    category = vehicle.get('type', 'Standard')
    location = vehicle.get('location', '')
    total_days = reservation.get('total_days', 0)
    total_price = reservation.get('total_price', 0)
    return f'''<div style="background-color:#F8FAFC;padding:20px;border-radius:8px;margin:20px 0;">
      <h3 style="margin-top:0;color:#1A1A2E;">{vname}</h3>
      <p style="margin:0 0 12px;color:#64748B;font-size:13px;">{T['cat_label']} : {category}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">{T['pickup']} :</td><td style="padding:6px 0;font-weight:bold;">{start}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">{T['ret']} :</td><td style="padding:6px 0;font-weight:bold;">{end}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">{T['duration']} :</td><td style="padding:6px 0;font-weight:bold;">{total_days} {T['days']}</td></tr>
        {"<tr><td style='padding:6px 0;color:#64748B;'>" + T['location_label'] + " :</td><td style='padding:6px 0;font-weight:bold;'>" + location + "</td></tr>" if location else ""}
      </table>
    </div>
    <div style="background-color:#1A1A2E;color:#FFFFFF;padding:15px 20px;border-radius:8px;text-align:center;">
      <span style="font-size:14px;">{T['total']} :</span>
      <span style="font-size:24px;font-weight:bold;margin-left:10px;">CHF {total_price:.2f}</span>
    </div>'''


def generate_reservation_confirmation_email(user_name: str, vehicle: dict, reservation: dict, lang: str = 'fr') -> str:
    T = tr(lang)
    payment_method = reservation.get('payment_method', 'card')
    cash_note = ''
    if payment_method == 'cash':
        cash_note = f'''<div style="background-color:#EEF2FF;padding:12px;border-radius:8px;margin:16px 0;">
          <p style="margin:0;color:#4338CA;font-size:13px;">{T['cash_note']}</p>
        </div>'''

    body = f'''
    <div style="text-align:center;padding:16px;background-color:#10B98115;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#10B981;margin:0;font-size:20px;">{T['conf_title']}</h2>
    </div>
    <p>{T['hello']} <strong>{user_name}</strong>,</p>
    <p>{T['conf_text']}</p>
    {_reservation_details_block(vehicle, reservation, lang)}
    {cash_note}
    {_documents_reminder_block(lang)}'''

    return _email_wrapper(T['conf_header'], '#10B981', body, lang)


async def send_reservation_confirmation(user: dict, vehicle: dict, reservation: dict, agency_id: str = None):
    lang = _user_lang(user)
    html = generate_reservation_confirmation_email(user['name'], vehicle, reservation, lang)
    vname = f"{vehicle['brand']} {vehicle['model']}"
    await send_email(
        user['email'],
        tr(lang)['conf_subject'].format(v=vname),
        html,
        agency_id=agency_id
    )


def generate_reservation_request_email(user_name: str, vehicle: dict, reservation: dict, lang: str = 'fr') -> str:
    T = tr(lang)
    body = f'''
    <div style="text-align:center;padding:16px;background-color:#F59E0B15;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#F59E0B;margin:0;font-size:20px;">{T['req_title']}</h2>
    </div>
    <p>{T['hello']} <strong>{user_name}</strong>,</p>
    <p>{T['req_text']}</p>
    {_reservation_details_block(vehicle, reservation, lang)}
    <div style="background-color:#FEF3C715;padding:12px;border-radius:8px;margin:16px 0;border:1px solid #F59E0B30;">
      <p style="margin:0;color:#92400E;font-size:13px;">{T['req_pending']}</p>
    </div>
    {_documents_reminder_block(lang)}'''

    return _email_wrapper(T['req_header'], '#F59E0B', body, lang)


async def send_reservation_request_email(user: dict, vehicle: dict, reservation: dict, agency_id: str = None):
    lang = _user_lang(user)
    html = generate_reservation_request_email(user['name'], vehicle, reservation, lang)
    vname = f"{vehicle['brand']} {vehicle['model']}"
    await send_email(
        user['email'],
        tr(lang)['req_subject'].format(v=vname),
        html,
        agency_id=agency_id
    )


def generate_new_request_admin_email(client: dict, vehicle: dict, reservation: dict) -> str:
    vname = f"{vehicle['brand']} {vehicle['model']}"
    start = _format_date(reservation.get('start_date', ''))
    end = _format_date(reservation.get('end_date', ''))
    total_days = reservation.get('total_days', 0)
    total_price = reservation.get('total_price', 0)
    payment = 'Especes' if reservation.get('payment_method') == 'cash' else 'Carte'
    client_phone = client.get('phone', '-')
    client_email = client.get('email', '-')
    body = f'''
    <div style="text-align:center;padding:16px;background-color:#F59E0B15;border-radius:8px;margin-bottom:20px;border:2px solid #F59E0B;">
      <h2 style="color:#92400E;margin:0;font-size:20px;">Nouvelle demande de reservation</h2>
      <p style="color:#92400E;margin:6px 0 0;font-size:13px;">Une action de votre part est requise</p>
    </div>
    <div style="background-color:#F8FAFC;padding:20px;border-radius:8px;margin:20px 0;">
      <h3 style="margin-top:0;color:#1A1A2E;">Details du client</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">Nom :</td><td style="padding:6px 0;font-weight:bold;">{client.get('name', '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Email :</td><td style="padding:6px 0;font-weight:bold;">{client_email}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Telephone :</td><td style="padding:6px 0;font-weight:bold;">{client_phone}</td></tr>
      </table>
    </div>
    <div style="background-color:#F8FAFC;padding:20px;border-radius:8px;margin:20px 0;">
      <h3 style="margin-top:0;color:#1A1A2E;">Details de la demande</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">Vehicule :</td><td style="padding:6px 0;font-weight:bold;">{vname}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Du :</td><td style="padding:6px 0;font-weight:bold;">{start}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Au :</td><td style="padding:6px 0;font-weight:bold;">{end}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Duree :</td><td style="padding:6px 0;font-weight:bold;">{total_days} jour(s)</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Paiement :</td><td style="padding:6px 0;font-weight:bold;">{payment}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Montant :</td><td style="padding:6px 0;font-weight:bold;color:#10B981;">CHF {total_price}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://app.logirent.ch/agency-app" style="display:inline-block;background-color:#1A1A2E;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Traiter la demande</a>
    </div>
    <p style="color:#64748B;font-size:12px;text-align:center;">Connectez-vous au tableau de bord LogiRent pour confirmer ou refuser cette demande.</p>'''

    return _email_wrapper('Nouvelle demande de reservation', '#F59E0B', body)


async def send_new_request_admin_email(client: dict, vehicle: dict, reservation: dict, agency_id: str = None):
    """Send email to all agency admins when a client submits a new reservation request."""
    if not agency_id:
        return
    try:
        admins = await db.users.find({"agency_id": agency_id, "role": "admin"}).to_list(50)
        if not admins:
            return
        html = generate_new_request_admin_email(client, vehicle, reservation)
        vname = f"{vehicle['brand']} {vehicle['model']}"
        subject = f"Nouvelle demande - {client.get('name', 'Client')} - {vname} | LogiRent"
        for admin in admins:
            admin_email = admin.get('email')
            if admin_email:
                try:
                    await send_email(admin_email, subject, html, agency_id=agency_id)
                except Exception as e:
                    logger.error(f"Failed to send admin email to {admin_email}: {e}")
    except Exception as e:
        logger.error(f"Failed to send new request admin emails: {e}")


def generate_price_offer_email(client_name: str, vehicle: dict, reservation: dict, old_price: float, new_price: float, message: str = '', lang: str = 'fr') -> str:
    T = tr(lang)
    vname = f"{vehicle.get('brand', '')} {vehicle.get('model', '')}".strip()
    price_changed = abs((old_price or 0) - (new_price or 0)) > 0.01
    price_block = ''
    if price_changed:
        price_block = f'''
        <div style="background-color:#FEF3C7;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #F59E0B;">
          <p style="margin:0 0 8px;color:#92400E;font-weight:bold;font-size:14px;">{T['offer_new_price']}</p>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:#92400E;text-decoration:line-through;font-size:15px;">CHF {old_price:.2f}</span>
            <span style="color:#64748B;font-size:18px;">&rarr;</span>
            <span style="color:#10B981;font-weight:bold;font-size:22px;">CHF {new_price:.2f}</span>
          </div>
        </div>'''
    else:
        price_block = f'''
        <div style="background-color:#10B98115;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #10B981;">
          <p style="margin:0;color:#047857;font-weight:bold;font-size:14px;">{T['total']} : <span style="font-size:20px;">CHF {new_price:.2f}</span></p>
        </div>'''

    message_block = ''
    if message:
        message_block = f'''
        <div style="background-color:#F1F5F9;padding:14px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 6px;color:#64748B;font-size:12px;font-weight:bold;text-transform:uppercase;">{T['offer_msg_label']}</p>
          <p style="margin:0;color:#1E293B;font-size:14px;line-height:1.5;">{message}</p>
        </div>'''

    body = f'''
    <div style="text-align:center;padding:16px;background-color:#3B82F615;border-radius:8px;margin-bottom:20px;border:2px solid #3B82F6;">
      <h2 style="color:#1D4ED8;margin:0;font-size:20px;">{T['offer_header']}</h2>
      <p style="color:#1D4ED8;margin:6px 0 0;font-size:13px;">{T['offer_sub']}</p>
    </div>
    <p>{T['hello']} <strong>{client_name}</strong>,</p>
    <p>{T['offer_text'].format(v=vname)}</p>
    {_reservation_details_block(vehicle, reservation, lang)}
    {price_block}
    {message_block}
    <div style="background-color:#EFF6FF;padding:14px;border-radius:8px;margin:16px 0;border:1px solid #3B82F640;">
      <p style="margin:0;color:#1E40AF;font-size:13px;line-height:1.5;">
        {T['offer_accept']}
      </p>
    </div>
    {_documents_reminder_block(lang)}'''

    return _email_wrapper(T['offer_header'], '#3B82F6', body, lang)


async def send_price_offer_email(client: dict, vehicle: dict, reservation: dict, old_price: float, new_price: float, message: str = '', agency_id: str = None):
    if not client or not client.get('email'):
        return
    lang = _user_lang(client)
    html = generate_price_offer_email(client.get('name', ''), vehicle, reservation, old_price, new_price, message, lang)
    vname = f"{vehicle.get('brand', '')} {vehicle.get('model', '')}".strip()
    subject = tr(lang)['offer_subject'].format(v=vname, p=new_price)
    await send_email(client['email'], subject, html, agency_id=agency_id)


def generate_payment_confirmation_email(user_name: str, vehicle: dict, reservation: dict, lang: str = 'fr') -> str:
    T = tr(lang)
    body = f'''
    <div style="text-align:center;padding:16px;background-color:#10B98115;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#10B981;margin:0;font-size:20px;">{T['pay_title']}</h2>
    </div>
    <p>{T['hello']} <strong>{user_name}</strong>,</p>
    <p>{T['pay_text']}</p>
    {_reservation_details_block(vehicle, reservation, lang)}
    <div style="background-color:#10B98115;padding:12px;border-radius:8px;margin:16px 0;text-align:center;">
      <p style="margin:0;color:#047857;font-weight:bold;">{T['pay_badge']}</p>
    </div>
    {_documents_reminder_block(lang)}'''

    return _email_wrapper(T['pay_header'], '#10B981', body, lang)


async def send_payment_confirmation(user: dict, vehicle: dict, reservation: dict):
    lang = _user_lang(user)
    html = generate_payment_confirmation_email(user['name'], vehicle, reservation, lang)
    vname = f"{vehicle['brand']} {vehicle['model']}"
    await send_email(
        user['email'],
        tr(lang)['pay_subject'].format(v=vname),
        html
    )


def generate_reminder_24h_email(user_name: str, vehicle: dict, reservation: dict, lang: str = 'fr') -> str:
    T = tr(lang)
    start = _format_date(reservation.get('start_date', ''))
    location = vehicle.get('location', '')

    body = f'''
    <div style="text-align:center;padding:16px;background-color:#3B82F615;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#3B82F6;margin:0;font-size:20px;">{T['rem_title']}</h2>
    </div>
    <p>{T['hello']} <strong>{user_name}</strong>,</p>
    <p>{T['rem_text'].format(d=start)}</p>
    {_reservation_details_block(vehicle, reservation, lang)}
    {_documents_reminder_block(lang)}
    <div style="background-color:#EEF2FF;padding:12px;border-radius:8px;margin:16px 0;">
      <p style="margin:0;color:#4338CA;font-size:13px;">{T['rem_location'].format(loc=location) if location else T['rem_location_missing']}</p>
    </div>'''

    return _email_wrapper(T['rem_header'], '#3B82F6', body, lang)


async def send_reminder_24h(user: dict, vehicle: dict, reservation: dict):
    lang = _user_lang(user)
    html = generate_reminder_24h_email(user['name'], vehicle, reservation, lang)
    vname = f"{vehicle['brand']} {vehicle['model']}"
    await send_email(
        user['email'],
        tr(lang)['rem_subject'].format(v=vname),
        html
    )


def generate_cash_reservation_email(user_name: str, vehicle: dict, reservation: dict) -> str:
    """Legacy - now handled by generate_reservation_confirmation_email with payment_method=cash"""
    return generate_reservation_confirmation_email(user_name, vehicle, reservation)


async def send_cash_reservation_email(user: dict, vehicle: dict, reservation: dict):
    """Legacy - now uses the unified confirmation email"""
    await send_reservation_confirmation(user, vehicle, reservation)


def status_change_subject(status: str, vehicle_name: str, lang: str = 'fr') -> str:
    T = tr(lang)
    key = f'st_{status}_subject' if f'st_{status}_subject' in T else 'st_update_subject'
    return T[key].format(v=vehicle_name)


def generate_status_change_email(user_name: str, vehicle_name: str, status: str, reservation: dict, lang: str = 'fr') -> str:
    T = tr(lang)
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

    colors = {'confirmed': '#10B981', 'active': '#7C3AED', 'completed': '#6B7280', 'cancelled': '#EF4444'}
    if status in colors:
        title = T[f'st_{status}_title']
        msg = T[f'st_{status}_msg'].format(v=vehicle_name)
        color = colors[status]
    else:
        title = T['st_update_title']
        msg = T['st_update_msg']
        color = '#6B7280'

    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1E293B;margin:0;padding:0;background-color:#F8FAFC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#1A1A2E;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="color:#FFFFFF;margin:0;font-size:24px;">LogiRent</h1>
    <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">{T['st_header']}</p>
  </div>
  <div style="background-color:#FFFFFF;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align:center;padding:16px;background-color:{color}15;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:{color};margin:0;font-size:20px;">{title}</h2>
    </div>
    <p>{T['hello']} <strong>{user_name}</strong>,</p>
    <p>{msg}</p>
    <div style="background-color:#F8FAFC;padding:16px;border-radius:8px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">{T['veh_label']}:</td><td style="padding:6px 0;font-weight:bold;">{vehicle_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">{T['from_label']}:</td><td style="padding:6px 0;font-weight:bold;">{start_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">{T['to_label']}:</td><td style="padding:6px 0;font-weight:bold;">{end_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">{T['amount_label']}:</td><td style="padding:6px 0;font-weight:bold;">CHF {reservation.get("total_price", 0):.2f}</td></tr>
      </table>
    </div>
    <p style="color:#64748B;font-size:13px;">{T['contact'].format(email=SENDER_EMAIL)}</p>
    <p style="margin-top:24px;">{T['regards']}<br><strong>{T['team'].format(name='LogiRent')}</strong></p>
  </div>
  <div style="text-align:center;padding:16px;color:#64748B;font-size:11px;">{T['footer'].format(name='LogiRent')}</div>
</div></body></html>'''


async def send_welcome_email(recipient: str, client_name: str, password: str, agency_name: str, agency_id: str = None, lang: str = 'fr'):
    """Send welcome email with credentials and QR code for mobile app"""
    import qrcode
    import io
    import base64

    T = tr(lang)

    # Generate QR code for the mobile app link
    app_url = os.environ.get('APP_URL', 'https://logirent.ch')
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(app_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    qr_img.save(buf, format='PNG')
    qr_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

    subject = T['wel_subject'].format(name=agency_name)

    html = f'''<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#F1F5F9;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1A1A2E,#6366F1);padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">{agency_name}</h1>
    <p style="color:#C7D2FE;margin:8px 0 0;">{T['wel_sub']}</p>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:16px;color:#1E293B;">{T['hello']} <strong>{client_name}</strong>,</p>
    <p style="color:#475569;line-height:1.6;">
      {T['wel_text'].format(name=agency_name)}
    </p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 12px;color:#1A1A2E;font-size:15px;">{T['wel_creds']}</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#64748B;font-size:13px;width:100px;">{T['wel_email']}</td>
          <td style="padding:8px 0;color:#1E293B;font-weight:700;font-size:14px;">{recipient}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748B;font-size:13px;">{T['wel_pass']}</td>
          <td style="padding:8px 0;font-size:14px;">
            <code style="background:#EEF2FF;padding:4px 10px;border-radius:6px;color:#4338CA;font-weight:700;font-size:15px;letter-spacing:1px;">
              {password}
            </code>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;color:#EF4444;font-size:11px;">
        {T['wel_change']}
      </p>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="{app_url}" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px;">
        {T['wel_login']}
      </a>
    </div>

    <div style="background:#FAFAFA;border:1px solid #E5E7EB;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
      <h3 style="margin:0 0 8px;color:#1A1A2E;font-size:14px;">{T['wel_mobile']}</h3>
      <p style="color:#64748B;font-size:12px;margin:0 0 12px;">{T['wel_scan']}</p>
      <img src="data:image/png;base64,{qr_b64}" alt="QR Code" style="width:150px;height:150px;" />
      <p style="color:#6366F1;font-size:11px;margin:8px 0 0;">{app_url}</p>
    </div>

    <p style="color:#64748B;font-size:13px;margin-top:20px;">
      {T['wel_contact']}
    </p>
    <p style="margin-top:16px;color:#1E293B;">
      {T['regards']}<br><strong>{T['team'].format(name=agency_name)}</strong>
    </p>
  </div>
  <div style="text-align:center;padding:16px;color:#94A3B8;font-size:11px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
    {T['wel_footer'].format(name=agency_name)} | <a href="{app_url}" style="color:#6366F1;">{app_url}</a>
  </div>
</div></body></html>'''

    return await send_email(recipient, subject, html, agency_id=agency_id)


def generate_contract_signed_email(client_name: str, vehicle_name: str, contract_number: str, reservation: dict, agency_name: str = "LogiRent", lang: str = 'fr') -> str:
    T = tr(lang)
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
    <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">{T['ct_header']}</p>
  </div>
  <div style="background-color:#FFFFFF;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align:center;padding:16px;background-color:#10B98115;border-radius:8px;margin-bottom:20px;">
      <h2 style="color:#10B981;margin:0;font-size:20px;">{T['ct_title']}</h2>
    </div>
    <p>{T['hello']} <strong>{client_name}</strong>,</p>
    <p>{T['ct_text'].format(n=contract_number, v=vehicle_name)}</p>
    <p>{T['ct_pdf_text']}</p>
    <div style="background-color:#F8FAFC;padding:16px;border-radius:8px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">{T['veh_label']}:</td><td style="padding:6px 0;font-weight:bold;">{vehicle_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">{T['from_label']}:</td><td style="padding:6px 0;font-weight:bold;">{start_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">{T['to_label']}:</td><td style="padding:6px 0;font-weight:bold;">{end_date}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">{T['amount_label']}:</td><td style="padding:6px 0;font-weight:bold;">CHF {reservation.get("total_price", 0):.2f}</td></tr>
      </table>
    </div>
    <div style="text-align:center;padding:12px;background-color:#EEF2FF;border-radius:8px;margin:16px 0;">
      <p style="margin:0;color:#4338CA;font-size:13px;">{T['ct_pdf_badge']}</p>
    </div>
    <p style="color:#64748B;font-size:13px;">{T['contact'].format(email=SENDER_EMAIL)}</p>
    <p style="margin-top:24px;">{T['regards']}<br><strong>{T['team'].format(name=agency_name)}</strong></p>
  </div>
  <div style="text-align:center;padding:16px;color:#64748B;font-size:11px;">{T['footer'].format(name=agency_name)}</div>
</div></body></html>'''
