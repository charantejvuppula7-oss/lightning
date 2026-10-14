"""Strict parsing shared by the resource list filters."""

from datetime import date
from uuid import UUID

from rest_framework.exceptions import ValidationError


def parse_filters(params, *, ids=(), dates=(), choices=None, booleans=(), ordering=()):
    """
    Parse, sanitize, and validate HTTP GET query parameters against strict rules.

    Protects backend query builders from SQL injection, invalid formats,
    and unexpected sorting fields.

    Args:
        params (QueryDict|dict): The incoming `request.query_params` dictionary.
        ids (tuple[str]): Field names expected to be valid UUIDs (e.g. ('project_id', 'user_id')).
        dates (tuple[str]): Field names expected to be ISO dates (YYYY-MM-DD).
        choices (dict[str, tuple]): Mapping of field names to their allowable string choices.
        booleans (tuple[str]): Field names expected to be 'true' or 'false' (converted to bool).
        ordering (tuple[str]): Whitelist of field names permitted for sorting (allows optional '-' prefix).

    Returns:
        dict: Cleaned and typed parameter dictionary containing validated inputs and 'search'.

    Raises:
        ValidationError: If any parameter does not match its expected format or permitted values.
    """
    values = {}
    choices = choices or {}
    for name in ids:
        if name in params:
            try:
                values[name] = UUID(params[name])
            except (TypeError, ValueError, AttributeError):
                raise ValidationError({name: 'Enter a valid UUID.'})
    for name in dates:
        if name in params:
            try:
                values[name] = date.fromisoformat(params[name])
            except (TypeError, ValueError):
                raise ValidationError({name: 'Enter a valid date in YYYY-MM-DD format.'})
    for name, allowed in choices.items():
        if name in params:
            value = params[name]
            if value not in allowed:
                raise ValidationError({name: 'Invalid choice.'})
            values[name] = value
    for name in booleans:
        if name in params:
            value = params[name].lower()
            if value not in ('true', 'false'):
                raise ValidationError({name: 'Use true or false.'})
            values[name] = value == 'true'
    if 'ordering' in params:
        value = params['ordering']
        if value.lstrip('-') not in ordering or value in ('', '-'):
            raise ValidationError({'ordering': 'Invalid ordering field.'})
        values['ordering'] = value
    values['search'] = params.get('search', '').strip()
    return values

