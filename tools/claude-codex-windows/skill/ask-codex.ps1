# Send a prompt to the Codex CLI and print only its final answer.
#
# Usage:
#   ask-codex.ps1 "prompt"
#   ask-codex.ps1 -Write "prompt"            # Codex may edit files
#   ask-codex.ps1 -Model gpt-5 "prompt"
#   git diff | ask-codex.ps1 "Review this diff"
param(
    [Parameter(Mandatory = $true, Position = 0)][string]$Prompt,
    [switch]$Write,
    [string]$Model,
    [string]$Dir = (Get-Location).Path,
    [Parameter(ValueFromPipeline = $true)][string]$PipedLine
)

begin {
    # 'Continue', not 'Stop': in Windows PowerShell 5.1 redirecting a native
    # command's stderr under 'Stop' turns Codex's progress log into a fatal error.
    $ErrorActionPreference = 'Continue'
    $piped = New-Object System.Collections.Generic.List[string]
}

process {
    if ($null -ne $PipedLine) { $piped.Add($PipedLine) }
}

end {
    if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
        Write-Host 'codex is not installed. Run setup.ps1 first.' -ForegroundColor Red
        exit 1
    }

    $pipedText = $piped -join "`n"
    if (-not [string]::IsNullOrWhiteSpace($pipedText)) {
        $Prompt = $Prompt + "`n`n<stdin>`n" + $pipedText + "`n</stdin>"
    }

    $sandbox = if ($Write) { 'workspace-write' } else { 'read-only' }
    $out = [System.IO.Path]::GetTempFileName()
    $log = [System.IO.Path]::GetTempFileName()

    try {
        # Pass the prompt on stdin ("-") so quotes, newlines and Persian text
        # survive; Windows PowerShell 5.1 mangles them as native arguments.
        $codexArgs = @('exec', '--skip-git-repo-check', '--sandbox', $sandbox, '-C', $Dir, '-o', $out)
        if ($Model) { $codexArgs += @('-m', $Model) }
        $codexArgs += '-'

        $utf8 = New-Object System.Text.UTF8Encoding $false
        $OutputEncoding = $utf8
        [Console]::OutputEncoding = $utf8

        $Prompt | & codex @codexArgs 2> $log | Out-Null
        $status = $LASTEXITCODE

        $answer = if (Test-Path $out) { Get-Content -Raw -Encoding UTF8 $out } else { '' }
        if ($status -ne 0 -or [string]::IsNullOrWhiteSpace($answer)) {
            Write-Host "codex exec failed (exit $status):" -ForegroundColor Red
            Get-Content $log -Tail 20 | Write-Host
            if ($status -eq 0) { exit 1 } else { exit $status }
        }
        $answer
    }
    finally {
        Remove-Item $out, $log -ErrorAction SilentlyContinue
    }
}
