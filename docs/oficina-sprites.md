# Sprites da Oficina de PCs (gerando no ChatGPT)

O jogo já funciona com desenhos provisórios feitos por código. Cada imagem que
você colocar em `public/images/oficina/` substitui o provisório de mesmo nome
automaticamente. Não precisa mexer no fallback nem reiniciar o servidor: basta
recarregar a página.

## Arte final já incluída

`public/images/oficina/` agora contém arte original nova para os 27 sprites. Os
gabaritos em `docs/oficina-gabaritos/` foram usados somente como referência de
composição — especialmente as posições de socket, RAM, PCIe e baias — e seguem
intactos. A direção de arte usa uma paleta única, contorno consistente e blocos
de pixel deliberados; as imagens são carregadas em alta resolução e reduzidas
pelo Phaser no tamanho lógico do jogo, o que evita os serrilhados irregulares
de uma geração de IA usada diretamente em tamanho pequeno.

O script `tools/normalizar-sprites-oficina.ps1` permanece disponível para
comparar ou preparar os gabaritos, mas não deve ser executado sobre a pasta de
arte final sem revisar o resultado: ele foi pensado para fontes com escala
inteira.

## Editor visual de zonas

Abra `oficina-zonas.html` para calibrar socket, RAM, M.2, PCIe e baias sobre a
arte real. As caixas podem ser movidas e redimensionadas; o editor também
permite adicionar zonas, salvar no navegador, exportar e importar JSON. A
Oficina lê essa calibração ao recarregar. Use **Restaurar padrão** para voltar
imediatamente aos layouts do repositório.

Para adicionar uma arte sua, escolha o PNG, escreva um identificador em
minúsculas (por exemplo `minha-placa-am5`), marque **Placa-mãe** ou **Gabinete**
e clique em **Adicionar à biblioteca**. O arquivo fica guardado localmente no
navegador e aparece no seletor “Meus sprites”; então basta desenhar as zonas e
exportar o JSON para compartilhar a configuração com outro navegador. O PNG
personalizado também é carregado pela Oficina nesse mesmo navegador, mantendo
o fallback provisório para todo sprite não personalizado.

Essa biblioteca resolve a arte e os encaixes. Para uma peça nova aparecer como
opção de montagem em um pedido, ela ainda precisa receber sua ficha técnica no
catálogo do jogo (socket, memória, preço e compatibilidades); isso impede que
uma imagem sem regras entre acidentalmente em uma montagem avaliável.

## Passo a passo

1. **Abra o ChatGPT** e cole o *prompt de estilo* (abaixo) uma vez no começo da
   conversa. Assim todas as peças saem com o mesmo visual.
2. **Peça uma imagem por vez** usando o texto da tabela. Para placas-mãe e
   gabinetes, **anexe o gabarito** de `docs/oficina-gabaritos/<nome>.png` e diga
   *"siga exatamente esta posição dos slots"*.
3. **Baixe a imagem** (PNG com fundo transparente).
4. **Ajuste o tamanho** para o tamanho da tabela (ou um múltiplo exato, como 2× ou 3×):
   - No [Sprite Fusion Pixel Snapper](https://www.spritefusion.com/pixel-snapper)
     (grátis), que "conserta" os pixels irregulares que a IA gera; ou
   - No Photopea/Piskel, redimensionando com o modo **vizinho mais próximo**
     (*nearest neighbor*).
5. **Salve** como `public/images/oficina/<nome>.png`, com o nome exato da
   coluna "Arquivo".
6. **Recarregue** `oficina.html`. Para conferir se os encaixes batem com a arte,
   abra `oficina.html?zonas=1`: os retângulos cor-de-rosa mostram onde cada peça
   encaixa.

Se os slots da arte não baterem com os retângulos, você pode ajustar a arte ou
os números em `LAYOUT_PLACAS` / `LAYOUT_GABINETES` no arquivo
`public/js/pages/oficina/jogo/sprites/manifesto.js` (frações de 0 a 1).

## Prompt de estilo (cole primeiro)

> Vou pedir vários sprites para um jogo educativo 2D de montar computadores,
> para alunos de 11 a 14 anos. Estilo: **pixel art** de jogo mobile, contornos
> escuros de 1 pixel, cores vivas mas realistas, sombreamento simples com 2 ou 3
> tons, iluminação vindo do canto superior esquerdo. **Fundo 100% transparente**,
> sem sombra projetada no chão, sem texto, sem marca registrada nem logotipo de
> fabricante real. A peça deve lembrar o componente de verdade e ocupar a
> imagem inteira, centralizada. Vou dizer o tamanho final em pixels de cada uma.

## Lista de sprites

| Arquivo | Tamanho (px) | O que pedir |
| --- | --- | --- |
| `placa-atx.png` | 240 × 300 | Placa-mãe ATX vista de cima, PCB verde escuro, socket AM5 prateado no centro-alto, 4 slots de memória verticais pretos à direita do socket, dissipadores em volta do socket, 2 slots M.2, slot PCI Express x16 comprido na parte de baixo, conector de 24 pinos branco na borda direita. **Anexe o gabarito.** |
| `placa-matx.png` | 240 × 240 | Placa-mãe Micro-ATX quadrada vista de cima, PCB verde, socket AM4 bege com furinhos, 2 slots de memória verticais, 1 slot M.2, slot PCI Express embaixo. **Anexe o gabarito.** |
| `placa-matx-intel.png` | 240 × 240 | Igual à anterior, mas PCB azul escuro e socket Intel LGA1700 retangular prateado com pinos dourados e alavanca de metal. **Anexe o gabarito.** |
| `cpu-am4.png` | 44 × 44 | Processador visto de cima, tampa metálica prateada quadrada, **triângulo dourado no canto inferior esquerdo**. |
| `cpu-am5.png` | 44 × 44 | Processador com tampa prateada recortada nas bordas (formato de "polvo"), **triângulo dourado no canto inferior esquerdo**. |
| `cpu-intel.png` | 48 × 40 | Processador retangular com borda de placa verde e tampa prateada, **triângulo dourado no canto inferior esquerdo**. |
| `pasta.png` | 52 × 20 | Seringa de pasta térmica cinza deitada, rótulo azul, tampa na ponta direita. |
| `cooler-box.png` | 72 × 72 | Cooler box visto de cima: ventoinha preta redonda com pás, moldura quadrada de alumínio. |
| `cooler-torre.png` | 80 × 80 | Cooler torre visto de cima: bloco de aletas de alumínio, ventoinha preta de um lado, pontas de heatpipes de cobre. |
| `ram-ddr4.png` | 14 × 96 | Pente de memória **em pé**, placa verde com chips pretos, contatos dourados na lateral esquerda com um entalhe **no meio**. |
| `ram-ddr5.png` | 14 × 96 | Pente de memória **em pé** com dissipador preto e faixa roxa, contatos dourados com entalhe **fora do centro**. |
| `ssd-m2.png` | 60 × 16 | SSD M.2 deitado: placa comprida preta com chips e etiqueta, contatos dourados na ponta esquerda. |
| `ssd-sata.png` | 48 × 32 | SSD SATA 2,5": caixa preta retangular com etiqueta azul. |
| `hd.png` | 52 × 36 | HD 3,5" visto de cima: carcaça prateada com etiqueta e parafusos. |
| `gpu-1.png` | 116 × 40 | Placa de vídeo pequena, 1 ventoinha, deitada, **contatos dourados embaixo** e **suporte metálico na ponta esquerda**. |
| `gpu-2.png` | 136 × 42 | Placa de vídeo intermediária, 2 ventoinhas, mesmas regras da anterior. |
| `gpu-3.png` | 164 × 46 | Placa de vídeo topo de linha enorme, 3 ventoinhas, faixa de LED colorido, mesmas regras. |
| `fonte.png` | 88 × 56 | Fonte ATX preta com grade redonda da ventoinha e etiqueta amarela. |
| `gabinete-mini.png` | 270 × 320 | Gabinete Mini Tower **aberto visto de lado**, interior vazio, ventoinha traseira, compartimento da fonte embaixo, baias de disco à direita. **Anexe o gabarito** (a área da placa-mãe precisa ficar vazia). |
| `gabinete-mid.png` | 300 × 350 | Gabinete Mid Tower aberto visto de lado, mesmas regras, com ventoinhas no topo. **Anexe o gabarito.** |
| `cliente-cida.png` | 56 × 56 | Retrato de uma senhora simpática de cabelo grisalho e óculos. |
| `cliente-ricardo.png` | 56 × 56 | Retrato de um professor de barba curta e óculos. |
| `cliente-enzo.png` | 56 × 56 | Retrato de um adolescente gamer com headset. |
| `cliente-marina.png` | 56 × 56 | Retrato de uma jovem criadora de conteúdo com coque. |
| `moeda.png` | 18 × 18 | Moeda dourada brilhante. |
| `estrela.png` / `estrela-vazia.png` | 28 × 28 | Estrela dourada / estrela só com contorno cinza. |

## Regras importantes para o jogo funcionar

- **Triângulo do processador no canto inferior esquerdo.** O minigame de alinhar
  considera essa posição como "certa".
- **Memórias em pé** e **placas de vídeo deitadas com contatos embaixo**, porque é
  assim que elas aparecem encaixadas na placa-mãe.
- **Placas-mãe e gabinetes:** a posição dos slots, socket e baias precisa bater
  com o gabarito. Confira com `?zonas=1`.
- Se trocar uma imagem e ela ficar esticada, confira se a proporção
  (largura × altura) é a mesma da tabela.
