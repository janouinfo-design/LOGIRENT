"""
Swiss QR-Bill Invoice PDF generator for LogiRent.
Generates professional A4 invoices with integrated Swiss QR-bill payment slip.
"""
import io
import os
import tempfile
import logging
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfgen import canvas
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF

logger = logging.getLogger(__name__)

# LogiRent company info
COMPANY = {
    "name": "LogiRent SA",
    "street": "Rue du Mont-Blanc",
    "house_number": "12",
    "pcode": "1201",
    "city": "Geneve",
    "country": "CH",
    "phone": "+41 22 123 45 67",
    "email": "contact@logirent.ch",
    "website": "www.logirent.ch",
    "iban": "CH93 0076 2011 6238 5295 7",
    "vat_number": "CHE-123.456.789 TVA",
}

TAX_RATE = 7.7


def generate_qr_reference(invoice_number: str) -> str:
    """Generate a QR reference number from invoice number."""
    digits = ''.join(c for c in invoice_number if c.isdigit())
    padded = digits.ljust(26, '0')[:26]
    total = 0
    carry = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]
    for ch in padded:
        total = carry[(total + int(ch)) % 10]
    check = (10 - total) % 10
    return padded + str(check)


def generate_invoice_pdf(invoice: dict, customer: dict, vehicle: dict = None, company: dict = None) -> bytes:
    """Generate a complete invoice PDF with Swiss QR-bill."""
    co = company or COMPANY
    buffer = io.BytesIO()

    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    _draw_header(c, w, h, co)
    _draw_customer_info(c, w, h, customer, invoice)
    _draw_invoice_meta(c, w, h, invoice, vehicle)
    y_pos = _draw_items_table(c, w, h, invoice)
    _draw_totals(c, w, h, invoice, y_pos)
    _draw_conditions(c, w, h, invoice, y_pos - 80 * mm)

    # QR-bill payment slip at the bottom (detachable part)
    try:
        _draw_qr_bill(c, w, h, co, customer, invoice)
    except Exception as e:
        logger.error(f"QR-bill generation failed: {e}")
        c.setFont("Helvetica", 9)
        c.drawString(20 * mm, 40 * mm, f"QR-Bill: erreur de generation ({e})")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()


def _draw_header(c, w, h, co):
    """Draw the company header / logo area."""
    # Purple accent bar
    c.setFillColor(colors.HexColor('#7C3AED'))
    c.rect(0, h - 8 * mm, w, 8 * mm, fill=True, stroke=False)

    # Company name
    c.setFillColor(colors.HexColor('#111827'))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(20 * mm, h - 22 * mm, "LogiRent")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor('#6B7280'))
    c.drawString(20 * mm, h - 27 * mm, "Location de vehicules premium")

    # Company details on the right
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor('#374151'))
    rx = w - 20 * mm
    y = h - 18 * mm
    for line in [co['name'], f"{co['street']} {co['house_number']}", f"{co['pcode']} {co['city']}", co['phone'], co['email']]:
        c.drawRightString(rx, y, line)
        y -= 3.5 * mm


def _draw_customer_info(c, w, h, customer, invoice):
    """Draw the customer address block."""
    y = h - 48 * mm
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor('#6B7280'))
    c.drawString(20 * mm, y, "Facture a:")
    y -= 5 * mm
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor('#111827'))
    c.drawString(20 * mm, y, customer.get('name', ''))
    y -= 4.5 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor('#374151'))
    if customer.get('address'):
        c.drawString(20 * mm, y, customer['address'])
        y -= 4 * mm
    c.drawString(20 * mm, y, customer.get('email', ''))
    y -= 4 * mm
    if customer.get('phone'):
        c.drawString(20 * mm, y, customer['phone'])


def _draw_invoice_meta(c, w, h, invoice, vehicle):
    """Draw invoice number, date, vehicle info on the right side."""
    rx = w - 20 * mm
    y = h - 48 * mm

    # Invoice type label
    type_labels = {
        'deposit': 'FACTURE D\'ACOMPTE',
        'reservation': 'FACTURE',
        'final': 'FACTURE FINALE',
        'penalty': 'FACTURE PENALITE',
        'credit_note': 'AVOIR',
    }
    label = type_labels.get(invoice.get('invoice_type', ''), 'FACTURE')

    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.HexColor('#7C3AED'))
    c.drawRightString(rx, y, label)
    y -= 7 * mm

    meta = [
        ("N° facture:", invoice.get('invoice_number', '')),
        ("Date:", invoice.get('issue_date', '')),
        ("Echeance:", invoice.get('due_date', '')),
        ("Devise:", invoice.get('currency', 'CHF')),
    ]
    if vehicle:
        meta.append(("Vehicule:", f"{vehicle.get('brand', '')} {vehicle.get('model', '')}"))
    if invoice.get('start_date'):
        meta.append(("Periode:", f"{invoice['start_date']} - {invoice.get('end_date', '')}"))

    for label_text, value in meta:
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor('#6B7280'))
        c.drawRightString(rx - 40 * mm, y, label_text)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawRightString(rx, y, value)
        y -= 4.5 * mm


def _draw_items_table(c, w, h, invoice):
    """Draw the items table."""
    items = invoice.get('items', [])
    y = h - 100 * mm

    # Table header
    c.setFillColor(colors.HexColor('#F3F4F6'))
    c.rect(20 * mm, y - 1 * mm, w - 40 * mm, 8 * mm, fill=True, stroke=False)

    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor('#374151'))
    headers = [("Description", 20), ("Qte", 105), ("Prix unit.", 125), ("TVA", 150), ("Total HT", 165)]
    for text, x_offset in headers:
        c.drawString(x_offset * mm, y + 1.5 * mm, text)

    y -= 6 * mm

    # Items
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor('#111827'))
    for item in items:
        y -= 6 * mm
        c.drawString(20 * mm, y, str(item.get('label', '')))
        c.drawString(105 * mm, y, str(item.get('quantity', 1)))
        c.drawRightString(145 * mm, y, f"{item.get('unit_price', 0):.2f}")
        c.drawRightString(162 * mm, y, f"{item.get('tax_rate', 7.7):.1f}%")
        c.drawRightString(w - 20 * mm, y, f"{item.get('total_excl_tax', 0):.2f}")

        # Separator line
        c.setStrokeColor(colors.HexColor('#E5E7EB'))
        c.setLineWidth(0.3)
        c.line(20 * mm, y - 2 * mm, w - 20 * mm, y - 2 * mm)

    return y


def _draw_totals(c, w, h, invoice, y_pos):
    """Draw subtotal, TVA, total section."""
    y = y_pos - 15 * mm
    rx = w - 20 * mm

    rows = [
        ("Sous-total HT:", f"CHF {invoice.get('subtotal_excl_tax', 0):.2f}"),
        (f"TVA ({TAX_RATE}%):", f"CHF {invoice.get('tax_total', 0):.2f}"),
    ]

    for label, value in rows:
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor('#6B7280'))
        c.drawRightString(rx - 35 * mm, y, label)
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawRightString(rx, y, value)
        y -= 5.5 * mm

    # Total box
    c.setFillColor(colors.HexColor('#7C3AED'))
    c.rect(rx - 70 * mm, y - 2 * mm, 70 * mm, 9 * mm, fill=True, stroke=False)
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.white)
    c.drawRightString(rx - 35 * mm, y + 1 * mm, "TOTAL TTC:")
    c.drawRightString(rx - 2 * mm, y + 1 * mm, f"CHF {invoice.get('total_incl_tax', 0):.2f}")

    # Amount paid / balance
    y -= 14 * mm
    if invoice.get('amount_paid', 0) > 0:
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor('#059669'))
        c.drawRightString(rx - 35 * mm, y, "Deja paye:")
        c.drawRightString(rx, y, f"CHF {invoice['amount_paid']:.2f}")
        y -= 5 * mm

    balance = invoice.get('balance_due', invoice.get('total_incl_tax', 0))
    if balance > 0:
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor('#DC2626'))
        c.drawRightString(rx - 35 * mm, y, "Solde du:")
        c.drawRightString(rx, y, f"CHF {balance:.2f}")


def _draw_conditions(c, w, h, invoice, y_pos):
    """Draw payment conditions."""
    y = min(y_pos, h - 210 * mm)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor('#374151'))
    c.drawString(20 * mm, y, "Conditions de paiement")
    y -= 5 * mm
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor('#6B7280'))
    conditions = [
        f"Paiement a 30 jours. Echeance: {invoice.get('due_date', '')}",
        "Paiement par virement, carte bancaire, TWINT ou QR-facture.",
        "En cas de retard, des interets de 5% par an seront appliques.",
    ]
    for line in conditions:
        c.drawString(20 * mm, y, line)
        y -= 4 * mm

    if invoice.get('notes'):
        y -= 3 * mm
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(20 * mm, y, f"Remarques: {invoice['notes']}")


def _draw_qr_bill(c, w, h, co, customer, invoice):
    """Draw the Swiss QR-bill payment slip at the bottom of the page."""
    from qrbill.bill import QRBill

    balance = invoice.get('balance_due', invoice.get('total_incl_tax', 0))
    if balance <= 0:
        return

    iban_clean = co['iban'].replace(' ', '')
    qr_ref = generate_qr_reference(invoice.get('invoice_number', ''))

    debtor = None
    if customer.get('name'):
        debtor = {
            'name': customer['name'][:70],
            'pcode': '1200',
            'city': customer.get('city', 'Geneve'),
            'street': customer.get('street', ''),
            'house_num': customer.get('house_number', ''),
            'country': 'CH',
        }

    creditor = {
        'name': co['name'],
        'street': co['street'],
        'house_num': co['house_number'],
        'pcode': co['pcode'],
        'city': co['city'],
        'country': co['country'],
    }

    try:
        bill_kwargs = {
            'account': iban_clean,
            'creditor': creditor,
            'amount': f"{balance:.2f}",
            'additional_information': f"Facture {invoice.get('invoice_number', '')}",
        }
        if debtor:
            bill_kwargs['debtor'] = debtor

        # QR-IBAN (institution 30000-31999) → use QRR reference
        # Standard IBAN → no structured reference, use additional_information only
        iban_inst = iban_clean[4:9] if len(iban_clean) >= 9 else '00000'
        if 30000 <= int(iban_inst) <= 31999:
            bill_kwargs['reference_number'] = qr_ref

        bill = QRBill(**bill_kwargs)

        with tempfile.NamedTemporaryFile(suffix='.svg', delete=False, mode='w') as tmp:
            bill.as_svg(tmp.name)
            tmp_path = tmp.name

        drawing = svg2rlg(tmp_path)
        if drawing:
            # Scale to fit the bottom of the page
            scale_x = w / drawing.width
            scale_y = (105 * mm) / drawing.height
            scale = min(scale_x, scale_y)
            drawing.width = drawing.width * scale
            drawing.height = drawing.height * scale
            drawing.scale(scale, scale)

            # Dashed separation line
            c.setStrokeColor(colors.HexColor('#9CA3AF'))
            c.setLineWidth(0.5)
            c.setDash(3, 3)
            c.line(0, 105 * mm + 2 * mm, w, 105 * mm + 2 * mm)
            c.setDash()

            # Scissor icon
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor('#9CA3AF'))
            c.drawString(5 * mm, 105 * mm + 4 * mm, "Detacher ici")

            renderPDF.draw(drawing, c, 0, 0)

        os.unlink(tmp_path)
    except Exception as e:
        logger.error(f"QR-bill SVG generation failed: {e}")
        # Fallback: draw a simple payment info block
        c.setStrokeColor(colors.HexColor('#9CA3AF'))
        c.setLineWidth(0.5)
        c.setDash(3, 3)
        c.line(0, 105 * mm, w, 105 * mm)
        c.setDash()

        y = 95 * mm
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor('#111827'))
        c.drawString(20 * mm, y, "Informations de paiement")
        y -= 6 * mm
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor('#374151'))
        for line in [
            f"Beneficiaire: {co['name']}",
            f"IBAN: {co['iban']}",
            f"Montant: CHF {balance:.2f}",
            f"Reference: {invoice.get('invoice_number', '')}",
        ]:
            c.drawString(20 * mm, y, line)
            y -= 4.5 * mm
