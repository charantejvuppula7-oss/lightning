"""
Email Notification Service
~~~~~~~~~~~~~~~~~~~~~~~~~~

Dispatches formatted transactional emails via the Microsoft Graph API
(POST /users/{sender}/sendMail) using OAuth2 client credentials flow.

Credentials are read from Django settings (MICROSOFT_GRAPH_EMAIL dict),
which in turn reads from environment variables -- no secrets in source code.

Account creation and task assignment notification helpers.
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal Graph API client (private -- not imported elsewhere)
# ---------------------------------------------------------------------------

class _GraphMailClient:
    """
    Thin, stateless wrapper around the Microsoft Graph sendMail endpoint.

    Usage:
        client = _GraphMailClient()
        ok, err = client.send(to_email, subject, html_body)
    """

    _TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    _SEND_URL  = "https://graph.microsoft.com/v1.0/users/{sender}/sendMail"

    def __init__(self):
        cfg = getattr(settings, "MICROSOFT_GRAPH_EMAIL", {})
        self._tenant_id     = cfg.get("TENANT_ID", "")
        self._client_id     = cfg.get("CLIENT_ID", "")
        self._client_secret = cfg.get("CLIENT_SECRET", "")
        self._sender_upn    = cfg.get("SENDER_UPN", "")

    def _get_access_token(self) -> str:
        """Acquire a short-lived OAuth2 access token via client credentials."""
        url = self._TOKEN_URL.format(tenant_id=self._tenant_id)
        resp = requests.post(
            url,
            data={
                "grant_type":    "client_credentials",
                "client_id":     self._client_id,
                "client_secret": self._client_secret,
                "scope":         "https://graph.microsoft.com/.default",
            },
            timeout=15,
        )
        if resp.status_code != 200:
            error_desc = resp.json().get("error_description", resp.text)
            raise RuntimeError(
                f"Graph token request failed [{resp.status_code}]: {error_desc}"
            )
        return resp.json()["access_token"]

    def send(self, to_email: str, subject: str, html_body: str) -> tuple:
        """
        Send an HTML email via Graph API.

        Returns:
            (True,  "Email sent successfully")  on HTTP 202
            (False, "<error message>")          on any failure
        """
        if not all((self._tenant_id, self._client_id, self._client_secret, self._sender_upn)):
            logger.warning('Microsoft Graph email is not configured')
            return False, 'Email provider is not configured.'
        try:
            token = self._get_access_token()
        except RuntimeError as exc:
            logger.error("Graph API token error: %s", exc)
            return False, str(exc)

        url = self._SEND_URL.format(sender=self._sender_upn)
        payload = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML",
                    "content": html_body,
                },
                "toRecipients": [
                    {"emailAddress": {"address": to_email}}
                ],
            },
            "saveToSentItems": True,
        }

        try:
            resp = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                },
                json=payload,
                timeout=30,
            )
        except requests.RequestException as exc:
            logger.error("Graph API network error sending to %s: %s", to_email, exc)
            return False, f"Network error: {exc}"

        if resp.status_code == 202:
            logger.info("Graph API: email sent successfully to %s", to_email)
            return True, "Email sent successfully"

        # Parse error details for a useful log message
        try:
            err = resp.json().get("error", {})
            detail = f"[{err.get('code', '?')}] {err.get('message', resp.text)}"
        except Exception:
            detail = resp.text

        logger.error(
            "Graph API: sendMail failed for %s -- HTTP %s -- %s",
            to_email, resp.status_code, detail,
        )
        return False, f"HTTP {resp.status_code}: {detail}"


# ---------------------------------------------------------------------------
# Public service -- called by user_service.py (signature unchanged)
# ---------------------------------------------------------------------------

class EmailService:
    """Service for composing and sending transactional emails via Microsoft Graph API."""

    @staticmethod
    def send_password_reset_otp(to_email, otp_code):
        return _GraphMailClient().send(
            to_email, 'Password reset verification code',
            f'<p>Your password reset code is <strong>{otp_code}</strong>.</p>'
            '<p>It expires in 10 minutes. If you did not request it, ignore this email.</p>',
        )

    @staticmethod
    def send_account_created_email(
        to_email,
        user_display_name,
        username,
        reset_password_url,
        creator_name=None,
    ):
        """
        Send a welcome email with the username and password reset page.

        Args:
            to_email:           Recipient email address.
            user_display_name:  User's full name.
            username:           Account username.
            reset_password_url: Direct URL to the reset/change password page.
            creator_name:       Name of the Admin or PM who created the user.

        Returns:
            (True,  "Email sent successfully")  on success
            (False, "<error>")                  on failure
        """
        creator_str = f" by <strong>{creator_name}</strong>" if creator_name else ""
        subject = "Welcome to Tachyon - Your Account Has Been Created"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   Helvetica, Arial, sans-serif;
      background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;
    }}
    .container {{
      max-width: 540px; margin: 0 auto; background: #ffffff;
      border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }}
    .header {{
      background: #1e293b; padding: 28px 24px;
      text-align: center; color: #ffffff;
    }}
    .header h1 {{
      margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;
    }}
    .header p {{
      margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;
    }}
    .content {{ padding: 32px 28px; line-height: 1.6; }}
    .creds-card {{
      margin: 22px 0; background: #f8fafc; border-radius: 10px;
      padding: 18px 20px; border: 1px solid #e2e8f0;
    }}
    .btn-container {{
      text-align: center; margin: 28px 0 20px 0;
    }}
    .btn {{
      display: inline-block; background-color: #2563eb; color: #ffffff !important;
      text-decoration: none; padding: 12px 28px; border-radius: 8px;
      font-weight: 600; font-size: 14px; letter-spacing: 0.2px;
    }}
    .notice {{
      font-size: 12.5px; color: #64748b; margin-top: 20px;
      padding: 12px; background: #f1f5f9; border-radius: 6px;
    }}
    .footer {{
      background: #f8fafc; padding: 16px 24px; font-size: 12px;
      color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Tachyon</h1>
      <p>PROJECT LIGHTNING PLATFORM</p>
    </div>
    <div class="content">
      <p>Hello <strong>{user_display_name or username}</strong>,</p>
      <p>
        Your user account has been successfully created{creator_str}. Your username is below:
      </p>
      <div class="creds-card">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; width: 120px; font-weight: 600; color: #64748b; font-size: 13.5px;">Username:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace; font-size: 14px;">{username}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b; font-size: 13.5px;">Email:</td>
            <td style="padding: 6px 0; color: #0f172a; font-size: 13.5px;">{to_email}</td>
          </tr>
        </table>
      </div>
      <p style="margin-top: 20px; font-size: 13.5px;">
        Set your password before beginning work on the platform:
      </p>
      <div class="btn-container">
        <a href="{reset_password_url}" class="btn" target="_blank">Reset Your Password</a>
      </div>
      <div class="notice">
        <strong>Direct Link:</strong> If the button above does not work, visit: <br/>
        <a href="{reset_password_url}" style="color: #2563eb; word-break: break-all;">{reset_password_url}</a>
      </div>
    </div>
    <div class="footer">
      &copy; Tachyon Systems. All rights reserved.
    </div>
  </div>
</body>
</html>"""

        client = _GraphMailClient()
        return client.send(to_email, subject, html_body)

    @staticmethod
    def send_task_assigned_email(
        to_email,
        user_display_name,
        task_name,
        project_name,
        due_date=None,
        assigned_by_name=None,
    ):
        """
        Notify a user that a task has been assigned to them.

        Args:
            to_email:          Recipient email address.
            user_display_name: Assignee's full name.
            task_name:         Name/title of the assigned task.
            project_name:      Name of the parent project.
            due_date:          Optional due date (date or str).
            assigned_by_name:  Name of the person who assigned the task.

        Called by the outbox worker after the database transaction commits.
        """
        due_str = f"<strong>{due_date}</strong>" if due_date else "<em>No due date set</em>"
        assigner_str = (
            f"<p>Assigned by: <strong>{assigned_by_name}</strong></p>"
            if assigned_by_name else ""
        )
        subject = f"New Task Assigned: {task_name}"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   Helvetica, Arial, sans-serif;
      background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;
    }}
    .container {{
      max-width: 520px; margin: 0 auto; background: #ffffff;
      border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }}
    .header {{
      background: #0f172a; padding: 28px 24px;
      text-align: center; color: #ffffff;
    }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
    .header p  {{ margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; }}
    .content   {{ padding: 32px 28px; line-height: 1.6; }}
    .task-card {{
      margin: 22px 0; background: #f8fafc; border-radius: 10px;
      padding: 18px 20px; border: 1px solid #e2e8f0;
    }}
    .label {{ font-weight: 600; color: #64748b; font-size: 13px; }}
    .value {{ font-weight: 700; color: #0f172a; font-size: 14px; }}
    .footer {{
      background: #f8fafc; padding: 16px 24px; font-size: 12px;
      color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Task Assigned</h1>
      <p>You have a new task waiting for you</p>
    </div>
    <div class="content">
      <p>Hello <strong>{user_display_name}</strong>,</p>
      <p>A new task has been assigned to you. Here are the details:</p>
      <div class="task-card">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 7px 0; width: 110px;" class="label">Task:</td>
            <td style="padding: 7px 0;" class="value">{task_name}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0;" class="label">Project:</td>
            <td style="padding: 7px 0;" class="value">{project_name}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0;" class="label">Due Date:</td>
            <td style="padding: 7px 0; color: #0f172a; font-size: 13.5px;">{due_str}</td>
          </tr>
        </table>
      </div>
      {assigner_str}
      <p style="font-size: 13px; color: #64748b;">
        Log in to the platform to view and start working on this task.
      </p>
    </div>
    <div class="footer">&copy; Tachyon Systems. All rights reserved.</div>
  </div>
</body>
</html>"""

        return _GraphMailClient().send(to_email, subject, html_body)
