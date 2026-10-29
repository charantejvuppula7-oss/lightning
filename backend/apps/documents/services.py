"""Document persistence shared by project files, uploads and review attachments."""
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from api.models import ResourceFile
from apps.audit.services import LogService


def store_document(request, project, upload, *, is_pdr=False, pdr_version='', pdr_changelog=''):
    if upload.size > 100 * 1024 * 1024:
        raise ValidationError({'file': 'Each file must be 100 MB or smaller.'})
    version = serializers.CharField(max_length=50, allow_blank=True).run_validation(pdr_version) if is_pdr else ''
    changelog = serializers.CharField(max_length=255, allow_blank=True).run_validation(pdr_changelog) if is_pdr else ''
    document = ResourceFile.objects.create(project=project, file=upload, file_name=upload.name,
        file_type=ResourceFile.get_file_category(upload.name), file_size=upload.size, uploaded_by=request.user,
        is_pdr=is_pdr, pdr_version=version, pdr_changelog=changelog)
    LogService.log_audit_event(actor=request.user, action='created', entity_type='document', entity=document, request=request)
    return document


@transaction.atomic
def delete_document(request, document):
    LogService.log_audit_event(actor=request.user, action='deleted', entity_type='document', entity=document, request=request)
    # Keep stored uploads referenced by historical records; access still requires a live document row.
    document.delete()
