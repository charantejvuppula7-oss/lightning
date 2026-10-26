"""
Durable email delivery with short leases for concurrent workers.

This module implements the transactional Outbox Pattern for email notifications:
- Messages are saved directly to the database alongside business logic.
- Upon database transaction commit, workers asynchronously claim and process jobs.
- Exponential backoff with distributed lease expiration guarantees at-least-once delivery.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from django.db import transaction
from django.db import close_old_connections
from django.db.models import F, Q
from django.utils import timezone

from apps.notifications.models import EmailOutbox
from services.email import EmailService


logger = logging.getLogger(__name__)
# Dedicated bounded background thread pool for immediate outbound delivery attempts
mail_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix='pms-email')


def enqueue_emails(messages):
    """
    Persist email records in the database outbox and schedule background delivery.

    Ensures transactional safety: if the outer database transaction rolls back,
    no emails are dispatched. If the transaction commits, delivery tasks are submitted
    to the `mail_pool` thread executor.

    Args:
        messages (list of tuple[str, dict]): A list of (email_kind, payload_dict) tuples
            where kind is one of `EmailOutbox.ACCOUNT_CREATED`, `EmailOutbox.TASK_ASSIGNED`, etc.

    Returns:
        None
    """
    jobs = EmailOutbox.objects.bulk_create(
        [EmailOutbox(kind=kind, payload=payload) for kind, payload in messages], batch_size=200)
    if jobs:
        def dispatch():
            for job in jobs:
                mail_pool.submit(deliver_in_background, job.pk)
        transaction.on_commit(dispatch, robust=True)


def deliver_in_background(job_id):
    close_old_connections()
    try:
        return deliver_email(job_id)
    finally:
        close_old_connections()


def deliver_email(job_id):
    """
    Safely claim and execute delivery for an outbox email job.

    Delivery Process:
    1. Lease Acquisition: Optimistically locks the job by setting `leased_until` to now + 2 minutes
       and incrementing `attempts`. If another worker has leased it, exits cleanly.
    2. Dispatch: Delegates to `EmailService` corresponding to `job.kind`.
    3. Success: Clears lease and sets `sent_at` timestamp.
    4. Failure: Calculates exponential backoff (up to 1 hour max), clears lease, and records `last_error`.

    Args:
        job_id (int): Primary key of the `EmailOutbox` record to deliver.

    Returns:
        bool: True if the email was successfully sent; False if skipped or failed.
    """
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
        elif job.kind == EmailOutbox.CHAT_MENTION:
            sent, error = EmailService.send_chat_mention_email(**job.payload)
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
    """
    Batch-process pending or stalled outbox messages.

    Invoked periodically by cron jobs or the `deliver_email_outbox` management command
    to retry failed jobs whose `next_attempt_at` has matured or clean up expired leases.

    Args:
        limit (int, optional): Maximum number of jobs to fetch in this execution run. Defaults to 25.

    Returns:
        int: Number of emails successfully delivered in this sweep.
    """
    now = timezone.now()
    job_ids = list(EmailOutbox.objects.filter(
        sent_at__isnull=True, next_attempt_at__lte=now,
    ).filter(Q(leased_until__isnull=True) | Q(leased_until__lte=now))
                   .order_by('created_at').values_list('pk', flat=True)[:limit])
    return sum(deliver_email(job_id) for job_id in job_ids)

