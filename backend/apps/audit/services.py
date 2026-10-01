import logging

from django.utils.crypto import salted_hmac

from api.models import AuditLog


logger = logging.getLogger('api')


class LogService:
    @staticmethod
    def log_warning(event, **details):
        logger.warning('%s %s', event, details, extra={'event_name': event, 'event_details': details})

    @staticmethod
    def log_error(event, **details):
        logger.error('%s %s', event, details, extra={'event_name': event, 'event_details': details})

    @classmethod
    def log_security_event(cls, event, **details):
        cls.log_warning(event, **details)

    @staticmethod
    def log_audit_event(*, actor, action, entity_type, entity=None, request=None,
                        old_values=None, new_values=None):
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
