from copy import copy

from django.core.exceptions import ValidationError as ModelValidationError
from rest_framework.exceptions import ValidationError


def normalize_aliases(data, aliases):
    values = data.copy()
    for alias, field in aliases.items():
        if alias in values:
            if field in values and values[field] != values[alias]:
                raise ValidationError({field: 'Conflicting values were supplied.'})
            values[field] = values[alias]
            del values[alias]
    return values


def validate_model_attributes(model, instance, attributes):
    """Run entity validation against the effective input, without writing it."""
    candidate = copy(instance) if instance is not None else model()
    for name, value in attributes.items():
        if not model._meta.get_field(name).many_to_many:
            setattr(candidate, name, value)
    try:
        candidate.clean()
    except ModelValidationError as error:
        raise ValidationError(error.message_dict if hasattr(error, 'message_dict') else error.messages) from error
    return candidate
