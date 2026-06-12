$secret = '031eb8ac5c832a46b73da7c594dc502d401cb1062070347c80e1a8445043ad5c'
$id = Read-Host "Machine ID"
if(-not $id){ exit }
$days = Read-Host "Days (e.g. 365)"; if(-not $days){$days=365}
$now = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
$exp = (Get-Date).AddDays([int]$days).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$payload = @{machine_id=$id; activated_at=$now; expires_at=$exp} | ConvertTo-Json -Compress
$hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret))
$sig = ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($payload)) | ForEach-Object {'{0:x2}' -f $_}) -join ''
@{machine_id=$id; activated_at=$now; expires_at=$exp; sig=$sig} | ConvertTo-Json -Depth 3 | Set-Content "license.json" -Encoding UTF8
Write-Host "Done: license.json created" -Fore Green
Read-Host "Press Enter"