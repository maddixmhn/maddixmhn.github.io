# Reset Codex CLI to factory defaults and make its traffic go direct (no proxy).
#
# Run this when Codex cannot connect, shows "Organization settings could not be
# loaded", or hangs.  No secrets are read, copied or stored.
#
# Usage (PowerShell — no admin needed):
#   powershell -ExecutionPolicy Bypass -File .\reset-codex.ps1
#
# What it does:
#   1. Removes all proxy env-vars (session + user + machine) for Codex traffic.
#   2. Adds api.openai.com and *.openai.com to NO_PROXY so proxy tools skip them.
#   3. Wipes the Codex auth/config cache so it starts clean.
#   4. Reinstalls the Codex CLI package (npm install -g --force).
#   5. Runs codex login (browser) and verifies the connection with a live call.

$ErrorActionPreference = 'Continue'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

function Step($t) { Write-Host "`n== $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "  [ok] $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  [!]  $t" -ForegroundColor Yellow }
function Fail($t) { Write-Host "  [x]  $t" -ForegroundColor Red }

# ---------------------------------------------------------------------------
Step '1 · Clearing proxy environment variables'

$proxyVars = @('HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy')
foreach ($v in $proxyVars) {
    if ([Environment]::GetEnvironmentVariable($v, 'Process')) {
        [Environment]::SetEnvironmentVariable($v, $null, 'Process')
        Write-Host "    cleared (session): $v"
    }
    if ([Environment]::GetEnvironmentVariable($v, 'User')) {
        [Environment]::SetEnvironmentVariable($v, $null, 'User')
        Write-Host "    cleared (user):    $v"
    }
    if ([Environment]::GetEnvironmentVariable($v, 'Machine')) {
        Write-Host "    NOTE: $v is set at machine level — needs admin to clear."
        Write-Host "          Run this script 'As administrator' to clear it."
    }
}

# Make sure OpenAI traffic always bypasses any future proxy.
$noProxy = 'api.openai.com,*.openai.com,openai.com,cdn.openai.com'
[Environment]::SetEnvironmentVariable('NO_PROXY', $noProxy, 'Process')
[Environment]::SetEnvironmentVariable('NO_PROXY', $noProxy, 'User')
[Environment]::SetEnvironmentVariable('no_proxy', $noProxy, 'Process')
[Environment]::SetEnvironmentVariable('no_proxy', $noProxy, 'User')
Ok "NO_PROXY set to: $noProxy"

# ---------------------------------------------------------------------------
Step '2 · Removing Codex auth/config cache'

$codexDirs = @(
    (Join-Path $env:USERPROFILE '.codex'),
    (Join-Path $env:LOCALAPPDATA 'codex'),
    (Join-Path $env:APPDATA 'codex'),
    (Join-Path $env:APPDATA '@openai\codex')
)
foreach ($d in $codexDirs) {
    if (Test-Path $d) {
        Copy-Item $d "$d.bak-$stamp" -Recurse -ErrorAction SilentlyContinue
        Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue
        Ok "removed $d  (backup: $d.bak-$stamp)"
    }
}

# npm global package cache entries
$npmGlobal = npm root -g 2>$null
if ($npmGlobal) {
    $codexPkg = Join-Path $npmGlobal '@openai\codex'
    if (Test-Path $codexPkg) {
        Write-Host "  npm package found at $codexPkg"
    }
}

# ---------------------------------------------------------------------------
Step '3 · Reinstalling @openai/codex (clean, no cache)'

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fail 'npm not found. Install Node.js LTS from https://nodejs.org and re-run.'
    exit 1
}

Write-Host '  Running: npm install -g @openai/codex --force'
npm install -g @openai/codex --force 2>&1 | Tee-Object -Variable npmOut | Out-Null
$npmFailed = $LASTEXITCODE -ne 0
if ($npmFailed) {
    Fail "npm install failed. Last lines:"
    $npmOut | Select-Object -Last 10 | ForEach-Object { Write-Host "    $_" }
} else {
    $ver = (codex --version 2>$null)
    Ok "Codex CLI installed: $ver"
}

# ---------------------------------------------------------------------------
Step '4 · Direct connectivity check (before login)'

Write-Host '  Testing TCP to api.openai.com:443 ...'
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $conn = $tcp.BeginConnect('api.openai.com', 443, $null, $null)
    $ok = $conn.AsyncWaitHandle.WaitOne(5000)
    $tcp.Close()
    if ($ok) { Ok 'api.openai.com:443 reachable (direct)' }
    else      { Warn 'TCP connect timed out. Check your firewall / ISP block on port 443 to openai.com.' }
} catch {
    Warn "TCP test failed: $_"
}

# ---------------------------------------------------------------------------
Step '5 · Codex login'

if (Get-Command codex -ErrorAction SilentlyContinue) {
    Write-Host '  Opening browser for login. Sign in with your OpenAI account.'
    codex login
    Start-Sleep -Seconds 2
    codex login status *>$null
    if ($LASTEXITCODE -eq 0) { Ok 'Codex is logged in' }
    else                     { Warn 'Codex login status returned non-zero. Try: codex login' }
} else {
    Warn 'codex command not found. Restart the terminal and run this script again.'
}

# ---------------------------------------------------------------------------
Step '6 · Live test (sends one real request)'

if ((Get-Command codex -ErrorAction SilentlyContinue) -and ($LASTEXITCODE -eq 0 -or (codex login status *>$null; $LASTEXITCODE -eq 0))) {
    $out = [System.IO.Path]::GetTempFileName()
    Write-Host '  Asking: "Reply with exactly: CODEX_OK"'
    'Reply with exactly: CODEX_OK' | codex exec --skip-git-repo-check --sandbox read-only -C $env:USERPROFILE -o $out - 2>$null
    $answer = if (Test-Path $out) { Get-Content -Raw $out } else { '' }
    Remove-Item $out -ErrorAction SilentlyContinue
    if ("$answer" -match 'CODEX_OK') {
        Ok "Live test passed. Codex answered: $answer"
    } else {
        Warn "Live test did not return CODEX_OK. Got: $answer"
        Warn 'If the answer is empty, try: codex doctor'
    }
} else {
    Warn 'Skipping live test (not logged in or codex not installed).'
}

# ---------------------------------------------------------------------------
Write-Host ''
Write-Host 'Reset complete. If Codex still cannot connect:' -ForegroundColor Cyan
Write-Host '  1. Run: codex doctor'
Write-Host '  2. Make sure api.openai.com is reachable in your browser.'
Write-Host '  3. If behind a VPN/firewall, add an exception for *.openai.com.'
Write-Host '  4. Try: codex login --device-auth  (no browser required)'
