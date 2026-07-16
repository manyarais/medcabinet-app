# Reinstall pillio-mobile deps outside OneDrive (OneDrive corrupts node_modules).
# Usage from pillio-mobile:
#   powershell -ExecutionPolicy Bypass -File .\scripts\reinstall-modules.ps1

$ErrorActionPreference = "Stop"
$proj = Split-Path $PSScriptRoot -Parent
$installRoot = Join-Path $env:LOCALAPPDATA "pillio-mobile-install"
$nmLocal = Join-Path $installRoot "node_modules"
$nm = Join-Path $proj "node_modules"

function Remove-PathForce([string]$path) {
  $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  if (-not $item) { return }
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    cmd /c "rmdir `"$path`"" | Out-Null
  } else {
    cmd /c "rmdir /s /q `"$path`"" | Out-Null
  }
  if (Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue) {
    throw "Could not remove $path. Close Expo/Metro/Cursor terminals using it, then retry."
  }
}

Remove-PathForce $nm
Remove-PathForce $installRoot

New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
Copy-Item (Join-Path $proj "package.json") $installRoot -Force
$lock = Join-Path $proj "package-lock.json"
if (Test-Path $lock) { Copy-Item $lock $installRoot -Force }

Set-Location $installRoot
Write-Host "Installing into $installRoot ..."
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
Copy-Item (Join-Path $installRoot "package-lock.json") $lock -Force

Set-Location $proj
cmd /c "mklink /J `"$nm`" `"$nmLocal`"" | Out-Null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $nm)) { throw "mklink failed" }

$metro = Join-Path $nm "metro-cache\src\index.js"
$bundleProgress = Join-Path $nm "metro\src\lib\bundleProgressUtils.js"
$expo = Join-Path $nm ".bin\expo.cmd"
if (-not (Test-Path $metro)) { throw "metro-cache missing after install" }
if (-not (Test-Path $bundleProgress)) { throw "Metro bundleProgressUtils missing after install" }
if (-not (Test-Path $expo)) { throw "expo missing after install" }

Write-Host "OK: $nm -> $nmLocal"
Write-Host "Start with: npx expo start -c"
