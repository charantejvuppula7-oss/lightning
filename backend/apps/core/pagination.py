from rest_framework.pagination import PageNumberPagination


class ResourcePagination(PageNumberPagination):
    """
    Standard pagination strategy for all collection endpoints across the API.

    Attributes:
        page_size (int): Default number of records per page (50).
        page_size_query_param (str): Client query parameter to customize page size (`?page_size=N`).
        max_page_size (int): Upper bound limit to prevent excessive memory/payload size (100).
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

