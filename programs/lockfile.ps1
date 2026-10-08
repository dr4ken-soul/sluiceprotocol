#!/usr/bin/env pwsh
# Regenerates programs/Cargo.lock so the workspace builds on the Solana 1.17.34
# platform toolchain.
#
# Why this exists. Three separate resolution problems stand between Anchor 0.29.0
# and that toolchain, and all three are version resolution rather than code:
#
# 1. Anchor 0.29.0 declares `solana-program = "^1.16"`, which floats to 1.18.
# 2. spl-token-2022 pulls spl-pod, which pulls solana-zk-token-sdk. All three
#    float to 1.18 and each forces the next, so they cannot be moved one at a
#    time with `cargo update --precise`, which accepts a single version.
# 3. solana-program 1.18 asks js-sys for a feature newer js-sys releases no
#    longer expose, and the toolchain's bundled Cargo 1.68 cannot parse
#    lock files or manifests using edition 2024.
#
# The fix is to declare the whole Solana family in the workspace manifest at
# exactly 1.17.34, so Cargo resolves the set in a single pass, then rewrite the
# lock file header from version 4 down to version 3 for Cargo 1.68.
#
# Idempotent. Run it whenever a dependency requirement changes.

Set-Location $PSScriptRoot

function Invoke-Cargo([string[]]$Arguments, [switch]$Quiet) {
  & cargo @Arguments 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    if ($Quiet) { return $false }
    throw "cargo $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
  return $true
}

$manifestPath = Join-Path $PSScriptRoot "Cargo.toml"
$manifest = [System.IO.File]::ReadAllText($manifestPath)

# The Solana family that has to move together. Each entry replaces an existing
# requirement in the `[workspace.dependencies]` table.
$family = @(
  @{ crate = "solana-program"; req = "=1.17.34" },
  @{ crate = "solana-sdk"; req = "=1.17.34" },
  @{ crate = "solana-zk-token-sdk"; req = "=1.17.34" }
)

Write-Output "Declaring the Solana family at 1.17.34"
foreach ($entry in $family) {
  $line = "$($entry.crate) = `"$($entry.req)`""
  $pattern = "(?m)^$([regex]::Escape($entry.crate))\s*=\s*.*$"
  if ($manifest -match $pattern) {
    $manifest = [regex]::Replace($manifest, $pattern, $line)
  } else {
    # Append to the workspace dependency table so a first run works too.
    $manifest = $manifest -replace '(?m)^\[workspace\.dependencies\]\s*$', "[workspace.dependencies]`n$line"
  }
}
[System.IO.File]::WriteAllText($manifestPath, $manifest)

Write-Output "Resolving"
Invoke-Cargo @("+stable-x86_64-pc-windows-msvc", "update")

# Transitive crates whose current releases require edition 2024, which the
# toolchain's Cargo 1.68 refuses to parse. Each is pinned to the newest release
# that still parses.
$pins = @(
  @{ package = "zeroize_derive"; version = "1.4.2" },
  @{ package = "thiserror"; version = "1.0.63" },
  @{ package = "thiserror-impl"; version = "1.0.63" }
)

for ($pass = 1; $pass -le 4; $pass++) {
  $lockFile = Join-Path $PSScriptRoot "Cargo.lock"
  $before = (Get-FileHash $lockFile -Algorithm SHA256).Hash
  foreach ($pin in $pins) {
    Invoke-Cargo @("+stable-x86_64-pc-windows-msvc", "update", "-p", $pin.package, "--precise", $pin.version) -Quiet
  }
  $after = (Get-FileHash $lockFile -Algorithm SHA256).Hash
  if ($before -eq $after) {
    Write-Output "Lock file stable after $pass pass(es)"
    break
  }
}

$lockPath = Join-Path $PSScriptRoot "Cargo.lock"
$raw = [System.IO.File]::ReadAllText($lockPath)
if ($raw -match 'version = 4') {
  Write-Output "Rewriting lock file header from version 4 to 3 for Cargo 1.68"
  $raw = $raw.Replace("version = 4", "version = 3")
  [System.IO.File]::WriteAllText($lockPath, $raw)
}

# Verify rather than assume, so a future dependency bump surfaces as a loud
# failure here instead of an obscure one in the SBF build.
$lockRaw = [System.IO.File]::ReadAllText($lockPath)
foreach ($entry in $family) {
  $pattern = 'name = "' + [regex]::Escape($entry.crate) + '"\r?\nversion = "' + $entry.req.TrimStart('=') + '"'
  if ($lockRaw -notmatch $pattern) {
    throw "$($entry.crate) did not resolve to $($entry.req). The toolchain will reject this build."
  }
}
Write-Output "Solana family pinned to 1.17.34"

Write-Output ""
Write-Output "Ready. Build with:  .\build-sbf.ps1"
