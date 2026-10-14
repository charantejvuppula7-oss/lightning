from django.db import models
import uuid
import os

def resource_upload_path(instance, filename):
    """
    Route uploaded files into categorized directory structures based on file extension.

    Sorts common office documents and PDFs into a `documents/project_<id>/` subdirectory,
    and all other file types into `other/project_<id>/`.

    Args:
        instance (ResourceFile): Target resource file instance being saved.
        filename (str): Original uploaded filename.

    Returns:
        str: Relative filesystem storage path.
    """
    ext = os.path.splitext(filename)[1].lower()

    DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.txt', '.csv', '.rtf', '.zip', '.rar'}

    if ext in DOCUMENT_EXTENSIONS:
        category = 'documents'
    else:
        category = 'other'

    project_folder = f"project_{instance.project_id}"
    return os.path.join(category, project_folder, filename)



class ResourceFile(models.Model):
    """
    A single uploaded file attached to a project.
    """

    FILE_TYPE_CHOICES = [
        ('document', 'Document'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        related_name='resource_files_set'
    )
    file = models.FileField(upload_to=resource_upload_path)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(
        max_length=30,
        choices=FILE_TYPE_CHOICES,
        default='document'
    )
    file_size = models.BigIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_pdr = models.BooleanField(default=False)
    pdr_version = models.CharField(max_length=50, blank=True, default='')
    pdr_changelog = models.CharField(max_length=255, blank=True, default='')
    uploaded_by = models.ForeignKey(
        'UserData',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_resources'
    )

    def __str__(self):
        return f"{self.file_name} ({self.file_type})"

    @staticmethod
    def get_file_category(filename):
        """Determine file category from filename extension."""
        ext = os.path.splitext(filename)[1].lower()
        
        DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.txt', '.csv', '.rtf', '.zip', '.rar'}

       
        if ext in DOCUMENT_EXTENSIONS:
            return 'document'
        return 'other'
