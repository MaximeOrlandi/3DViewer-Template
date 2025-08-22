Param(
    [int]$Port = 8000,
    [string]$Root = (Convert-Path .)
)

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
try {
	$listener.Prefixes.Clear()
	$listener.Prefixes.Add($prefix)
	$listener.Start()
	Write-Host "Serving $Root on $prefix (Press Ctrl+C to stop)"
} catch {
	Write-Error $_
	if ($_.Exception -is [System.Net.HttpListenerException] -and $_.Exception.ErrorCode -eq 5) {
		Write-Host "Access denied. Run PowerShell as Administrator or reserve the URL:"
		Write-Host "  netsh http add urlacl url=$prefix user=$env:UserName"
	} else {
		try {
			$tcp = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
			if ($tcp) {
				$pidList = ($tcp | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique) -join ', '
				Write-Host "Port $Port is already in use by PID(s): $pidList"
			}
		} catch {}
	}
	return
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
        if ([string]::IsNullOrWhiteSpace($path)) { $path = "indexes/index.html" }
        $full = Join-Path $Root $path
        if (Test-Path $full -PathType Container) { $full = Join-Path $full "index.html" }

        # Handle POST save for materials JSON
        if ($req.HttpMethod -eq 'POST' -and $path -eq 'materials/materials.json') {
            try {
                $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
                $content = $reader.ReadToEnd()
                $reader.Close()

                # Validate JSON
                $null = $content | ConvertFrom-Json

                # Write file
                $dir = Split-Path $full -Parent
                if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
                [System.IO.File]::WriteAllText($full, $content, [System.Text.Encoding]::UTF8)

                $res.StatusCode = 200
                $res.ContentType = "text/plain"
                $res.AddHeader('Cache-Control','no-store')
                $msg = [System.Text.Encoding]::UTF8.GetBytes("OK")
                $res.ContentLength64 = $msg.Length
                $res.OutputStream.Write($msg, 0, $msg.Length)
                $res.OutputStream.Close()
                continue
            } catch {
                $res.StatusCode = 400
                $res.ContentType = "text/plain"
                $res.AddHeader('Cache-Control','no-store')
                $err = [System.Text.Encoding]::UTF8.GetBytes("Invalid JSON or write error")
                $res.ContentLength64 = $err.Length
                $res.OutputStream.Write($err, 0, $err.Length)
                $res.OutputStream.Close()
                continue
            }
        }

        # Handle POST upload for texture files under materials/textures
        if ($req.HttpMethod -eq 'POST' -and $path -like 'materials/textures/*') {
            try {
                $dir = Split-Path $full -Parent
                if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
                $fs = [System.IO.File]::Open($full, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
                $req.InputStream.CopyTo($fs)
                $fs.Close()

                $res.StatusCode = 200
                $res.ContentType = "text/plain"
                $res.AddHeader('Cache-Control','no-store')
                $msg = [System.Text.Encoding]::UTF8.GetBytes("UPLOADED")
                $res.ContentLength64 = $msg.Length
                $res.OutputStream.Write($msg, 0, $msg.Length)
                $res.OutputStream.Close()
                continue
            } catch {
                $res.StatusCode = 500
                $res.ContentType = "text/plain"
                $res.AddHeader('Cache-Control','no-store')
                $err = [System.Text.Encoding]::UTF8.GetBytes("Upload failed")
                $res.ContentLength64 = $err.Length
                $res.OutputStream.Write($err, 0, $err.Length)
                $res.OutputStream.Close()
                continue
            }
        }

        # Handle POST save for camera JSON
        if ($req.HttpMethod -eq 'POST' -and $path -eq 'studio/camera.json') {
            try {
                $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
                $content = $reader.ReadToEnd()
                $reader.Close()

                # Validate JSON
                $null = $content | ConvertFrom-Json

                # Write file
                $dir = Split-Path $full -Parent
                if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
                [System.IO.File]::WriteAllText($full, $content, [System.Text.Encoding]::UTF8)

                $res.StatusCode = 200
                $res.ContentType = "text/plain"
                $res.AddHeader('Cache-Control','no-store')
                $msg = [System.Text.Encoding]::UTF8.GetBytes("OK")
                $res.ContentLength64 = $msg.Length
                $res.OutputStream.Write($msg, 0, $msg.Length)
                $res.OutputStream.Close()
                continue
            } catch {
                $res.StatusCode = 400
                $res.ContentType = "text/plain"
                $res.AddHeader('Cache-Control','no-store')
                $err = [System.Text.Encoding]::UTF8.GetBytes("Invalid JSON or write error")
                $res.ContentLength64 = $err.Length
                $res.OutputStream.Write($err, 0, $err.Length)
                $res.OutputStream.Close()
                continue
            }
        }

        # Handle GET list of textures as JSON
        if ($req.HttpMethod -eq 'GET' -and $path -eq 'materials/textures/index.json') {
            $dir = Join-Path $Root 'materials/textures'
            $exts = @('.png', '.jpg', '.jpeg', '.webp')
            $files = @()
            if (Test-Path $dir) {
                $files = Get-ChildItem -Path $dir -File | Where-Object { $exts -contains ([System.IO.Path]::GetExtension($_.Name).ToLower()) } | Select-Object -ExpandProperty Name
            }
            $json = $files | ConvertTo-Json
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.StatusCode = 200
            $res.ContentType = "application/json"
            $res.AddHeader('Cache-Control','no-store')
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.OutputStream.Close()
            continue
        }

        if (Test-Path $full -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($full)
            switch ([System.IO.Path]::GetExtension($full).ToLower()) {
                ".html" { $res.ContentType = "text/html" }
                ".css"  { $res.ContentType = "text/css" }
                ".js"   { $res.ContentType = "application/javascript" }
                ".json" { $res.ContentType = "application/json" }
                ".glb"  { $res.ContentType = "model/gltf-binary" }
                ".hdr"  { $res.ContentType = "application/octet-stream" }
                ".png"  { $res.ContentType = "image/png" }
                ".webp" { $res.ContentType = "image/webp" }
                ".jpg"  { $res.ContentType = "image/jpeg" }
                ".jpeg" { $res.ContentType = "image/jpeg" }
                Default  { $res.ContentType = "application/octet-stream" }
            }
            $res.AddHeader('Cache-Control','no-store')
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found")
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
        $res.OutputStream.Close()
    }
}
finally {
    $listener.Stop()
    $listener.Close()
} 