<#
  Normaliza os gabaritos da Oficina para o tamanho lógico usado pelo Phaser.
  A redução só é aceita quando a origem é um múltiplo inteiro do destino: isso
  garante pixel art consistente, sem interpolação ou pixels inventados.
#>
[CmdletBinding()]
param(
  [string]$Origem = (Join-Path $PSScriptRoot '..\docs\oficina-gabaritos'),
  [string]$Destino = (Join-Path $PSScriptRoot '..\public\images\oficina')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$tamanhos = [ordered]@{
  'placa-atx' = @(240, 300); 'placa-matx' = @(240, 240); 'placa-matx-intel' = @(240, 240)
  'cpu-am4' = @(44, 44); 'cpu-am5' = @(44, 44); 'cpu-intel' = @(48, 40)
  'pasta' = @(52, 20); 'cooler-box' = @(72, 72); 'cooler-torre' = @(80, 80)
  'ram-ddr4' = @(14, 96); 'ram-ddr5' = @(14, 96)
  'ssd-m2' = @(60, 16); 'ssd-sata' = @(48, 32); 'hd' = @(52, 36)
  'gpu-1' = @(116, 40); 'gpu-2' = @(136, 42); 'gpu-3' = @(164, 46)
  'fonte' = @(88, 56); 'gabinete-mini' = @(270, 320); 'gabinete-mid' = @(300, 350)
  'cliente-cida' = @(56, 56); 'cliente-ricardo' = @(56, 56); 'cliente-enzo' = @(56, 56); 'cliente-marina' = @(56, 56)
  'moeda' = @(18, 18); 'estrela' = @(28, 28); 'estrela-vazia' = @(28, 28)
}

New-Item -ItemType Directory -Force -Path $Destino | Out-Null

foreach ($nome in $tamanhos.Keys) {
  $arquivoOrigem = Join-Path $Origem "$nome.png"
  $arquivoDestino = Join-Path $Destino "$nome.png"
  if (-not (Test-Path -LiteralPath $arquivoOrigem)) { throw "Gabarito não encontrado: $arquivoOrigem" }

  $bitmapFonte = [System.Drawing.Bitmap]::FromFile($arquivoOrigem)
  try {
    $largura = $tamanhos[$nome][0]; $altura = $tamanhos[$nome][1]
    if (($bitmapFonte.Width % $largura) -ne 0 -or ($bitmapFonte.Height % $altura) -ne 0) {
      throw "$nome não possui escala inteira: $($bitmapFonte.Width)x$($bitmapFonte.Height) para ${largura}x${altura}."
    }

    $final = New-Object System.Drawing.Bitmap $largura, $altura, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $desenho = [System.Drawing.Graphics]::FromImage($final)
    try {
      $desenho.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $desenho.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighSpeed
      $desenho.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $desenho.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
      $desenho.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
      $desenho.DrawImage($bitmapFonte, (New-Object System.Drawing.Rectangle 0, 0, $largura, $altura), 0, 0, $bitmapFonte.Width, $bitmapFonte.Height, [System.Drawing.GraphicsUnit]::Pixel)
      $final.Save($arquivoDestino, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $desenho.Dispose(); $final.Dispose()
    }
    Write-Output "Normalizado: $nome (${largura}x${altura})"
  } finally {
    $bitmapFonte.Dispose()
  }
}
