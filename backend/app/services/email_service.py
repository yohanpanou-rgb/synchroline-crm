"""Reusable outgoing-email helper.

Any feature that needs to email a file to a customer or staff member should
call `send_email_with_attachment` here instead of writing new SMTP code.
"""

import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings


def send_email_with_attachment(
    to: str,
    subject: str,
    body: str,
    attachment_bytes: bytes,
    attachment_filename: str,
    content_type: str = "application/pdf",
) -> None:
    settings = get_settings()

    message = MIMEMultipart()
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain", "utf-8"))

    maintype, _, subtype = content_type.partition("/")
    attachment = MIMEApplication(attachment_bytes, _subtype=subtype or "octet-stream")
    attachment.add_header("Content-Disposition", "attachment", filename=attachment_filename)
    message.attach(attachment)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, [to], message.as_string())
