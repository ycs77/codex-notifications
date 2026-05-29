param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("notification", "stop")]
    [string] $Name
)

$audioPath = Join-Path $PSScriptRoot "..\audios\$Name.wav"

if (-not (Test-Path -LiteralPath $audioPath)) {
    Write-Error "Audio file not found: $audioPath"
    exit 1
}

$resolvedPath = (Resolve-Path -LiteralPath $audioPath).ProviderPath
$player = [System.Media.SoundPlayer]::new($resolvedPath)
$player.PlaySync()
