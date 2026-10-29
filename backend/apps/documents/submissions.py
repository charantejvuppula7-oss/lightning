from rest_framework.exceptions import ValidationError
from apps.documents.services import store_document


def review_submission(request, project, data):
    uploads = request.FILES.getlist('files')
    if any(upload.size > 25 * 1024 * 1024 for upload in uploads):
        raise ValidationError({'files': 'Each file must be 25 MB or smaller.'})
    documents = [store_document(request, project, upload) for upload in uploads]
    return {'description': data.get('description', ''), 'links': data.get('links', []),
            'documents': [str(document.pk) for document in documents]}
