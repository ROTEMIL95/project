from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
from reportlab.lib.units import inch
from reportlab.lib import colors
from io import BytesIO
import logging

logger = logging.getLogger(__name__)


async def generate_quote_pdf(quote_data: dict) -> BytesIO:
    """
    Generate PDF for quote

    Args:
        quote_data: Quote data dictionary containing all quote information

    Returns:
        BytesIO: PDF file as bytes
    """
    try:
        # Create PDF buffer
        buffer = BytesIO()

        # Create PDF document
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title = Paragraph(f"<b>Quote #{quote_data.get('quote_number', 'N/A')}</b>", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 0.3*inch))

        # Client information
        client_info = f"""
        <b>Client:</b> {quote_data.get('client_name', 'N/A')}<br/>
        <b>Date:</b> {quote_data.get('created_at', 'N/A')}<br/>
        <b>Valid Until:</b> {quote_data.get('valid_until', 'N/A')}<br/>
        """
        elements.append(Paragraph(client_info, styles['Normal']))
        elements.append(Spacer(1, 0.3*inch))

        # Items table
        items = quote_data.get('items', [])
        if items:
            table_data = [['Item', 'Quantity', 'Unit', 'Unit Price', 'Total']]

            for item in items:
                table_data.append([
                    item.get('name', ''),
                    str(item.get('quantity', 0)),
                    item.get('unit', ''),
                    f"₪{item.get('unit_price', 0):.2f}",
                    f"₪{item.get('total_price', 0):.2f}"
                ])

            # Create table
            table = Table(table_data, colWidths=[3*inch, 0.8*inch, 0.8*inch, 1*inch, 1*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))

            elements.append(table)
            elements.append(Spacer(1, 0.3*inch))

        # Totals
        totals_text = f"""
        <b>Subtotal:</b> ₪{quote_data.get('total_cost', 0):.2f}<br/>
        <b>Tax ({quote_data.get('tax_percentage', 17)}%):</b> ₪{quote_data.get('tax_amount', 0):.2f}<br/>
        <b>Discount:</b> ₪{quote_data.get('discount_amount', 0):.2f}<br/>
        <b>Total:</b> ₪{quote_data.get('total_price', 0):.2f}<br/>
        """
        elements.append(Paragraph(totals_text, styles['Normal']))

        # Notes
        if quote_data.get('notes'):
            elements.append(Spacer(1, 0.3*inch))
            elements.append(Paragraph(f"<b>Notes:</b><br/>{quote_data.get('notes')}", styles['Normal']))

        # Terms and conditions
        if quote_data.get('terms_and_conditions'):
            elements.append(Spacer(1, 0.3*inch))
            elements.append(Paragraph(f"<b>Terms and Conditions:</b><br/>{quote_data.get('terms_and_conditions')}", styles['Normal']))

        # Build PDF
        doc.build(elements)

        # Reset buffer position
        buffer.seek(0)

        logger.info(f"PDF generated successfully for quote {quote_data.get('quote_number')}")
        return buffer

    except Exception as e:
        logger.error(f"Error generating PDF: {e}", exc_info=True)
        raise Exception(f"Failed to generate PDF: {str(e)}")
