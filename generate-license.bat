@echo off
cd /d "%~dp0"
chcp 65001 >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$secret = 'baderp-license-signing-key-2025-change-in-production'; ^
     Write-Host '==========================================' -Fore Cyan; ^
     Write-Host '   CenterMasr - License Generator' -Fore Cyan; ^
     Write-Host '==========================================' -Fore Cyan; ^
     Write-Host ''; ^
     $id = Read-Host 'Machine ID'; ^
     if (-not $id) { Write-Host 'Error: Machine ID required' -Fore Red; exit 1 }; ^
     $days = Read-Host 'Days (e.g. 365)'; ^
     if (-not $days) { $days = 365 }; ^
     $now = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffZ'; ^
     $exp = (Get-Date).AddDays([int]$days).ToString('yyyy-MM-ddTHH:mm:ss.fffZ'); ^
     $payload = @{machine_id=$id; activated_at=$now; expires_at=$exp} | ConvertTo-Json -Depth 3 -Compress; ^
     $hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret)); ^
     $sig = ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($payload)) | ForEach-Object { '{0:x2}' -f $_ }) -join ''; ^
     $lic = @{machine_id=$id; activated_at=$now; expires_at=$exp; sig=$sig} | ConvertTo-Json -Depth 3; ^
     $lic | Set-Content 'license.json' -Encoding UTF8; ^
     Write-Host ''; ^
     Write-Host '==========================================' -Fore Green; ^
     Write-Host '  Created license.json (signed)' -Fore Green; ^
     Write-Host '==========================================' -Fore Green; ^
     Write-Host \"Machine ID: $id\"; ^
     Write-Host \"Days: $days\"; ^
     Write-Host ''; ^
     Write-Host 'Send license.json to client via WhatsApp'; ^
     Write-Host 'Client pastes it in Settings > Activate License'; ^
     Read-Host 'Press Enter to exit'"