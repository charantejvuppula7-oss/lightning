$ErrorActionPreference = 'Stop'
$taskBackendDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend'
$taskPython = Join-Path $taskBackendDirectory 'venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
    throw 'Backend virtual environment is missing. Install backend/requirements.txt first.'
}
Push-Location $taskBackendDirectory
try {
    & $taskPython -m uvicorn config.asgi:application --host 127.0.0.1 --port 8000 --reload
} finally {
    Pop-Location
}
