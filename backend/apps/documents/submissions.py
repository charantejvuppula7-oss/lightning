from rest_framework.exceptions import ValidationError
from api.models import ResourceFile


def review_submission(request, project, data):
    uploads = request.FILES.getlist('files')
    if any(upload.size > 25 * 1024 * 1024 for upload in uploads):
        raise ValidationError({'files': 'Each file must be 25 MB or smaller.'})
    documents = [ResourceFile.objects.create(project=project, file=upload, file_name=upload.name,
        file_size=upload.size, file_type=ResourceFile.get_file_category(upload.name), uploaded_by=request.user)
        for upload in uploads]
    return {'description': data.get('description', ''), 'links': data.get('links', []),
            'documents': [str(document.pk) for document in documents]}
