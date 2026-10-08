# Builds the Sluice Anchor programs to SBF.
#
# `anchor build` is the documented path in BUILD_GUIDE.md and remains the right
# command once the Anchor CLI is installed. This script exists because the CLI is
# a separate build that needs a C toolchain, and it wraps the same underlying
# Solana build directly so the programs can be compiled and their bytecode
# inspected without it. Both paths produce equivalent output.
#
# Usage, from this directory:
#   powershell -ExecutionPolicy Bypass -File .\build-sbf.ps1
#   powershell -ExecutionPolicy Bypass -File .\build-sbf.ps1 -Program curve
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Program
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

# Locate the Solana toolchain. Prefers the official install layout, then the
# per-user location used by the Windows bootstrap.
$toolchainCandidates = @(
  "$env:USERPROFILE\.local\share\solana\install\active_release\bin",
  "$env:USERPROFILE\.sluice-toolchain\solana-1.17.34\bin"
)
$binDir = $toolchainCandidates | Where-Object { Test-Path (Join-Path $_ "cargo-build-sbf.exe") } | Select-Object -First 1

if (-not $binDir) {
  # Fall back to whatever is on PATH.
  if (Get-Command "cargo-build-sbf" -ErrorAction SilentlyContinue) {
    $binDir = Split-Path -Parent (Get-Command "cargo-build-sbf").Source
  } else {
    throw "cargo-build-sbf not found. Install the Solana CLI from https://release.anza.xyz/stable/install"
  }
}

# Platform tools supply the `sbf-solana-solana` sysroot and the LLVM the linker
# needs. Solana 1.17.34 ships platform tools v1.37.
$ptCandidates = @(
  "$env:USERPROFILE\.cache\solana\v1.37\platform-tools",
  "$env:USERPROFILE\.sluice-toolchain\platform-tools-v1.37"
)
$platformTools = $ptCandidates | Where-Object { Test-Path (Join-Path $_ "rust\bin\cargo.exe") } | Select-Object -First 1

if (-not $platformTools) {
  throw "Platform tools not found. Run 'cargo-build-sbf --version' once with network access so it downloads v1.37."
}

$env:PATH = "$binDir;$platformTools\rust\bin;$platformTools\llvm\bin;$env:PATH"
$env:CARGO_HOME = "$env:USERPROFILE\.cargo"
$env:RUSTUP_HOME = "$env:USERPROFILE\.rustup"
$env:HOME = $env:USERPROFILE

# `cargo-build-sbf` re-verifies its own cache by trying to create a junction,
# which fails without the SeCreateSymbolicLink privilege. The platform tools are
# already present, so the Solana cargo is invoked directly against the same
# `sbf-solana-solana` target the wrapper would use.
$cargo = Join-Path $platformTools "rust\bin\cargo.exe"

# Read the declared package name from each crate manifest. The directory name and
# the package name differ for every program here, so they are resolved from the
# manifest rather than assumed.
function Get-PackageName([string]$crateDir) {
  $manifest = Join-Path $crateDir "Cargo.toml"
  if (-not (Test-Path $manifest)) { return $null }
  foreach ($line in Get-Content $manifest) {
    if ($line -match '^\s*name\s*=\s*"([^"]+)"') { return $Matches[1] }
  }
  return $null
}

$crateDirs = if ($Program) {
  $Program | ForEach-Object {
    if (Test-Path (Join-Path $_ "Cargo.toml")) { $_ }
    elseif (Test-Path (Join-Path (Split-Path -Parent (Get-Location)) "programs\$_")) { $_ }
    else { $_ }
  }
} else {
  Get-ChildItem -Directory | Where-Object { Test-Path (Join-Path $_.FullName "Cargo.toml") } |
    ForEach-Object { $_.Name }
}

# `core-math` is a shared library rather than a deployable program. It compiles as
# a dependency of the programs that use it, so building it on its own is skipped.
$deployable = $crateDirs | Where-Object { $_ -ne "core-math" }

Write-Output "Building: $($deployable -join ', ')"
Write-Output "Platform tools: $platformTools"

$failed = @()
foreach ($dir in $deployable) {
  $package = Get-PackageName $dir
  if (-not $package) {
    Write-Output "=== $dir : no package name in manifest, skipping ==="
    continue
  }
  Write-Output ""
  Write-Output "=== $dir ($package) ==="
  & $cargo build --manifest-path (Join-Path $dir "Cargo.toml") --target sbf-solana-solana --release
  if ($LASTEXITCODE -ne 0) { $failed += $dir }
}

if ($failed.Count -gt 0) {
  throw "Failed: $($failed -join ', ')"
}

Write-Output ""
Write-Output "All programs built. Artefacts:"
Get-ChildItem -Recurse -Filter "*.so" target\sbf-solana-solana\release -ErrorAction SilentlyContinue |
  Select-Object -First 20 | ForEach-Object { Write-Output "  $($_.FullName.Replace($here + '\', ''))" }
