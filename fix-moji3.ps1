$files = @(
  "C:\Users\Admin\Documents\Oblixel-Academy-\frontend\certificate-generator.html",
  "C:\Users\Admin\Documents\Oblixel-Academy-\frontend\verify.html"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Build "mangled" patterns as actual UTF-8 bytes.
# When HTML is served, mojibake appears as: bytes below
# We'll match those byte sequences and swap in clean UTF-8 for the real emoji.

# Map: [byte array to find] => [byte array of replacement UTF-8 emoji]
$byteRules = @()

function AddRule {
  param($findStr, $replaceEmoji)
  $findBytes = [System.Text.Encoding]::UTF8.GetBytes($findStr)
  $replaceBytes = [System.Text.Encoding]::UTF8.GetBytes($replaceEmoji)
  $script:byteRules += @{ Find = $findBytes; Replace = $replaceBytes }
}

# These are the strings AS THEY APPEAR in the file (whatever encoding they're in)
# We use raw byte sequences to be encoding-agnostic
$findA = [char]0x00F0 + [char]0x0178 + [char]0x017D + [char]0x201C  # ðŸŽ“
$findB = [char]0x00F0 + [char]0x0178 + [char]0x201C + [char]0x0160  # ðŸ“Š
$findC = [char]0x00F0 + [char]0x0178 + [char]0x201C + [char]0x2026  # ðŸ“…
$findD = [char]0x00F0 + [char]0x0178 + [char]0x201D + [char]0x2018  # ðŸ”‘
$findE = [char]0x00F0 + [char]0x0178 + [char]0x201C + [char]0x00A5  # ðŸ“¥
$findF = [char]0x00F0 + [char]0x0178 + [char]0x017D + [char]0x2030  # ðŸŽ‰
$findG = [char]0x00F0 + [char]0x0178 + [char]0x2026                  # ðŸ…
$findH = [char]0x00F0 + [char]0x0178 + [char]0x0178 + [char]0x00A2  # ðŸŸ¢
$findI = [char]0x00E2 + [char]0x0161 + [char]0x00A0                  # âš
$findJ = [char]0x00E2 + [char]0x0161 + [char]0x00A0 + [char]0x00EF + [char]0x00B8  # âšï¸

$emojiGrad  = [char]::ConvertFromUtf32(0x1F393)  # 🎓
$emojiChart = [char]::ConvertFromUtf32(0x1F4CA)  # 📊
$emojiCal   = [char]::ConvertFromUtf32(0x1F4C5)  # 📅
$emojiKey   = [char]::ConvertFromUtf32(0x1F511)  # 🔑
$emojiDL    = [char]::ConvertFromUtf32(0x1F4E5)  # 📥
$emojiParty = [char]::ConvertFromUtf32(0x1F389)  # 🎉
$emojiMedal = [char]::ConvertFromUtf32(0x1F3C5)  # 🏅
$emojiGreen = [char]::ConvertFromUtf32(0x1F7E2)  # 🟢
$emojiWarn  = [char]::ConvertFromUtf32(0x26A0) + [char]0xFE0F  # ⚠️

$rules = @(
  @{ Old = $findA; New = $emojiGrad },
  @{ Old = $findB; New = $emojiChart },
  @{ Old = $findC; New = $emojiCal },
  @{ Old = $findD; New = $emojiKey },
  @{ Old = $findE; New = $emojiDL },
  @{ Old = $findF; New = $emojiParty },
  @{ Old = ($findG + " "); New = ($emojiMedal + " ") },
  @{ Old = $findG; New = $emojiMedal },
  @{ Old = $findH; New = $emojiGreen },
  @{ Old = $findJ; New = $emojiWarn },
  @{ Old = $findI; New = ($emojiWarn + " ") }
)

foreach ($f in $files) {
  if (!(Test-Path $f)) { Write-Host "SKIP $f" -ForegroundColor Yellow; continue }

  $bytes = [System.IO.File]::ReadAllBytes($f)
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  $orig = $text

  foreach ($r in $rules) {
    $text = $text.Replace($r.Old, $r.New)
  }

  if ($text -ne $orig) {
    Copy-Item $f "$f.bak.bytefix-$timestamp" -Force
    [System.IO.File]::WriteAllText($f, $text, [System.Text.UTF8Encoding]::new($false))
    Write-Host "FIXED  $(Split-Path $f -Leaf)" -ForegroundColor Green
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
if ($remaining -eq 0) { Write-Host "ALL CLEAN" -ForegroundColor Green }
else { Write-Host "$remaining lines still mangled" -ForegroundColor Yellow }
