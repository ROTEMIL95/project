from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import settings
import logging

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, html_content: str, from_email: str = None) -> bool:
    """
    Send email using SendGrid

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
        from_email: Sender email address (optional)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if not settings.SENDGRID_API_KEY:
        logger.warning("SendGrid API key not configured. Email not sent.")
        return False

    try:
        message = Mail(
            from_email=from_email or settings.FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )

        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)

        if response.status_code >= 200 and response.status_code < 300:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"Failed to send email. Status code: {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"Error sending email: {e}", exc_info=True)
        return False


async def send_quote_email(to_email: str, client_name: str, quote_number: str, quote_url: str) -> bool:
    """
    Send quote notification email to client

    Args:
        to_email: Client email address
        client_name: Client name
        quote_number: Quote number
        quote_url: URL to view the quote

    Returns:
        bool: True if email sent successfully
    """
    subject = f"Your Quote {quote_number} is Ready"

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">New Quote Available</h2>
                <p>Dear {client_name},</p>
                <p>Your quote <strong>{quote_number}</strong> is now ready for review.</p>
                <p style="margin: 30px 0;">
                    <a href="{quote_url}"
                       style="background-color: #2563eb; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        View Quote
                    </a>
                </p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Best regards,<br>Your Contractor Team</p>
            </div>
        </body>
    </html>
    """

    return await send_email(to_email, subject, html_content)


async def send_welcome_email(to_email: str, full_name: str) -> bool:
    """
    Send welcome email to new user

    Args:
        to_email: User email address
        full_name: User full name

    Returns:
        bool: True if email sent successfully
    """
    subject = "Welcome to Contractor Management System"

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Welcome to Contractor Management System!</h2>
                <p>Hello {full_name},</p>
                <p>Thank you for registering with us. We're excited to have you on board!</p>
                <p>With our system, you can:</p>
                <ul>
                    <li>Create and manage quotes</li>
                    <li>Track projects</li>
                    <li>Manage clients</li>
                    <li>Monitor financial transactions</li>
                </ul>
                <p>If you need any help getting started, please contact our support team.</p>
                <p>Best regards,<br>The Contractor Management Team</p>
            </div>
        </body>
    </html>
    """

    return await send_email(to_email, subject, html_content)
