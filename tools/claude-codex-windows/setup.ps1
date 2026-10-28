# Connect Claude Code and Codex CLI on this Windows computer.
#
# Run from this folder in PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1 -Proxy http://127.0.0.1:PORT
#
# What it does (no secrets are read, copied or stored):
#   1. Installs Codex CLI if missing and checks Claude Code is installed.
#   2. Turns on the Windows ssh-agent service so both agents can use ssh/git
#      without ever reading private keys.
#   3. Signs Codex in to YOUR OpenAI account if needed (browser on this PC).
#   4. Installs the "codex" skill for Claude Code.
#   5. Adds the shared working agreement to both agents' global instructions.
#   6. Tests both agents with a real, non-empty answer.
param(
    # Optional proxy for Codex in this run only (e.g. the Hiddify local port).
    [string]$Proxy,
    [switch]$SkipTest
)

$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$problems = @()

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "  [ok] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  [!]  $text" -ForegroundColor Yellow; $script:problems += $text }

function Set-SharedBlock($file, $rules) {
    $begin = '<!-- claude-codex-shared:begin -->'
    $end = '<!-- claude-codex-shared:end -->'
    $block = "$begin`r`n$rules`r`n$end"
    $dir = Split-Path -Parent $file
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    if (Test-Path $file) {
        Copy-Item $file "$file.bak-$stamp"
        $text = Get-Content -Raw -Encoding UTF8 $file
        $pattern = [regex]::Escape($begin) + '[\s\S]*?' + [regex]::Escape($end)
        if ($text -match $pattern) {
            $text = [regex]::Replace($text, $pattern, { param($m) $block })
        } else {
            $text = $text.TrimEnd() + "`r`n`r`n" + $block + "`r`n"
        }
    } else {
        $text = $block + "`r`n"
    }
    [System.IO.File]::WriteAllText($file, $text, (New-Object System.Text.UTF8Encoding $false))
}

# 1. Tools ---------------------------------------------------------------
Step 'Checking Node.js, Codex CLI and Claude Code'
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host '  Node.js (npm) is required. Install the LTS from https://nodejs.org and run this again.' -ForegroundColor Red
    exit 1
}
if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    Write-Host '  Installing @openai/codex ...'
    npm install -g @openai/codex
}
if (Get-Command codex -ErrorAction SilentlyContinue) {
    Ok ("Codex CLI " + (codex --version))
} else {
    Warn 'Codex CLI could not be installed (open a new terminal and retry).'
}
if (Get-Command claude -ErrorAction SilentlyContinue) {
    Ok ("Claude Code " + (claude --version))
} else {
    Warn 'Claude Code is not installed. See https://code.claude.com/docs/en/setup and run this again.'
}

# 2. ssh-agent -----------------------------------------------------------
Step 'Turning on ssh-agent'
$agent = Get-Service ssh-agent -ErrorAction SilentlyContinue
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $agent) {
    Warn 'OpenSSH Client is not installed (Settings > System > Optional features > OpenSSH Client).'
} else {
    if ($agent.StartType -eq 'Disabled' -or $agent.Status -ne 'Running') {
        if ($isAdmin) {
            Set-Service ssh-agent -StartupType Automatic
            Start-Service ssh-agent
        } else {
            Warn 'ssh-agent is off. Run this script once "As administrator" to turn it on.'
        }
    }
    if ((Get-Service ssh-agent).Status -eq 'Running') {
        Ok 'ssh-agent is running'
        $keys = & ssh-add -l 2>&1
        if ($LASTEXITCODE -eq 0) {
            Ok ("keys loaded in ssh-agent: " + @($keys).Count)
        } else {
            Warn 'No SSH keys in ssh-agent yet. Run: ssh-add  (you type the passphrase; agents never see the key).'
        }
    }
}

# 3. Codex sign-in -------------------------------------------------------
# Always route Codex traffic directly unless the caller passes -Proxy.
# Clear any ambient proxy that might block api.openai.com.
if ($Proxy) {
    $env:HTTPS_PROXY = $Proxy
    $env:HTTP_PROXY  = $Proxy
    Ok "using proxy $Proxy for this run"
} else {
    foreach ($v in @('HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy')) {
        if ([Environment]::GetEnvironmentVariable($v, 'Process')) {
            [Environment]::SetEnvironmentVariable($v, $null, 'Process')
        }
    }
    $bypass = 'api.openai.com,*.openai.com,openai.com'
    [Environment]::SetEnvironmentVariable('NO_PROXY', $bypass, 'Process')
    [Environment]::SetEnvironmentVariable('no_proxy', $bypass, 'Process')
    Ok 'proxy cleared for this session; openai.com is direct'
}
if (Get-Command codex -ErrorAction SilentlyContinue) {
    Step 'Checking Codex sign-in'
    codex login status *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  Signing in to your own OpenAI account; a browser window will open.'
        codex login
    }
    codex login status *> $null
    if ($LASTEXITCODE -eq 0) { Ok 'Codex is signed in' } else { Warn 'Codex is not signed in. Run: codex login' }
}

# 4. Skill ---------------------------------------------------------------
Step 'Installing the codex skill for Claude Code'
$skillDst = Join-Path $env:USERPROFILE '.claude\skills\codex'
if (Test-Path $skillDst) {
    # Back up outside skills\ so Claude Code doesn't load a second "codex" skill.
    $backupDir = Join-Path $env:USERPROFILE '.claude\backups'
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Copy-Item $skillDst (Join-Path $backupDir "codex-skill-$stamp") -Recurse
    Remove-Item $skillDst -Recurse -Force
}
New-Item -ItemType Directory -Path $skillDst -Force | Out-Null
Copy-Item (Join-Path $here 'skill\*') $skillDst -Recurse
Ok "skill installed in $skillDst"

# 5. Shared working agreement --------------------------------------------
Step 'Adding the shared working agreement'
$rules = (Get-Content -Raw -Encoding UTF8 (Join-Path $here 'shared-rules.md')).Trim()
Set-SharedBlock (Join-Path $env:USERPROFILE '.claude\CLAUDE.md') $rules
Set-SharedBlock (Join-Path $env:USERPROFILE '.codex\AGENTS.md') $rules
Ok 'added to ~\.claude\CLAUDE.md and ~\.codex\AGENTS.md (old copies kept as .bak-*)'

# 6. Health test ---------------------------------------------------------
if (-not $SkipTest) {
    Step 'Testing the link (needs a real, non-empty answer)'
    $ask = Join-Path $skillDst 'ask-codex.ps1'
    $answer = & $ask -Dir $env:USERPROFILE 'Reply with exactly: CODEX_LINK_OK'
    if ("$answer" -match 'CODEX_LINK_OK') { Ok 'Codex answered' } else { Warn "Codex did not answer correctly: $answer" }

    if (Get-Command claude -ErrorAction SilentlyContinue) {
        $reply = claude -p 'Reply with exactly: CLAUDE_LINK_OK' 2>&1
        if ("$reply" -match 'CLAUDE_LINK_OK') { Ok 'Claude Code answered' } else { Warn "Claude Code did not answer correctly: $reply" }
    }
}

# Summary ----------------------------------------------------------------
Write-Host ''
if ($problems.Count -eq 0) {
    Write-Host 'DONE: Claude Code and Codex are connected.' -ForegroundColor Green
    Write-Host 'In Claude Code, try: "Ask Codex for a second opinion on <task>".'
} else {
    Write-Host 'Finished with items to fix:' -ForegroundColor Yellow
    $problems | ForEach-Object { Write-Host "  - $_" }
    exit 2
}
