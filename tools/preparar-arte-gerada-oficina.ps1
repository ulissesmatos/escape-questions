<#
  Converte arte gerada em alta resolução para as dimensões lógicas do Phaser.
  Também remove o xadrez claro que alguns geradores desenham como se fosse
  transparência nas bordas de placas-mãe.
#>
[CmdletBinding()]
param([string]$Pasta = (Join-Path $PSScriptRoot '..\public\images\oficina'))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$tamanhos = [ordered]@{
  'placa-atx' = @(240, 300); 'placa-matx' = @(240, 240); 'placa-matx-intel' = @(240, 240)
  'cpu-am4' = @(44, 44); 'cpu-am5' = @(44, 44); 'cpu-intel' = @(48, 40)
  'pasta' = @(52, 20); 'cooler-box' = @(72, 72); 'cooler-torre' = @(80, 80)
  'ram-ddr4' = @(14, 96); 'ram-ddr5' = @(14, 96); 'ssd-m2' = @(60, 16); 'ssd-sata' = @(48, 32); 'hd' = @(52, 36)
  'gpu-1' = @(116, 40); 'gpu-2' = @(136, 42); 'gpu-3' = @(164, 46); 'fonte' = @(88, 56)
  'gabinete-mini' = @(270, 320); 'gabinete-mid' = @(300, 350)
  'cliente-cida' = @(56, 56); 'cliente-ricardo' = @(56, 56); 'cliente-enzo' = @(56, 56); 'cliente-marina' = @(56, 56)
  'moeda' = @(18, 18); 'estrela' = @(28, 28); 'estrela-vazia' = @(28, 28)
}

function RemoverFundoFalso([System.Drawing.Bitmap]$imagem) {
  $largura = $imagem.Width; $altura = $imagem.Height
  $visitado = New-Object 'bool[,]' $largura, $altura
  $fila = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
  for ($x = 0; $x -lt $largura; $x++) { $fila.Enqueue([System.Drawing.Point]::new($x, 0)); $fila.Enqueue([System.Drawing.Point]::new($x, $altura - 1)) }
  for ($y = 1; $y -lt ($altura - 1); $y++) { $fila.Enqueue([System.Drawing.Point]::new(0, $y)); $fila.Enqueue([System.Drawing.Point]::new($largura - 1, $y)) }
  while ($fila.Count) {
    $p = $fila.Dequeue()
    if ($p.X -lt 0 -or $p.Y -lt 0 -or $p.X -ge $largura -or $p.Y -ge $altura -or $visitado[$p.X, $p.Y]) { continue }
    $visitado[$p.X, $p.Y] = $true; $cor = $imagem.GetPixel($p.X, $p.Y)
    # O fundo falso é um xadrez quase branco/cinza, sem saturação.
    if ($cor.A -eq 0 -or ($cor.R -ge 205 -and $cor.G -ge 205 -and $cor.B -ge 205 -and ([math]::Max($cor.R, [math]::Max($cor.G, $cor.B)) - [math]::Min($cor.R, [math]::Min($cor.G, $cor.B))) -le 18)) {
      $imagem.SetPixel($p.X, $p.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      $fila.Enqueue([System.Drawing.Point]::new($p.X + 1, $p.Y)); $fila.Enqueue([System.Drawing.Point]::new($p.X - 1, $p.Y))
      $fila.Enqueue([System.Drawing.Point]::new($p.X, $p.Y + 1)); $fila.Enqueue([System.Drawing.Point]::new($p.X, $p.Y - 1))
    }
  }
}

function FixarTransparencia([System.Drawing.Bitmap]$imagem) {
  for ($y = 0; $y -lt $imagem.Height; $y++) {
    for ($x = 0; $x -lt $imagem.Width; $x++) {
      $cor = $imagem.GetPixel($x, $y)
      # Semialfa vindo da prévia xadrez não é borda de sprite: torna a
      # transparência binária e deixa a silhueta nítida no canvas do Phaser.
      if ($cor.A -lt 245) { $imagem.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0)) }
    }
  }
}

foreach ($nome in $tamanhos.Keys) {
  $arquivo = Join-Path $Pasta "$nome.png"
  $fonte = [System.Drawing.Bitmap]::FromFile($arquivo)
  try {
    if ($nome -in @('placa-atx', 'placa-matx')) { RemoverFundoFalso $fonte }
    $largura = $tamanhos[$nome][0]; $altura = $tamanhos[$nome][1]
    $final = New-Object System.Drawing.Bitmap $largura, $altura, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($final)
    try {
      $g.Clear([System.Drawing.Color]::Transparent)
      $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.DrawImage($fonte, (New-Object System.Drawing.Rectangle 0, 0, $largura, $altura), 0, 0, $fonte.Width, $fonte.Height, [System.Drawing.GraphicsUnit]::Pixel)
      if ($nome -in @('placa-atx', 'placa-matx')) { RemoverFundoFalso $final }
      FixarTransparencia $final
      $temporario = "$arquivo.tmp.png"; $final.Save($temporario, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $g.Dispose(); $final.Dispose() }
  } finally { $fonte.Dispose() }
  Move-Item -LiteralPath $temporario -Destination $arquivo -Force
  Write-Output "Preparado: $nome (${largura}x${altura})"
}
