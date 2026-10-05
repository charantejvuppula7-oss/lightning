from copy import copy

from django.core.exceptions import ValidationError as ModelValidationError
from rest_framework.exceptions import ValidationError


def normalize_aliases(data, aliases):
    """
    Standardize request payload keys where frontend field names differ or use aliases.

    If both the alias and the target field name are provided with conflicting values,
    a ValidationError is raised.

    Args:
        data (dict): The input dictionary (e.g. `request.data`).
        aliases (dict[str, str]): Mapping from alias name to canonical field name
                                  (e.g. {'Status': 'status'}).

    Returns:
        dict: A shallow copy of data with canonical keys and removed alias keys.

    Raises:
        ValidationError: If conflicting non-identical values exist for both alias and target.
    """
    values = data.copy()
    for alias, field in aliases.items():
        if alias in values:
            if field in values and values[field] != values[alias]:
                raise ValidationError({field: 'Conflicting values were supplied.'})
            values[field] = values[alias]
            del values[alias]
    return values


def validate_model_attributes(model, instance, attributes):
    """
    Perform a dry-run model validation against proposed attributes without saving.

    Instantiates a temporary copy of the instance or a new model object, applies
    non-M2M attributes, and invokes `clean()` to ensure domain invariants hold.

    Args:
        model (type[models.Model]): The Django model class.
        instance (models.Model|None): The existing instance being updated, or None if creating.
        attributes (dict): The proposed field values to validate.

    Returns:
        models.Model: The cloned model candidate with attributes populated.

    Raises:
        ValidationError: If model-level validation fails in `clean()`.
    """
    candidate = copy(instance) if instance is not None else model()
    for name, value in attributes.items():
        if not model._meta.get_field(name).many_to_many:
            setattr(candidate, name, value)
    try:
        candidate.clean()
    except ModelValidationError as error:
        raise ValidationError(error.message_dict if hasattr(error, 'message_dict') else error.messages) from error
    return candidate

