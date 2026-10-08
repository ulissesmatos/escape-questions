import { h } from '../../core/dom.js';
import { Toast } from '../../components/ui.js';
import { AdminSection, AdminTab } from './base.js';
import { BLOCOS, CONDICOES, contarBlocos } from '../../pages/horta/regras/blocos.js';
import { FASES, MUNDOS, montarHortas, solucaoDaFase } from '../../pages/horta/regras/fases.js';
import { caminhoDoPlano, nomeDoBloco } from '../../pages/horta/regras/padroes.js';
import { Desenho } from '../../pages/horta/jogo/Desenho.js';

/**
 * Robô na Horta: a resposta de cada fase para o professor ajudar os alunos.
 * As respostas são as soluções de referência das fases (fases.js); o teste
 * automático garante que todas ganham as 3 estrelas: completam a horta,
 * usam no máximo a meta de blocos e pegam todas as moedas.
 */

// Como explicar cada fase para o aluno que travou (por id da fase)
const COMO_EXPLICAR = {
  '1-1': 'Peça para contar as casas até o tomate: são 4 passos e depois colher.',
  '1-2': 'A direita é a do robô, não a da tela. Ele está virado para a direita, então "Vire à direita" faz ele olhar para baixo.',
  '1-3': 'Peça para o aluno seguir o caminho com o dedo, dizendo cada ordem em voz alta. Virado para baixo, a esquerda do robô aponta para a direita da tela.',
  '1-4': 'Só dá para plantar na terra marrom. Em cada terra: ande até ela e plante.',
  '1-5': 'Planta murcha (com a gotinha) precisa de "Regue". Tomate vermelho precisa de "Colha".',
  'ate-o-tomate': 'Primeiro contato com o Repita: o que está dentro dele roda várias vezes. Pergunte quantos "Ande" seriam sem o Repita (6) e mostre que um só, dentro do Repita 6, faz o mesmo.',
  '2-1': 'O pedaço que se repete é "ande e colha". Pergunte: o que o robô faz em cada tomate? Isso vai dentro do Repita.',
  '2-4': 'Um degrau é: ande, vire à esquerda, ande, vire à direita, colha. São 4 degraus, então Repita 4.',
  '2-2': 'Cada lado é: colha, ande 4 vezes, vire à direita. São 4 lados, então Repita 4 (ainda sem Repita dentro).',
  quadradinho:
    'O Repita de fora conta os lados (4) e o de dentro conta os passos de cada lado (3). Use o relógio: o ponteiro rápido (o de dentro) dá a volta toda a cada passo do lento (o de fora).',
  'canteiro-medio': 'É a resposta da "Volta no canteiro" com os 4 blocos "Ande" trocados por um Repita 4. Vale mostrar as duas lado a lado.',
  '2-3': 'Igual ao canteiro anterior: só muda o número do Repita de dentro, de 4 para 6. Pergunte o que mudou no canteiro.',
  'uma-coluna': 'Entra na coluna (ande), vira para cima (esquerda), sobe colhendo (Repita 3), dá meia-volta (duas vezes direita) e desce até o celeiro (Repita 3).',
  'duas-colunas':
    'É a coluna inteira dentro de um Repita 2. O detalhe que mais trava: no fim de cada coluna o robô precisa virar à esquerda para olhar para a direita de novo, pronto para a próxima coluna.',
  '2-5': 'Mesma resposta das "Duas colunas", trocando o 2 por 4 no Repita de fora.',
  '3-1': 'A horta muda a cada vez: o Se faz o robô olhar antes de colher. Tomate verde ele deixa.',
  '3-2': 'Se... senão escolhe entre duas coisas: com sede, regue; se não, colha.',
  '3-3': 'Dois Se seguidos: um para terra vazia (plante) e outro para tomate maduro (colha). Tomate verde não faz nada.',
  '3-4': 'É a resposta do Pomar com o "Colha" trocado por "Se tiver planta madura, colha".',
  '4-1': 'O Repita até repete enquanto a resposta da pergunta for "não". Aqui: até ter pedra na frente.',
  '4-2': 'Junta o Repita até com o Se: anda até a pedra, colhendo só as maduras.',
  '4-3': 'A cada passo o robô olha: tem pedra na frente? Vira à direita. Senão, anda. Repete até chegar no celeiro.',
  '4-4': 'É o "Caminho do celeiro" com um "Se tiver planta madura, colha" antes de decidir para onde ir.',
};

/** Plano em blocos, nas cores do jogo (Repita e Se com o que está dentro) */
function desenharPlano(lista) {
  return h(
    'ol',
    { class: 'resposta-plano' },
    lista.map((bloco) => {
      const def = BLOCOS[bloco.tipo];
      return h(
        'li',
        {},
        h('span', { class: `resposta-bloco cat-${def.categoria}` }, h('span', { 'aria-hidden': 'true', text: def.icone }), ` ${nomeDoBloco(bloco)}`),
        bloco.corpo && desenharPlano(bloco.corpo),
        bloco.senao && h('span', { class: 'resposta-bloco resposta-senao cat-decisao', text: 'senão' }),
        bloco.senao && desenharPlano(bloco.senao)
      );
    })
  );
}

/** Mini mapa da horta com o caminho da resposta pintado (uma cor por volta do Repita de fora) */
function miniMapa(fase, plano) {
  const horta = montarHortas(fase, 1)[0];
  const canvas = h('canvas', { class: 'resposta-mapa', 'aria-label': `Caminho da resposta da fase ${fase.rotulo}` });
  const desenho = new Desenho(canvas);
  desenho.ajustar(horta, 260, 200);
  const { robo } = horta;
  desenho.desenhar(horta, { x: robo.x, y: robo.y, dir: robo.dir, pulo: 0, tremor: 0, balao: null, particulas: [], rastro: caminhoDoPlano(plano, horta) }, 0);
  return canvas;
}

class RespostasTab extends AdminTab {
  /** As respostas vêm das fases do jogo; do servidor só vem a configuração */
  async carregar() {
    return this.props.api.get('/horta/config');
  }

  /** Interruptor da memória do Bip: vale na hora para todos os alunos que abrirem uma fase */
  configuracoes(config) {
    const chave = h('input', { type: 'checkbox', class: 'interruptor-campo', checked: config.memoria, 'aria-describedby': 'memoria-explicacao' });
    const explicacao = h('p', { class: 'texto-suave', id: 'memoria-explicacao' });
    const estado = h('strong', { class: 'interruptor-estado' });
    const mostrar = (ligada) => {
      estado.textContent = ligada ? 'Ligada' : 'Desligada';
      estado.classList.toggle('ligada', ligada);
      explicacao.textContent = ligada
        ? 'Nos mundos 2 e 3 o robô só roda o plano se ele couber na memória: os alunos precisam usar o Repita para concluir a fase.'
        : 'Os alunos concluem as fases mesmo sem usar o Repita. O robô continua sugerindo o Repita, e quem usar menos blocos ganha a estrela da meta.';
    };
    mostrar(config.memoria);
    chave.addEventListener('change', async () => {
      chave.disabled = true;
      try {
        const salvo = await this.props.api.put('/horta/config', { memoria: chave.checked });
        this.dados = salvo;
        mostrar(salvo.memoria);
        Toast.sucesso(salvo.memoria ? 'Memória do Bip ligada.' : 'Memória do Bip desligada.');
        this.redesenhar();
      } catch (erro) {
        chave.checked = !chave.checked;
        Toast.erro(erro.message);
      } finally {
        chave.disabled = false;
      }
    });
    return h(
      'div',
      { class: 'cartao resposta-config' },
      h(
        'label',
        { class: 'interruptor' },
        chave,
        h('span', { class: 'interruptor-trilho', 'aria-hidden': 'true' }),
        h('span', { class: 'interruptor-rotulo' }, '🧠 Memória do Bip (limite de blocos) ', estado)
      ),
      explicacao,
      h('p', { class: 'texto-suave', text: 'A mudança vale quando o aluno abrir (ou recarregar) uma fase.' })
    );
  }

  desenhar(config) {
    this.config = config;
    this.mundo = this.mundo || 0;
    const filtros = h(
      'div',
      { class: 'segmentado resposta-filtros', role: 'group', 'aria-label': 'Mundo' },
      [{ numero: 0, titulo: 'Todos' }, ...MUNDOS].map((m) =>
        h('button', {
          type: 'button',
          class: m.numero === this.mundo ? 'ativo' : '',
          text: m.numero ? `${m.icone} Mundo ${m.numero}` : 'Todos os mundos',
          onClick: () => {
            this.mundo = m.numero;
            this.redesenhar();
          },
        })
      )
    );
    const mundos = MUNDOS.filter((m) => !this.mundo || m.numero === this.mundo).map((mundo) =>
      h(
        'section',
        { class: 'resposta-mundo' },
        h('h2', { class: 'resposta-mundo-titulo' }, `${mundo.icone} Mundo ${mundo.numero}: ${mundo.titulo}`),
        h('p', { class: 'texto-suave', text: mundo.descricao }),
        h('div', { class: 'resposta-grade' }, FASES.filter((f) => f.mundo === mundo.numero).map((fase) => this.cartao(fase)))
      )
    );
    return [
      this.configuracoes(config),
      h(
        'div',
        { class: 'cartao resposta-intro' },
        h('p', {}, h('strong', { text: 'Todas estas respostas ganham as 3 estrelas: ' }), 'completam a horta, usam no máximo a meta de blocos e pegam todas as moedas. Outras respostas também podem estar certas: o importante é a horta ficar pronta.'),
        h('p', { class: 'texto-suave' }, 'Para testar uma fase sem precisar passar pelas anteriores, use "Abrir no jogo" (abre com todas as fases liberadas). O caminho pintado no mapa tem uma cor para cada volta do Repita de fora.')
      ),
      filtros,
      mundos,
    ];
  }

  cartao(fase) {
    const plano = solucaoDaFase(fase);
    const blocos = contarBlocos(plano);
    const sorteada = Boolean(fase.gerar);
    const chips = [
      h('span', { class: 'resposta-chip', text: `${blocos} ${blocos === 1 ? 'bloco' : 'blocos'} (meta: até ${fase.meta})` }),
      fase.memoria && h('span', { class: 'resposta-chip', text: `🧠 memória: ${fase.memoria}${this.config.memoria ? '' : ' (desligada)'}` }),
      sorteada && h('span', { class: 'resposta-chip', text: `🎲 ${fase.variantes} hortas sorteadas` }),
      fase.condicoes && h('span', { class: 'resposta-chip', text: fase.condicoes.map((c) => CONDICOES[c].icone).join(' ') }),
    ];
    return h(
      'article',
      { class: 'cartao resposta-cartao' },
      h(
        'header',
        { class: 'resposta-cabecalho' },
        h('span', { class: 'resposta-numero', text: fase.rotulo }),
        h('h3', { text: fase.titulo }),
        h('a', { class: 'btn btn-contorno btn-pequeno', href: `horta.html?tudo#fase-${fase.id}`, target: '_blank', rel: 'noopener', text: 'Abrir no jogo ↗' })
      ),
      h('div', { class: 'resposta-chips' }, chips),
      h(
        'div',
        { class: 'resposta-corpo' },
        h('div', { class: 'resposta-mapa-area' }, miniMapa(fase, plano), sorteada && h('p', { class: 'texto-suave resposta-legenda', text: 'Exemplo: a horta muda a cada vez, e a resposta funciona em qualquer uma.' })),
        desenharPlano(plano)
      ),
      COMO_EXPLICAR[fase.id] && h('p', { class: 'resposta-explicar' }, h('strong', { text: '💬 Como explicar: ' }), COMO_EXPLICAR[fase.id])
    );
  }
}

export class HortaSection extends AdminSection {
  static id = 'horta';
  static titulo = 'Robô na Horta';
  static icone = '🤖';
  static descricao = 'A resposta de cada fase, com 3 estrelas, para ajudar quem travar.';
  static abas = [{ id: 'respostas', rotulo: 'Respostas', Classe: RespostasTab }];
}
