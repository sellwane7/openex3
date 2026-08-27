<#
.SYNOPSIS
  Safely applies the wallet balance pre-check fix on its own branch,
  runs the backend test suite, and pushes for a PR.

.WHAT THIS DOES NOT DO
  - Does NOT commit or push to main
  - Does NOT force-push anything
  - Does NOT touch any file other than the two changed by this fix
  - Does NOT push if the tests fail

.REQUIREMENTS
  - Run this from inside your local clone of the openex3 repo
  - Put 0001-fix-wallet-balance-precheck.patch in the SAME folder as this
    script before running it
  - Java/Gradle set up locally the same way you already run ./gradlew test

.USAGE
  cd path\to\openex3
  # copy 0001-fix-wallet-balance-precheck.patch and this script into this folder first
  .\apply-balance-fix.ps1
#>

$ErrorActionPreference = "Stop"

$branchName  = "fix/wallet-balance-precheck"
$patchName   = "0001-fix-wallet-balance-precheck.patch"

# --- Safety checks -----------------------------------------------------

if (-not (Test-Path ".git")) {
    Write-Error "This doesn't look like the repo root (no .git folder here). cd into your openex3 clone first."
}

$patchPath = Join-Path $PSScriptRoot $patchName
if (-not (Test-Path $patchPath)) {
    Write-Error "Couldn't find $patchName next to this script. Place it in the same folder and re-run."
}

$status = git status --porcelain --untracked-files=no
if ($status) {
    Write-Error "You have uncommitted changes in this repo. Commit or stash them first so we don't mix them into this branch."
}

$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "main") {
    Write-Host "Currently on '$currentBranch', switching to main first..."
    git checkout main
}

Write-Host "Pulling latest main..."
git pull origin main

$existingBranch = git branch --list $branchName
if ($existingBranch) {
    Write-Error "Branch '$branchName' already exists locally. Delete it first (git branch -D $branchName) if you want to redo this."
}

# --- Create branch and apply the patch (real commit, real message) -----

Write-Host "Creating branch $branchName..."
git checkout -b $branchName

Write-Host "Applying patch..."
git am $patchPath

# --- Run tests before ever pushing --------------------------------------

Write-Host "`nRunning backend tests (this uses the in-memory H2 DB, no Docker needed)..."
Push-Location backend
try {
    & .\gradlew.bat test
    if ($LASTEXITCODE -ne 0) {
        throw "Tests failed."
    }
} finally {
    Pop-Location
}

Write-Host "`nTests passed. Including the new test:"
Write-Host "  'a buy order that would overdraw the buyer's balance is not settled'"

# --- Push and open PR ----------------------------------------------------

Write-Host "`nPushing branch to origin..."
git push -u origin $branchName

$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
$prTitle = "fix(engine): reject fills that would overdraw a trader's balance"
$prBody  = @"
settleTrade() now checks the buyer's quote-currency balance and the
seller's base-currency balance before posting either ledger leg.

If either side can't cover the fill, the trade is skipped (no ledger
entries written) and matching stops for this order — same as running
out of book liquidity. Nothing crashes, nothing partially writes.

Deposits are unaffected: the faucet debit in WalletController goes
through LedgerService.transfer() directly and is unchanged.

Adds a test proving an underfunded buy order produces zero trades and
leaves the buyer's balance untouched.
"@

if ($ghInstalled) {
    Write-Host "Opening PR with GitHub CLI..."
    gh pr create --base main --head $branchName --title $prTitle --body $prBody
    Write-Host "`nDone. Wait for the Backend CI check, then merge from GitHub (Merge button, not a force-push)."
} else {
    Write-Host "`nBranch pushed. GitHub CLI (gh) isn't installed, so open the PR manually:"
    Write-Host "  1. Go to https://github.com/sellwane7/openex3"
    Write-Host "  2. GitHub will show a banner to open a PR for '$branchName' - click it"
    Write-Host "  3. Title: $prTitle"
    Write-Host "  4. Wait for CI to pass, then click Merge"
}
