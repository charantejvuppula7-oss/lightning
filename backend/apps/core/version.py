"""Return Company's release version, keeping GitHub credentials on the server."""
import base64
import json
import logging
import re

import requests
from django.conf import settings
from django.core.cache import cache
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)
REPOSITORY = 'https://api.github.com/repos/Tachyon-Automations/PROJECT-LIGHTNING_TACHYON_240626'


def version_numbers(version):
    return tuple(int(number) for number in re.findall(r'\d+', version))


class AppVersionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        version = cache.get('company-app-version')
        if version is None:
            package = settings.BASE_DIR.parent / 'ui' / 'package.json'
            candidates = [json.loads(package.read_text(encoding='utf-8'))['version']]
            if settings.GITHUB_TOKEN:
                headers = {'Accept': 'application/vnd.github+json',
                           'Authorization': f'Bearer {settings.GITHUB_TOKEN}'}
                try:
                    response = requests.get(f'{REPOSITORY}/contents/UI/ui/package.json',
                        params={'ref': 'dependency'}, headers=headers, timeout=5)
                    response.raise_for_status()
                    data = json.loads(base64.b64decode(response.json()['content']))
                    if re.fullmatch(r'v?\d+\.\d+\.\d+', str(data.get('version', ''))):
                        candidates.append(data['version'].lstrip('v'))
                except (requests.RequestException, ValueError, KeyError, TypeError):
                    logger.warning('Unable to read GitHub package version; using the local version.')
                try:
                    response = requests.get(f'{REPOSITORY}/tags', params={'per_page': 15}, headers=headers, timeout=5)
                    response.raise_for_status()
                    for tag in response.json():
                        match = re.search(r'v?(\d+\.\d+(?:\.\d+)?)', tag.get('name', ''))
                        if match:
                            candidates.append(match.group(1))
                except (requests.RequestException, ValueError, KeyError, TypeError, AttributeError):
                    logger.warning('Unable to read GitHub release tags; using the package version.')
            version = max(candidates, key=version_numbers)
            cache.set('company-app-version', version, timeout=60)
        response = Response({'version': version})
        response['Cache-Control'] = 'no-store'
        return response
