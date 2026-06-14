# CenterMasr Build Environment Setup
# Run this script as Administrator to install required build tools

Write-Host "=== CenterMasr Build Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    exit 1
}

# 1. Install MinGW-w64 via Chocolatey
Write-Host "`n[1/3] Installing MinGW-w64..." -ForegroundColor Yellow
choco install mingw -y --no-progress
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install MinGW" -ForegroundColor Red
    exit 1
}

# 2. Add MinGW to PATH
Write-Host "`n[2/3] Adding MinGW to PATH..." -ForegroundColor Yellow
$mingwPath = "C:\ProgramData\chocolatey\lib\mingw\tools\install\x86_64-w64-mingw32\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$mingwPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$mingwPath", "Machine")
    $env:Path = "$env:Path;$mingwPath"
}

# 3. Fix Git link.exe issue
Write-Host "`n[3/3] Verifying build tools..." -ForegroundColor Yellow
$gitLink = "C:\Program Files\Git\usr\bin\link.exe"
if (Test-Path $gitLink) {
    Write-Host "WARNING: Git's link.exe conflicts with MSVC. Renaming temporarily..." -ForegroundColor Yellow
    Rename-Item -Path $gitLink -NewName "link.exe.gitbak" -Force -ErrorAction SilentlyContinue
}

# Verify
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
gcc --version 2>&1 | Select-Object -First 1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: gcc not found in PATH, trying manual path..." -ForegroundColor Yellow
}

# Restore Git link
if (Test-Path "C:\Program Files\Git\usr\bin\link.exe.gitbak") {
    Rename-Item -Path "C:\Program Files\Git\usr\bin\link.exe.gitbak" -NewName "link.exe" -Force
}

Write-Host "`n✅ Setup complete! Now run:" -ForegroundColor Green
Write-Host "   cd src-tauri" -ForegroundColor White
Write-Host "   cargo build --release" -ForegroundColor White
