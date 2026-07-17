# Verify the OneDrive-safe node_modules junction, then start Expo.
# Usage from pillio-mobile:
#   powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1

$ErrorActionPreference = "Stop"
$proj = Split-Path $PSScriptRoot -Parent
$nm = Join-Path $proj "node_modules"
$nmLocal = Join-Path $env:LOCALAPPDATA "pillio-mobile-install\node_modules"
$expo = Join-Path $nm ".bin\expo.cmd"

function Test-OneDrivePlaceholder([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $out = cmd /c "fsutil reparsepoint query `"$path`" 2>nul"
  return ($out -join "`n") -match "0x9000601a"
}

Set-Location $proj

if (-not (Test-Path $nm) -or (Test-OneDrivePlaceholder $nm) -or -not (Test-Path $expo)) {
  Write-Host "node_modules is missing or corrupted by OneDrive."
  Write-Host "Fixing with reinstall-modules.ps1 ..."
  & (Join-Path $PSScriptRoot "reinstall-modules.ps1")
}

if (Test-OneDrivePlaceholder $nm) {
  throw "OneDrive is still hijacking node_modules. In OneDrive settings, exclude this folder from sync: $nm"
}

if (-not (Test-Path $expo)) {
  throw "expo still missing. Expected junction: $nm -> $nmLocal"
}

Write-Host "Starting Expo (clearing Metro cache)..."
npx expo start -c
