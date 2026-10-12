param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\dashboard\public\downloads\atlas-sentinel-mvp.zip")
)

$extensionRoot = Join-Path $PSScriptRoot "..\sentinel-extension"
$resolvedExtensionRoot = (Resolve-Path $extensionRoot).Path
$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutputPath

if (!(Test-Path -LiteralPath $resolvedExtensionRoot -PathType Container)) {
  throw "Sentinel extension source was not found."
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
if (Test-Path -LiteralPath $resolvedOutputPath) {
  Remove-Item -LiteralPath $resolvedOutputPath -Force
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("atlas-sentinel-" + [guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
  Get-ChildItem -LiteralPath $resolvedExtensionRoot -Recurse -File |
    Where-Object { $_.FullName -notmatch '[\\/]\.runtime[\\/]' } |
    ForEach-Object {
      $relative = $_.FullName.Substring($resolvedExtensionRoot.Length).TrimStart([char[]]@('\', '/'))
      $destination = Join-Path $temporaryRoot $relative
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
      Copy-Item -LiteralPath $_.FullName -Destination $destination
    }
  Compress-Archive -Path (Join-Path $temporaryRoot "*") -DestinationPath $resolvedOutputPath -CompressionLevel Optimal
} finally {
  if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedOutputPath)
try {
  $names = @($archive.Entries | ForEach-Object FullName)
  foreach ($required in @("manifest.json", "background.js", "popup.html", "popup.js", "popup.css", "assets/atlas-titan.png")) {
    if ($names -notcontains $required) { throw "Packaged Sentinel archive is missing $required." }
  }
} finally {
  if ($null -ne $archive) { $archive.Dispose() }
}

Write-Output "Packaged Sentinel: $resolvedOutputPath"
