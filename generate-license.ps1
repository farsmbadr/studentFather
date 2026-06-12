<# 
  generate-license.ps1
  يولد ملف license.json للعميل
  الاستخدام: .\generate-license.ps1 -MachineId "xxx" -Days 365
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$MachineId,

    [Parameter(Mandatory=$true)]
    [int]$Days
)

$now = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
$expires = (Get-Date).AddDays($Days).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$license = @{
    machine_id    = $MachineId
    activated_at  = $now
    expires_at    = $expires
} | ConvertTo-Json -Depth 3

$outPath = "license.json"
$license | Set-Content -Path $outPath -Encoding UTF8

Write-Host "✅ تم إنشاء $outPath" -ForegroundColor Green
Write-Host "Machine ID: $MachineId"
Write-Host "ينتهي في:  $expires"
Write-Host ""
Write-Host "📤 ابعت ملف license.json للعميل، وهو يحطه في:"
Write-Host "   C:\ProgramData\CenterMasr\license.json"