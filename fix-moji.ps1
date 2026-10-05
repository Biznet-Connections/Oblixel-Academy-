$files = @(
  "C:\Users\Admin\Documents\Oblixel-Academy-\frontend\certificate-generator.html",
  "C:\Users\Admin\Documents\Oblixel-Academy-\frontend\verify.html",
  "C:\Users\Admin\Documents\Oblixel-Academy-\backend\routes\ai.js"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$total = 0

Write-Host "=== FIXING ===" -ForegroundColor Cyan

foreach ($f in $files) {
  if (!(Test-Path $f)) { Write-Host "SKIP (missing) $f"; continue }
  
  $bytes = [System.IO.File]::ReadAllBytes($f)
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  $orig = $text

  $text = $text.Replace("ðŸŽ“", "🎓")
  $text = $text.Replace("ðŸ“Š", "📊")
  $text = $text.Replace("ðŸ“…", "📅")
  $text = $text.Replace("ðŸ”‘", "🔑")
  $text = $text.Replace("ðŸ“¥", "📥")
  $text = $text.Replace("ðŸŽ‰", "🎉")
  $text = $text.Replace("ðŸ…", "🏅")
  $text = $text.Replace("ðŸŸ¢", "🟢")
  $text = $text.Replace("âš ï¸", "⚠️")
  $text = $text.Replace("â°", "⏰")
  $text = $text.Replace("ðŸ“‹", "📋")
  $text = $text.Replace("ðŸ“ž", "📞")

  if ($text -ne $orig) {
    Copy-Item $f "$f.bak.final-$timestamp" -Force
    [System.IO.File]::WriteAllText($f, $text, [System.Text.UTF8Encoding]::new($false))
    Write-Host "FIXED  $(Split-Path $f -Leaf)" -ForegroundColor Green
    $total++
  } else {
    Write-Host "clean  $(Split-Path $f -Leaf)" -ForegroundColor DarkGray
  }
}

Write-Host "`n=== RESCAN ===" -ForegroundColor Cyan
$remaining = 0
foreach ($f in $files) {
  if (!(Test-Path $f)) { continue }
  $lines = Get-Content $f
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '[\u0080-\u00FF]{2,}') {
      Write-Host "  $(Split-Path $f -Leaf):$($i+1)  $($lines[$i].Trim().Substring(0, [Math]::Min(70, $lines[$i].Trim().Length)))" -ForegroundColor Yellow
      $remaining++
    }
  }
}

Write-Host ""
if ($remaining -eq 0) {
  Write-Host "ALL CLEAN - $total files fixed" -ForegroundColor Green
} else {
  Write-Host "$remaining lines still mangled" -ForegroundColor Yellow
}
