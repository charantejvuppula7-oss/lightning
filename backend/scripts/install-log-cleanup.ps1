$ErrorActionPreference = 'Stop'
$backendDirectory = Split-Path -Parent $PSScriptRoot
$pythonExecutable = Join-Path $backendDirectory 'venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonExecutable)) {
    throw "Backend Python was not found at $pythonExecutable"
}

$action = New-ScheduledTaskAction -Execute $pythonExecutable `
    -Argument 'manage.py cleanup_logs' -WorkingDirectory $backendDirectory
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Hours 24)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'Company_2_LogCleanup' -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal `
    -Description 'Delete Company_2 audit and API logs older than seven days, every 24 hours.' -Force | Out-Null
Write-Output 'Company_2_LogCleanup installed: cleanup every 24 hours with seven-day log retention for the current Windows user.'
