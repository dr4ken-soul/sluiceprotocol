#!/usr/bin/env pwsh
# Type-checks and tests the Sluice programs on the host.
#
# `build-sbf.ps1` produces the deployable BPF/SBF artefacts. This script is the
# faster inner loop: it type-checks every program and runs the `core-math` unit
# tests, which is where the arithmetic that decides where a holder's money goes
# is actually verified.
#
# Two environment details are handled here, both specific to running the Solana
# toolchain on Windows:
#
# 1. The MSVC host toolchain expects `link.exe` from a Visual Studio installation,
#    which is not present on this machine. The GNU host toolchain ships a
#    self-contained linker, so it is used instead.
# 2. The Solana platform toolchain's bundled Cargo is 1.68, which cannot parse
#    manifests or lock files using edition 2024. Resolution therefore runs on the
#    stable toolchain via `lockfile.ps1`, and this script checks with the same one.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\check.ps1
#   powershell -ExecutionPolicy Bypass -File .\check.ps1 -Package sluice-curve

param(
  [string[]]$Package
)

Set-Location $PSScriptRoot

$toolchainCandidates = @(
  "$env:USERPROFILE\.local\share\solana\install\active_release\bin",
  "$env:USERPROFILE\.sluice-toolchain\solana-1.17.34\bin"
)
$binDir = $toolchainCandidates |
  Where-Object { Test-Path (Join-Path $_ "cargo-build-sbf.exe") } |
  Select-Object -First 1

$ptCandidates = @(
  "$env:USERPROFILE\.cache\solana\v1.37\platform-tools",
  "$env:USERPROFILE\.sluice-toolchain\platform-tools-v1.37"
)
$platformTools = $ptCandidates |
  Where-Object { Test-Path (Join-Path $_ "rust\bin\cargo.exe") } |
  Select-Object -First 1

if (-not $platformTools) {
  throw "Platform tools not found. Run .\build-sbf.ps1 once with network access, or extract platform-tools v1.37 into $env:USERPROFILE\.sluice-toolchain\platform-tools-v1.37"
}

# The GNU host toolchain is used deliberately. The MSVC one expects `link.exe`
# from a Visual Studio installation, which is not present here, and pointing it
# at the platform-tools `lld-link.exe` is not enough because the MSVC import
# libraries are still missing. The GNU toolchain ships a self-contained linker.
#
# Only the LLVM `bin` directory goes on PATH, not the platform-tools `rust/bin`.
# That directory holds the toolchain's own rustc 1.68, and with it on PATH cargo
# 1.98 would invoke rustc 1.68, which then rejects cargo's `--check-cfg` arguments
# as unstable options.
$env:PATH = "$binDir;$platformTools\llvm\bin;$env:PATH"
$env:CARGO_HOME = "$env:USERPROFILE\.cargo"
$env:RUSTUP_HOME = "$env:USERPROFILE\.rustup"
$env:HOME = $env:USERPROFILE
$hostToolchain = "+stable-x86_64-pc-windows-gnu"
Remove-Item Env:RUSTC -ErrorAction SilentlyContinue
Remove-Item Env:RUSTUP_TOOLCHAIN -ErrorAction SilentlyContinue


# core-math has no Solana dependencies, so its tests run on any toolchain and are
# the fastest signal that the arithmetic is sound.
Write-Output ""
Write-Output "=== sluice-core-math tests ==="
& "$env:USERPROFILE\.cargo\bin\cargo.exe" $hostToolchain test -p sluice-core-math
if ($LASTEXITCODE -ne 0) { throw "core-math tests failed" }

$targets = if ($Package) { $Package } else {
  @("sluice-curve", "sluice-compliance", "sluice-bond", "sluice-verifier",
    "sluice-settlement", "sluice-redemption", "sluice-waterfall", "sluice-autopilot")
}

Write-Output ""
Write-Output "=== type-checking programs ==="
$failed = @()
foreach ($target in $targets) {
  Write-Output "--- $target ---"
  & "$env:USERPROFILE\.cargo\bin\cargo.exe" $hostToolchain check -p $target
  if ($LASTEXITCODE -ne 0) { $failed += $target }
}

if ($failed.Count -gt 0) {
  Write-Output ""
  Write-Error "Failed: $($failed -join ', ')"
  exit 1
}

Write-Output ""
Write-Output "All programs type-check."
