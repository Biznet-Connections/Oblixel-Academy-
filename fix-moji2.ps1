$files = @(
  "C:\Users\Admin\Documents\Oblixel-Academy-\frontend\certificate-generator.html",
  "C:\Users\Admin\Documents\Oblixel-Academy-\frontend\verify.html",
  "C:\Users\Admin\Documents\Oblixel-Academy-\backend\routes\ai.js"
)

# Build mangled strings from char codes (mojibake, but as safe codes)
function M { param([int[]]$codes) -join ($codes | ForEach-Object { [char]$_ }) }

# Emoji built from codepoints
$E = @{
  grad   = [char]::ConvertFromUtf32(0x1F393)   # 🎓
  chart  = [char]::ConvertFromUtf32(0x1F4CA)   # 📊
  cal    = [char]::ConvertFromUtf32(0x1F4C5)   # 📅
  key    = [char]::ConvertFromUtf32(0x1F511)   # 🔑
  dl     = [char]::ConvertFromUtf32(0x1F4E5)   # 📥
  party  = [char]::ConvertFromUtf32(0x1F389)   # 🎉
  medal  = [char]::ConvertFromUtf32(0x1F3C5)   # 🏅
  green  = [char]::ConvertFromUtf32(0x1F7E2)   # 🟢
  warn   = [char]::ConvertFromUtf32(0x26A0) + [char]0xFE0F  # ⚠️
  clock  = [char]::ConvertFromUtf32(0x23F0)    # ⏰
  clip   = [char]::ConvertFromUtf32(0x1F4CB)   # 📋
  phone  = [char]::ConvertFromUtf32(0x1F4DE)   # 📞
}

# Mangled sequences built from UTF-8 mojibake char codes
# Each mangled pattern = the 2 chars PowerShell would show when UTF-8 bytes were re-read as Latin-1
$rules = @(
  @{ Old = (M @(0x00F0,0x0178,0x017D,0x201C)); New = $E.grad },   # 🎓
  @{ Old = (M @(0x00F0,0x0178,0x201C,0x0160)); New = $E.chart },  # 📊
  @{ Old = (M @(0x00F0,0x0178,0x201C,0x2026)); New = $E.cal },    # 📅
  @{ Old = (M @(0x00F0,0x0178,0x201D,0x2018)); New = $E.key },    # 🔑
  @{ Old = (M @(0x00F0,0x0178,0x201C,0x00A5)); New = $E.dl },     # 📥
  @{ Old = (M @(0x00F0,0x0178,0x017D,0x2030)); New = $E.party },  # 🎉
  @{ Old = (M @(0x00F0,0x0178,0x2026,0x0020)); New = ($E.medal + " ") }, # 🏅 
  @{ Old = (M @(0x00F0,0x0178,0x2026));        New = $E.medal },  # 🏅
  @{ Old = (M @(0x00F0,0x0178,0x0178,0x00A2)); New = $E.green },  # 🟢
  @{ Old = (M @(0x00E2,0x0161,0x00A0,0x00EF,0x00B8)); New = $E.warn }, # ⚠️
  @{ Old = (M @(0x00E2,0x0161,0x00A0));        New = ($E.warn + " ") }, # ⚠️ 
  @{ Old = (M @(0x00E2,0x00B0));               New = ($E.clock + " ") }, # ⏰ 
  @{ Old = (M @(0x00E2,0x00B0,0x0020));        New = ($E.clock + " ") }, # ⏰ 
  @{ Old = (M @(0x00F0,0x0178,0x201C,0x2039)); New = $E.clip },   # 📋
  @{ Old = (M @(0x00F0,0x0178,0x201C,0x017E)); New = $E.phone }   # 📞
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$total = 0

Write-Host "=== FIXING ===" -ForegroundColor Cyan

foreach ($f in $files) {
  if (!(Test-Path $f)) { Write-Host "SKIP (missing) $f"; continue }

  $bytes = [System.IO.File]::ReadAllBytes($f)
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  $orig = $text

  foreach ($r in $rules) {
    $text = $text.Replace($r.Old, $r.New)
  }

  if ($text -ne $orig) {
    Copy-Item $f "$f.bak.final-$timestamp" -Force
    [System.IO.File]::WriteAllText($f, $text, [System.Text.UTF8Encoding]::new($false))
    Write-Host "FIXED  $(Split-Path $f -Leaf)" -ForegroundColor Green
    $total++
  } else {
    Write-Host "clean  $(Split-Path $f -Leaf)" -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host "=== RESCAN ===" -ForegroundColor Cyan
$remaining = 0
foreach ($f in $files) {
  if (!(Test-Path $f)) { continue }
  $lines = Get-Content $f
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "[\u0080-\u00FF]{2,}") {
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
