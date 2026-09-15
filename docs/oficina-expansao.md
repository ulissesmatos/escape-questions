# Oficina de PCs: proposta de expansão

Hoje o jogo tem 4 pedidos fixos em sequência. Em uns 20 minutos acaba, e não
há motivo para voltar. A proposta abaixo cria um loop que se repete sem ficar
igual e que, a cada volta, ensina um pouco mais de hardware de verdade.

## O loop em três camadas

1. **Chamado (3 a 5 min)**: ler o pedido → separar as peças → montar ou
   consertar → ligar e testar → receber pagamento e reputação.
2. **Dia de trabalho (15 a 20 min, cabe numa aula)**: o dia começa com uma
   fila de 3 a 6 chamados sorteados para o nível da oficina. No fim do dia vem
   um resumo com lucro, estrelas, conceitos praticados e metas cumpridas. É um
   ponto de parada natural, e o "só mais um dia" é o que prende.
3. **Carreira (semanas)**: com o dinheiro, o jogador melhora a oficina e
   compra ferramentas. A reputação sobe o nível da oficina e libera novos
   clientes, peças e tipos de chamado. Ele também vai completando a carteira
   de técnico e o álbum de peças.

## Tipos de chamado

| Chamado | O que o aluno faz | O que aprende |
| --- | --- | --- |
| **Montagem sob medida** (o atual) | Monta um PC a partir do pedido | Compatibilidade, ordem de montagem |
| **Upgrade** | Recebe um PC pronto e troca/adiciona uma peça | Memória do tipo certo, placa de vídeo que cabe, fonte que aguenta |
| **Conserto** | Recebe um PC com defeito e um sintoma ("liga e desliga", "3 bipes", "esquenta e desliga", "sem sinal", "muito lento") e investiga com ferramentas | Diagnóstico: formular hipótese, testar, trocar a peça certa |
| **Manutenção** | Limpa poeira, troca pasta seca, organiza cabos | Refrigeração e fluxo de ar |
| **Orçamento** | Cliente tem R$ X: montar o melhor PC possível | Custo-benefício (usa a pontuação de desempenho) |

O **conserto** é o chamado mais valioso em sala de aula: o aluno precisa
raciocinar sobre causa e efeito, e não só seguir uma receita. A tela de ligar
nova já produz os sintomas: bipes, sem sinal, desliga no teste de estresse.

## Economia

- **Caixa da oficina**: as peças são compradas do fornecedor com o caixa, e o
  cliente paga o valor combinado mais uma gorjeta por estrela.
- **Peças estragadas**: viram prejuízo real, e não só desconto na recompensa.
- **Estoque**: peças que sobram ficam guardadas para o próximo chamado.
- **Equilíbrio**: pagamentos e preços são balanceados por nível, para não
  sobrar dinheiro infinito.

## Ferramentas e melhorias (loja da oficina)

| Item | Efeito no jogo | Conceito |
| --- | --- | --- |
| Pulseira antiestática | Tira o risco de "queimar" peças por estática | Eletricidade estática |
| Chave magnética | Parafusar mais rápido | — |
| Multímetro | Testa a fonte nos chamados de conserto | Tensão e fonte |
| Lupa | Mostra pinos tortos e capacitores estufados | Inspeção visual |
| Pincel e soprador | Chamados de manutenção | Poeira e temperatura |
| Organizador de cabos | Gabinete mais frio | Fluxo de ar |
| Bancada maior | Dois PCs ao mesmo tempo | — |
| Fornecedor parceiro | Desconto nas peças | Custo-benefício |

## Progressão pedagógica

- **Carteira de técnico**: selos por conceito, cada um com 3 níveis,
  conquistados ao aplicar o conceito várias vezes sem erro:
  - Sockets e compatibilidade
  - Memória e dual channel
  - Refrigeração
  - Energia e fonte
  - Armazenamento
  - Cabos
  - Diagnóstico
  - Custo-benefício
- **Álbum de peças**: cartas colecionáveis com fatos reais, liberadas na
  primeira vez que a peça é usada.
- **Certificado de técnico**: para imprimir, quando todos os selos chegam ao
  nível 1.

## Viciante, mas saudável (11 a 14 anos)

- Metas do dia curtas e variadas ("monte 2 PCs sem estragar nada").
- Recordes pessoais (maior pontuação de desempenho, maior lucro num dia).
- Surpresas ocasionais: cliente especial, peça rara, chamado bônus.
- Sem compras, anúncios ou punições pesadas; errar ensina (a tela explica o porquê).
- Cada dia tem um fim claro, para a sessão caber na aula.

## Integração com a turma (mais adiante)

- Progresso salvo no servidor por aluno e turma (hoje fica só no navegador).
- Painel do professor: selos e dificuldades de cada aluno ("a turma erra muito
  a fonte").
- Ranking opcional por reputação, que o professor pode desligar.

## Fases

1. **Feito**: tela cheia, efeitos sonoros e música, tela de ligar o PC (BIOS,
   sistema, teste de estresse, desempenho) e o minigame do processador com
   alavanca e risco de entortar pinos.
2. **Dia de trabalho**: gerador de chamados de montagem, caixa com compra de
   peças, reputação e nível da oficina, resumo do fim do dia.
3. **Conserto e diagnóstico**, com as primeiras ferramentas.
4. **Upgrade, manutenção** e loja de melhorias.
5. **Carteira de técnico, álbum de peças** e metas do dia.
6. **Progresso no servidor** e painel do professor.

Os 4 pedidos atuais continuam como a "campanha de treinamento" que libera o
modo Dia de trabalho.

## Decisões em aberto

1. **Pressão de tempo**: clientes com paciência limitada (mais emoção) ou
   relógio só para marcar o fim do dia (mais calmo)? *Sugestão:* sem cliente
   indo embora nos primeiros níveis.
2. **Economia**: comprar as peças com o caixa ou manter as peças grátis dentro
   do orçamento do cliente? *Sugestão:* caixa real a partir do nível 2.
3. **Onde salvar o progresso**: só no navegador ou no servidor por aluno?
   *Sugestão:* servidor, pensando no painel do professor.
4. **Arte nova**: sprites para ferramentas, PCs com defeito (poeira,
   capacitor estufado) e os clientes novos, gerados como os atuais
   (`docs/oficina-sprites.md`).
