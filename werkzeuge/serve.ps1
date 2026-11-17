# Kleiner Webserver zum lokalen Testen: http://localhost:8765/
#   /            Vorschau mit Beispieldaten (vorschau\test.html)
#   /docs/...    die Website-Dateien
#   POST /?n=name  speichert den Inhalt als werkzeuge\upload-name (zum Prüfen von Exporten)
$root = Split-Path $PSScriptRoot -Parent
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:8765/")
$l.Start()
$types = @{ ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".json" = "application/json"; ".webmanifest" = "application/manifest+json"; ".png" = "image/png"; ".txt" = "text/plain; charset=utf-8"; ".css" = "text/css" }
while ($l.IsListening) {
  $c = $l.GetContext()
  try {
    if ($c.Request.HttpMethod -eq "POST") {
      $name = $c.Request.QueryString["n"]; $ms = New-Object IO.MemoryStream; $c.Request.InputStream.CopyTo($ms)
      [IO.File]::WriteAllBytes("$root\werkzeuge\upload-$name", $ms.ToArray()); $c.Response.StatusCode = 204; $c.Response.Close(); continue
    }
    $p = $c.Request.Url.AbsolutePath
    $file = if ($p -eq "/") { "$root\vorschau\test.html" } else { Join-Path $root ($p.TrimStart("/").Replace("/", "\")) }
    if ((Test-Path $file -PathType Container)) { $file = Join-Path $file "index.html" }
    if (Test-Path $file -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($file); $ext = [IO.Path]::GetExtension($file)
      $c.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" })
      $c.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $c.Response.StatusCode = 404 }
  } catch { $c.Response.StatusCode = 500 }
  $c.Response.Close()
}
