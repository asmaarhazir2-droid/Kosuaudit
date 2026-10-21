$root = Split-Path -Parent $PSScriptRoot
$allowedFiles = @{
  "index.html" = "text/html; charset=utf-8"
  "app.js" = "text/javascript; charset=utf-8"
  "bootstrap.js" = "text/javascript; charset=utf-8"
  "firebase-config.js" = "text/javascript; charset=utf-8"
  "styles.css" = "text/css; charset=utf-8"
  "opex_logo.png" = "image/png"
}
$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:8080/")
$listener.Start()
Write-Host "Serving Audit at http://127.0.0.1:8080"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($path)) {
    $path = "index.html"
  }

  if ($allowedFiles.ContainsKey($path)) {
    $file = Join-Path $root $path
    $bytes = [IO.File]::ReadAllBytes($file)
    $context.Response.StatusCode = 200
    $context.Response.ContentType = $allowedFiles[$path]
  } else {
    $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
    $context.Response.StatusCode = 404
    $context.Response.ContentType = "text/plain; charset=utf-8"
  }

  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}
