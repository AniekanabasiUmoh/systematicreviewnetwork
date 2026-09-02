param(
  [string]$Archive = (Join-Path (Get-Location) 'cgi-bin.zip'),
  [string]$Output = (Join-Path (Get-Location) 'wordpress-export/phase0-media-manifest.json')
)

# Hashes only uploads in the ZIP. Nothing is extracted and no file content is
# copied to the repository. The output intentionally stores aggregate data and
# small duplicate samples, not private document contents.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sha = [System.Security.Cryptography.SHA256]::Create()
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Archive))
$items = [System.Collections.Generic.List[object]]::new()
try {
  foreach ($entry in $zip.Entries) {
    if ($entry.FullName -notmatch '^wp-content/uploads/' -or [string]::IsNullOrEmpty($entry.Name)) { continue }
    $ext = [IO.Path]::GetExtension($entry.Name).ToLowerInvariant()
    if ($ext -notin @('.png','.jpg','.jpeg','.webp','.gif','.svg','.pdf')) { continue }
    $stream = $entry.Open()
    try { $hash = ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose() }
    $base = [IO.Path]::GetFileNameWithoutExtension($entry.Name)
    $generated = $base -match '-\d+x\d+$' -or $base -match '-scaled$' -or $base -match '-rotated$'
    $year = if ($entry.FullName -match '/(20\d{2})/') { $Matches[1] } else { 'unknown' }
    $items.Add([pscustomobject]@{
      path = $entry.FullName
      extension = $ext.TrimStart('.')
      bytes = [int64]$entry.Length
      year = $year
      generatedVariant = [bool]$generated
      sha256 = $hash
    })
  }
}
finally {
  $zip.Dispose()
  $sha.Dispose()
}

$duplicateGroups = @($items | Group-Object sha256 | Where-Object Count -gt 1 | ForEach-Object {
  [pscustomobject]@{
    sha256 = $_.Name
    count = $_.Count
    bytes = ($_.Group | Select-Object -First 1).bytes
    samplePaths = @($_.Group | Select-Object -First 5 -ExpandProperty path)
  }
})

$manifest = [ordered]@{
  generatedAt = [DateTime]::UtcNow.ToString('o')
  source = [IO.Path]::GetFileName($Archive)
  scope = 'wp-content/uploads media and PDF entries only'
  entryCount = $items.Count
  totalBytes = ($items | Measure-Object bytes -Sum).Sum
  generatedVariantCount = @($items | Where-Object generatedVariant).Count
  originalCandidateCount = @($items | Where-Object { -not $_.generatedVariant }).Count
  extensionCounts = [ordered]@{}
  yearCounts = [ordered]@{}
  exactDuplicateGroupCount = $duplicateGroups.Count
  exactDuplicateEntryCount = ($duplicateGroups | Measure-Object count -Sum).Sum
  duplicateGroups = $duplicateGroups
}
foreach ($g in ($items | Group-Object extension | Sort-Object Name)) { $manifest.extensionCounts[$g.Name] = $g.Count }
foreach ($g in ($items | Group-Object year | Sort-Object Name)) { $manifest.yearCounts[$g.Name] = $g.Count }

$parent = Split-Path -Parent $Output
New-Item -ItemType Directory -Force -Path $parent | Out-Null
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $Output -Encoding utf8
Write-Output ("Wrote media manifest: {0} upload entries, {1} exact duplicate groups" -f $manifest.entryCount, $manifest.exactDuplicateGroupCount)
