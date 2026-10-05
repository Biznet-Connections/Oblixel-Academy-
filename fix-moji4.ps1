$files = @(
  "C:\Users\Admin\Documents\Oblixel-Academy-\frontend\certificate-generator.html",
  "C:\Users\Admin\Documents\Oblixel-Academy-\frontend\verify.html"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Mojibake byte sequences to FIND  →  clean UTF-8 emoji bytes to REPLACE with
# The mojibake is stored as Unicode codepoints; get their UTF-8 byte forms.
function ToBytes { param($s) ,([System.Text.Encoding]::UTF8.GetBytes($s)) }

# Mojibake strings (as Unicode codepoints - safe, no smart-quote issues)
$mGrad  = [string]([char]0x00F0 + [char]0x0178 + [char]0x017D + [char]0x201C)   # ðŸŽ“
$mChart = [string]([char]0x00F0 + [char]0x0178 + [char]0x201C + [char]0x0160)   # ðŸ“Š
$mCal   = [string]([char]0x00F0 + [char]0x0178 + [char]0x201C + [char]0x2026)   # ðŸ“…
$mKey   = [string]([char]0x00F0 + [char]0x0178 + [char]0x201D + [char]0x2018)   # ðŸ”‘
$mDL    = [string]([char]0x00F0 + [char]0x0178 + [char]0x201C + [char]0x00A5)   # ðŸ“¥
$mParty = [string]([char]0x00F0 + [char]0x0178 + [char]0x017D + [char]0x2030)   # ðŸŽ‰
$mMedal = [string]([char]0x00F0 + [char]0x0178 + [char]0x2026)                  # ðŸ…
$mGreen = [string]([char]0x00F0 + [char]0x0178 + [char]0x0178 + [char]0x00A2)   # ðŸŸ¢
$mWarn  = [string]([char]0x00E2 + [char]0x0161 + [char]0x00A0 + [char]0x00EF + [char]0x00B8)  # âšï¸
$mWarn2 = [string]([char]0x00E2 + [char]0x0161 + [char]0x00A0)                  # âš

# Clean emojis
$eGrad  = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x1F393)))
$eChart = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x1F4CA)))
$eCal   = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x1F4C5)))
$eKey   = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x1F511)))
$eDL    = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x1F4E5)))
$eParty = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x1F389)))
$eMedal = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x1F3C5)))
$eGreen = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x1F7E2)))
$eWarn  = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes([char]::ConvertFromUtf32(0x26A0) + [char]0xFE0F))

# Longest matches first (avoid partial matches)
$rules = @(
  @{ Old = $mWarn;  New = $eWarn }
  @{ Old = $mGrad;  New = $eGrad }
  @{ Old = $mChart; New = $eChart }
  @{ Old = $mCal;   New = $eCal }
  @{ Old = $mKey;   New = $eKey }
  @{ Old = $mDL;    New = $eDL }
  @{ Old = $mParty; New = $eParty }
  @{ Old = $mMedal; New = $eMedal }
  @{ Old = $mGreen; New = $eGreen }
  @{ Old = $mWarn2; New = ($eWarn + " ") }
)

foreach ($f in $files) {
  if (!(Test-Path $f)) { Write-Host "SKIP $f"; continue }

  # Read raw bytes, decode as UTF-8 (file is UTF-8), get string
  $bytes = [System.IO.File]::ReadAllBytes($f)
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  $orig = $text

  foreach ($r in $rules) {
    $text = $text.Replace($r.Old, $r.New)
  }

  if ($text -ne $orig) {
    Copy-Item $f "$f.bak.bytefix2-$timestamp" -Force
    [System.IO.File]::WriteAllText($f, $text, [System.Text.UTF8Encoding]::new($false))
    Write-Host "FIXED  $(Split-Path $f -Leaf)" -ForegroundColor Green
  } else {
    Write-Host "clean  $(Split-Path $f -Leaf)" -ForegroundColor DarkGray
  }
}

# Verify by reading back raw bytes and checking for U+1F393 surrogate pair (D83C DF93)
Write-Host ""
Write-Host "=== VERIFY (byte-level) ===" -ForegroundColor Cyan
foreach ($f in $files) {
  if (!(Test-Path $f)) { continue }
  $bytes = [System.IO.File]::ReadAllBytes($f)
  $hex = ($bytes | ForEach-Object { "{0:X2}" -f $_ }) -join ""
  # UTF-8 for 🎓 is F0 9F 8E 93
  $hasGrad = $hex -match "F09F8E93"
  $hasChart = $hex -match "F09F93 8A".Replace(" ", "")
  $hasParty = $hex -match "F09F8E89"
  Write-Host "  $(Split-Path $f -Leaf): grad=$hasGrad chart=$hasChart party=$hasParty"
}
