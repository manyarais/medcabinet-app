# Reinstall pillio-mobile deps outside OneDrive (OneDrive corrupts node_modules).
# Usage from pillio-mobile:
#   powershell -ExecutionPolicy Bypass -File .\scripts\reinstall-modules.ps1

$ErrorActionPreference = "Stop"
$proj = Split-Path $PSScriptRoot -Parent
$installRoot = Join-Path $env:LOCALAPPDATA "pillio-mobile-install"
$nmLocal = Join-Path $installRoot "node_modules"
$nm = Join-Path $proj "node_modules"

function Test-OneDrivePlaceholder([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $out = cmd /c "fsutil reparsepoint query `"$path`" 2>nul"
  # 0x9000601a = OneDrive cloud placeholder (NOT a real junction)
  return ($out -join "`n") -match "0x9000601a"
}

function Remove-PathForce([string]$path) {
  $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  if (-not $item) { return }

  # OneDrive placeholders often refuse rmdir — rename aside first.
  if (Test-OneDrivePlaceholder $path) {
    $trash = Join-Path (Split-Path $path -Parent) ("_nm_trash_" + (Get-Date -Format "HHmmss"))
    Write-Host "OneDrive placeholder detected at $path — renaming to $trash"
    Rename-Item -LiteralPath $path -NewName (Split-Path $trash -Leaf) -Force
    $path = $trash
    $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
    if (-not $item) { return }
  }

  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    # Real junction/symlink: remove the link only (do not delete target).
    cmd /c "rmdir `"$path`"" | Out-Null
  } else {
    cmd /c "rmdir /s /q `"$path`"" | Out-Null
  }

  if (Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue) {
    # Last resort: rename out of the way so we can continue.
    $trash = Join-Path (Split-Path $path -Parent) ("_nm_trash_" + (Get-Date -Format "HHmmss"))
    Write-Host "Could not delete $path — renaming to $trash"
    Rename-Item -LiteralPath $path -NewName (Split-Path $trash -Leaf) -Force
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
if (Test-Path $nm) { throw "node_modules still present after cleanup" }
cmd /c "mklink /J `"$nm`" `"$nmLocal`"" | Out-Null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $nm)) { throw "mklink failed" }

if (Test-OneDrivePlaceholder $nm) {
  throw "OneDrive replaced the junction immediately. Exclude pillio-mobile\node_modules from OneDrive sync, then re-run."
}

$metro = Join-Path $nm "metro-cache\src\index.js"
$bundleProgress = Join-Path $nm "metro\src\lib\bundleProgressUtils.js"
$expo = Join-Path $nm ".bin\expo.cmd"
if (-not (Test-Path $metro)) { throw "metro-cache missing after install" }
if (-not (Test-Path $bundleProgress)) { throw "Metro bundleProgressUtils missing after install" }
if (-not (Test-Path $expo)) { throw "expo missing after install" }

Write-Host "OK: $nm -> $nmLocal"
Write-Host "Start with: powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1"
