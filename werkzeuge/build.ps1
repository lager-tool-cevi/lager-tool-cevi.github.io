# Baut aus «quelle» die fertigen Dateien:
#   docs\index.html        Website auf GitHub Pages (echte Daten über die Google-Schnittstelle)
#   docs\test\index.html   Testversion (gleiche Daten, mit Hinweis «Testversion»)
#   vorschau\lager-vorschau.html   Vorschau mit Beispieldaten (für claude.ai)
#   google-version\Seed.gs Startdaten für ein ganz neues Google-Projekt (nicht auf GitHub)
param([switch]$OhneVorschau)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$enc = New-Object Text.UTF8Encoding $false
$q = "$root\quelle"
$read = { param($f) [IO.File]::ReadAllText("$q\$f", [Text.Encoding]::UTF8) }

$head = (& $read "1-kopf.html").Replace("`r`n", "`n").Replace("<title>PfiLa 2027 Lager-Tool</title>", "<title>Lager-Tool</title>")
$css = (& $read "2-zusatz.css").Replace("`r`n", "`n")
$extraCss = (Get-ChildItem "$q\7*.css" | Sort-Object Name | ForEach-Object { & $read $_.Name }) -join "`n"
if ($extraCss) { $css = $css.Replace("</style>", $extraCss + "`n</style>") }
$body = & $read "3-body.html"
$store = & $read "4-store.js"
$app = & $read "5-app.js"
$extra = (Get-ChildItem "$q\6*.js" | Sort-Object Name | ForEach-Object { & $read $_.Name }) -join "`n"
$mark = "  // ---------- boot ----------"
if ($app.IndexOf($mark) -lt 0) { throw "boot fehlt" }
$app = $app.Replace($mark, $extra + "`n" + $mark)
if ($app.Contains("</script")) { throw "Programm enthält </script" }
$seedV = & $read "seed-vorschau.json"
$version = Get-Date -Format "yyyy-MM-dd HH:mm"
$api = ""
if (Test-Path "$root\werkzeuge\api-url.txt") { $api = ([IO.File]::ReadAllText("$root\werkzeuge\api-url.txt")).Trim() }

# ---------- Website ----------
function Seite([bool]$test, [string]$pfad) {
  $cfg = @{ api = $script:api; test = $test; version = $script:version } | ConvertTo-Json -Compress
  $links = "<link rel=`"manifest`" href=`"${pfad}manifest.webmanifest`">`n<meta name=`"theme-color`" content=`"#141a3d`">`n<link rel=`"icon`" type=`"image/png`" href=`"${pfad}icons/icon-192.png`">`n<link rel=`"apple-touch-icon`" href=`"${pfad}icons/icon-192.png`">`n<meta name=`"apple-mobile-web-app-capable`" content=`"yes`">`n<meta name=`"apple-mobile-web-app-title`" content=`"Lager-Tool`">`n"
  $hc = ($script:head + $script:css).Replace("</head>", $links + "</head>")
  if ($test) { $hc = $hc.Replace("<title>Lager-Tool</title>", "<title>Lager-Tool (Test)</title>") }
  return $hc + $script:body + "<script>window.LAGER_CONFIG = $cfg;</script>`n<script>`n" + $script:store + "</script>`n<script>`n" + $script:app + "</script>`n</body>`n</html>`n"
}
New-Item -ItemType Directory -Force "$root\docs\test" | Out-Null
[IO.File]::WriteAllText("$root\docs\index.html", (Seite $false ""), $enc)
[IO.File]::WriteAllText("$root\docs\test\index.html", (Seite $true "../"), $enc)
[IO.File]::WriteAllText("$root\docs\version.txt", $version, $enc)
# Service Worker bekommt die Version, damit nach einem Update die neue Seite geladen wird
$sw = [IO.File]::ReadAllText("$root\werkzeuge\sw.js", [Text.Encoding]::UTF8).Replace("__VERSION__", $version)
[IO.File]::WriteAllText("$root\docs\sw.js", $sw, $enc)

# ---------- Google: Startdaten (nur lokal) ----------
$seed = [regex]::Replace($seedV, '^\{(.*),"_secrets":\{[^{}]*(\{[^{}]*\})?[^{}]*\}\}$', '{$1}')
[IO.File]::WriteAllText("$root\google-version\Seed.gs", "/**`n * Startdaten für das Lager-Tool: PfiLa 2027 mit allen Aufgaben.`n * Nur für ein ganz neues Google-Projekt nötig. Wird beim allerersten «einrichten» in die Tabelle geschrieben.`n */`nconst SEED = " + $seed + ";`n", $enc)

# ---------- Vorschau mit Beispieldaten ----------
if (-not $OhneVorschau) {
  $prefix = "<!DOCTYPE html>`n<html lang=`"de`">`n<head>`n<base target=`"_top`">`n<meta charset=`"utf-8`">`n"
  if (-not $head.StartsWith($prefix)) { throw "Kopf hat nicht die erwartete Form" }
  $h = $head.Substring($prefix.Length).Replace("<title>Lager-Tool</title>", "<title>Lager-Tool</title>`n<meta name=`"claude:viewport-fit-sides`" content=`"cover`">")
  $c = $css.Replace("</style>`n</head>`n<body>", "</style>")
  if ($c -eq $css) { throw "CSS-Ende nicht gefunden" }
  $preview = $h + $c + $body + "<script>window.PREVIEW_SEED = " + $seedV + ";</script>`n<script>`n" + $store + "</script>`n<script>`n" + $app + "</script>`n"
  New-Item -ItemType Directory -Force "$root\vorschau" | Out-Null
  [IO.File]::WriteAllText("$root\vorschau\lager-vorschau.html", $preview, $enc)
  # zum lokalen Testen mit vollständigem Dokument
  $t = "<!doctype html><html><head><meta charset=`"utf-8`"><meta name=`"viewport`" content=`"width=device-width,initial-scale=1,viewport-fit=cover`"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>" + $preview + "</body></html>"
  [IO.File]::WriteAllText("$root\vorschau\test.html", $t, $enc)
}
"Gebaut ($version): Website " + (Get-Item "$root\docs\index.html").Length + " Bytes" + $(if ($api) { ", Schnittstelle gesetzt" } else { ", noch ohne Schnittstelle (api-url.txt fehlt)" })
