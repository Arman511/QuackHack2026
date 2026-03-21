$ErrorActionPreference = "Stop"

function Test-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (Test-Command -Name "make") {
    Write-Host "[pre-commit] Running make format..."
    make format
}
else {
    Write-Host "[pre-commit] 'make' not found. Running formatter fallback..."

    if (Test-Command -Name "uvx") {
        uvx black .
    }
    elseif (Test-Command -Name "black") {
        black .
    }
    else {
        Write-Error "[pre-commit] ERROR: neither 'uvx' nor 'black' is available."
        exit 1
    }

    if (Test-Command -Name "pnpm") {
        pnpm dlx prettier --write .
    }
    else {
        Write-Host "[pre-commit] pnpm not found; skipping Prettier format"
    }
}

Write-Host "[pre-commit] Restaging tracked formatting changes..."
git add -u

Write-Host "[pre-commit] format complete."
