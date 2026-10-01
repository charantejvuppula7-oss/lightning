"""Durable email delivery with short leases for concurrent workers."""

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.notifications.models import EmailOutbox
from services.email import EmailService


logger = logging.getLogger(__name__)
mail_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix='pms-email')


def enqueue_emails(messages):
    """Insert jobs with the business change, then try immediate delivery."""
    jobs = EmailOutbox.objects.bulk_create(
        [EmailOutbox(kind=kind, payload=payload) for kind, payload in messages], batch_size=200)
    if jobs:
        def dispatch():
            for job in jobs:
                mail_pool.submit(deliver_email, job.pk)
        transaction.on_commit(dispatch, robust=True)


def deliver_email(job_id):
    now = timezone.now()
    lease_end = now + timedelta(minutes=2)
    claimed = EmailOutbox.objects.filter(
        pk=job_id, sent_at__isnull=True, next_attempt_at__lte=now,
    ).filter(Q(leased_until__isnull=True) | Q(leased_until__lte=now)).update(
        leased_until=lease_end, attempts=F('attempts') + 1,
    )
    if not claimed:
        return False

    job = EmailOutbox.objects.get(pk=job_id)
    try:
        if job.kind == EmailOutbox.ACCOUNT_CREATED:
            sent, error = EmailService.send_account_created_email(**job.payload)
        elif job.kind == EmailOutbox.TASK_ASSIGNED:
            sent, error = EmailService.send_task_assigned_email(**job.payload)
        else:
            raise ValueError('Unknown email kind.')
        if not sent:
            raise RuntimeError(error)
    except Exception as exc:
        retry_seconds = min(60 * 2 ** min(job.attempts, 6), 3600)
        EmailOutbox.objects.filter(pk=job_id, leased_until=lease_end).update(
            leased_until=None, next_attempt_at=timezone.now() + timedelta(seconds=retry_seconds),
            last_error=f'{type(exc).__name__}: {exc}'[:300],
        )
        logger.warning('email_delivery_failed job_id=%s error_type=%s', job_id, type(exc).__name__)
        return False

    EmailOutbox.objects.filter(pk=job_id, leased_until=lease_end).update(
        sent_at=timezone.now(), leased_until=None, last_error='',
    )
    return True


def deliver_pending_emails(limit=25):
    now = timezone.now()
    job_ids = list(EmailOutbox.objects.filter(
        sent_at__isnull=True, next_attempt_at__lte=now,
    ).filter(Q(leased_until__isnull=True) | Q(leased_until__lte=now))
                   .order_by('created_at').values_list('pk', flat=True)[:limit])
    return sum(deliver_email(job_id) for job_id in job_ids)
