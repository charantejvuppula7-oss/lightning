import logging

from django.utils.crypto import salted_hmac

from api.models import AuditLog


logger = logging.getLogger('api')


class LogService:
    """
    Centralized logging and audit service for application warnings, security events, and database audit logs.
    """
    @staticmethod
    def log_warning(event, **details):
        """
        Log an application-level warning with structured contextual metadata.

        Args:
            event (str): Event name or category.
            **details: Arbitrary key-value pairs providing event context.
        """
        logger.warning('%s %s', event, details, extra={'event_name': event, 'event_details': details})

    @staticmethod
    def log_error(event, **details):
        """
        Log an application error with structured contextual metadata.

        Args:
            event (str): Error name or category.
            **details: Arbitrary key-value pairs providing error context.
        """
        logger.error('%s %s', event, details, extra={'event_name': event, 'event_details': details})

    @classmethod
    def log_security_event(cls, event, **details):
        """
        Log a security-sensitive event (such as access denied or authentication failure).

        Args:
            event (str): Security event name.
            **details: Arbitrary key-value pairs providing security context.
        """
        cls.log_warning(event, **details)

    @staticmethod
    def log_audit_event(*, actor, action, entity_type, entity=None, request=None,
                        old_values=None, new_values=None):
        """
        Record a permanent audit trail entry in the database.

        Executed within the surrounding database transaction so that audit failures
        safely trigger a rollback of the accompanying state change.

        Args:
            actor (UserData): The user initiating the action.
            action (str): The action verb ('created', 'updated', 'deleted').
            entity_type (str): Domain resource type (e.g. 'project', 'task', 'role').
            entity (Model|None): The model instance affected.
            request (Request|None): The active HTTP request object for correlation.
            old_values (dict|None): Field states prior to the mutation.
            new_values (dict|None): Field states after the mutation.
        """
        # Resource views call this within their transaction so an audit failure
        # rolls back the corresponding business change.
        entity_id = entity.pk if entity is not None else None
        entity_name = str(entity)[:300] if entity is not None else ''
        session_key = request.session.session_key if request is not None else None
        correlation = salted_hmac('api.audit', session_key).hexdigest() if session_key else None
        request_path = request.path if request is not None else ''
        request_id = getattr(request, 'request_id', None)

        AuditLog.objects.create(
            user=actor,
            session_key=correlation,
            request_path=request_path,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            description=f'{entity_type} {action}',
            context={'request_id': request_id, 'result': 'success'},
            old_values=old_values,
            new_values=new_values,
        )

