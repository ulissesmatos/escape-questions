import { h } from '../../../core/dom.js';
import { Janela } from '../../word/sistema/Janela.js';
import { icone } from '../../word/sistema/icones.js';
import { Dialogo } from '../../word/sistema/Dialogo.js';
import { LIXEIRA } from '../../word/regras/SistemaDeArquivos.js';

/**
 * Segurança do Windows (o antivírus que já vem no Windows): Verificação
 * rápida encontra os programas perigosos do computador e "Iniciar ações"
 * remove. Também guarda o aviso do SmartScreen, que aparece quando o aluno
 * tenta abrir um programa baixado de um golpe.
 *
 * Arquivo perigoso: tipo 'exe' com conteudo.ameaca (nome da ameaça).
 */
export class SegurancaWindows {
  constructor(sim) {
    this.sim = sim;
    this.mundo = sim.mundo;
    this.pagina = 'inicio';
    this.verificando = false;
    this.resultado = null; // null | { ameacas: [...] }
    this.janela = new Janela(sim, { app: 'seguranca', titulo: 'Segurança do Windows', icone: 'img:shield-checkmark-48-color', largura: 820, altura: 540, minLargura: 560, classe: 'janela-seguranca' });
    this.menu = h('nav', { class: 'seg-menu' });
    this.corpo = h('main', { class: 'seg-corpo' });
    this.janela.conteudo.append(h('div', { class: 'seg' }, this.menu, this.corpo));
    this.pararDeOuvir = sim.fs.aoMudar(() => this.desenhar());
    this.janela.aoFechar = () => {
      this.pararDeOuvir?.();
      clearTimeout(this.relogio);
    };
    this.desenhar();
  }

  emitir(evento) {
    this.sim.emitir({ tipo: 'seguranca', app: 'seguranca', ...evento });
  }

  /** Programas perigosos no computador (e o "vírus" ativo, se o aluno executou um) */
  ameacas() {
    const arquivos = this.sim.fs.itens.filter((i) => i.tipo === 'exe' && i.conteudo?.ameaca).map((i) => ({ item: i, nome: i.conteudo.ameaca, local: i.pasta === LIXEIRA ? 'Lixeira' : `C:\\Usuários\\${this.sim.conta.arroba}\\${i.pasta}\\${i.nome}.exe`, nivel: 'Grave' }));
    if (this.mundo.infectado) arquivos.push({ item: null, nome: 'Trojan:Win32/Anzol.A (em execução)', local: 'Memória do computador', nivel: 'Grave' });
    return arquivos;
  }

  ir(pagina) {
    this.pagina = pagina;
    this.desenhar();
    this.emitir({ acao: 'pagina', pagina, marco: `seg:pagina:${pagina}` });
  }

  desenhar() {
    const item = (id, nome, nomeIcone) =>
      h('button', { type: 'button', class: `seg-menu-item${this.pagina === id ? ' ativo' : ''}`, 'data-alvo': `seg.menu.${id}`, onClick: () => this.ir(id) }, icone(nomeIcone, { tamanho: 18 }), h('span', { text: nome }));
    this.menu.replaceChildren(item('inicio', 'Início', 'home'), item('virus', 'Proteção contra vírus e ameaças', 'shield'), item('conta', 'Proteção da conta', 'person'), item('firewall', 'Firewall e proteção de rede', 'wifi_1'));
    this.corpo.replaceChildren(this.pagina === 'virus' ? this.paginaVirus() : this.pagina === 'inicio' ? this.paginaInicio() : this.paginaOk());
  }

  paginaInicio() {
    const perigo = this.resultado?.ameacas.length > 0 || this.mundo.infectado;
    const bloco = (id, nome, ok, texto) =>
      h('button', { type: 'button', class: `seg-bloco${ok ? '' : ' perigo'}`, 'data-alvo': `seg.bloco.${id}`, onClick: () => this.ir(id) }, icone(ok ? 'shield_checkmark' : 'shield_error', { tamanho: 36 }), h('strong', { text: nome }), h('small', { text: texto }));
    return h(
      'div',
      {},
      h('h1', { text: 'Segurança rápida' }),
      h('p', { text: 'Veja o que está acontecendo com a segurança e a integridade do seu computador.' }),
      h(
        'div',
        { class: 'seg-blocos' },
        bloco('virus', 'Proteção contra vírus e ameaças', !perigo, perigo ? 'Ações recomendadas' : 'Nenhuma ação necessária'),
        bloco('conta', 'Proteção da conta', true, 'Nenhuma ação necessária'),
        bloco('firewall', 'Firewall e proteção de rede', true, 'Nenhuma ação necessária')
      )
    );
  }

  paginaOk() {
    return h('div', {}, h('h1', { text: this.pagina === 'conta' ? 'Proteção da conta' : 'Firewall e proteção de rede' }), h('p', { class: 'seg-ok' }, icone('shield_checkmark', { tamanho: 20 }), 'Tudo certo por aqui. Nenhuma ação necessária.'));
  }

  paginaVirus() {
    const partes = [h('h1', { text: 'Proteção contra vírus e ameaças' }), h('h2', { text: 'Ameaças atuais' })];
    if (this.verificando) {
      partes.push(h('p', { text: 'Verificação rápida em andamento...' }), h('div', { class: 'seg-progresso' }, h('span', {})), h('small', { text: 'Verificando a pasta Downloads, a Área de Trabalho e os programas em execução.' }));
    } else if (this.resultado && this.resultado.ameacas.length) {
      partes.push(
        h('p', { class: 'seg-perigo' }, icone('shield_error', { tamanho: 20 }), `${this.resultado.ameacas.length} ${this.resultado.ameacas.length === 1 ? 'ameaça encontrada' : 'ameaças encontradas'}. Inicie as ações recomendadas.`),
        h('ul', { class: 'seg-ameacas' }, this.resultado.ameacas.map((a) => h('li', {}, icone('bug', { tamanho: 18 }), h('div', {}, h('strong', { text: a.nome }), h('small', { text: `${a.nivel} · ${a.local}` }))))),
        h('button', { type: 'button', class: 'seg-botao', 'data-alvo': 'seg.remover', text: 'Iniciar ações', onClick: () => this.remover() })
      );
    } else {
      partes.push(
        h('p', { class: 'seg-ok' }, icone('shield_checkmark', { tamanho: 20 }), this.resultado ? 'Nenhuma ameaça atual. A última verificação não encontrou nada.' : 'Nenhuma ameaça atual.'),
        this.resultado?.removidas ? h('p', { class: 'seg-ok', text: `${this.resultado.removidas} ${this.resultado.removidas === 1 ? 'ameaça removida' : 'ameaças removidas'}. O computador está protegido.` }) : null
      );
    }
    if (!this.verificando) partes.push(h('button', { type: 'button', class: 'seg-botao contorno', 'data-alvo': 'seg.verificar', text: 'Verificação rápida', onClick: () => this.verificar() }));
    return h('div', {}, ...partes);
  }

  verificar() {
    if (this.verificando) return;
    this.verificando = true;
    this.desenhar();
    this.emitir({ acao: 'verificando' });
    this.relogio = setTimeout(() => {
      this.verificando = false;
      this.resultado = { ameacas: this.ameacas() };
      this.desenhar();
      this.emitir({ acao: 'verificar', encontradas: this.resultado.ameacas.length, marco: 'seg:verificacao' });
    }, 2200);
  }

  remover() {
    const ameacas = this.ameacas();
    for (const a of ameacas) if (a.item) this.sim.fs.excluirDefinitivo(a.item);
    this.mundo.infectado = false;
    this.resultado = { ameacas: [], removidas: ameacas.length };
    this.desenhar();
    this.emitir({ acao: 'remover', removidas: ameacas.length, marco: 'seg:removido' });
    this.mundo.mudou();
  }

  estado() {
    return { pagina: this.pagina, verificando: this.verificando, encontradas: this.resultado?.ameacas.length ?? null };
  }

  prerequisito(passo, guia) {
    if ((passo.alvo === 'seg.verificar' || passo.alvo === 'seg.remover') && this.pagina !== 'virus') return guia.apontar('seg.menu.virus', 'Clique em "Proteção contra vírus e ameaças".');
    if (this.verificando) return { passo, indice: -1, elemento: null, texto: 'Aguarde a verificação terminar...', espera: true, prerequisito: true, obterRetangulo: () => null };
    return null;
  }
}

/**
 * Dois cliques num programa (.exe). Se for perigoso, o SmartScreen avisa
 * (como no Windows de verdade): "Não executar" é o certo. "Mais informações"
 * mostra o botão "Executar assim mesmo", que "infecta" o computador.
 */
export async function abrirPrograma(sim, item, { via = 'explorador' } = {}) {
  const emitir = (evento) => sim.emitir({ tipo: 'seguranca', app: 'smartscreen', nome: item.nome, via, ...evento });
  if (!item.conteudo?.ameaca) {
    Dialogo.mensagem(sim, { titulo: 'Windows', texto: 'Este programa não faz parte do simulador.', nome: 'semApp' });
    return;
  }
  emitir({ acao: 'tentou-abrir', marco: 'seg:tentou-abrir' });
  const dlg = new Dialogo(sim, {
    nome: 'smartscreen',
    titulo: '',
    largura: 460,
    classe: 'dlg-smartscreen',
    botoes: [{ rotulo: 'Não executar', primario: true, valor: 'nao', alvo: 'dialogo.smartscreen.naoExecutar' }],
  });
  const detalhes = h(
    'div',
    { class: 'smartscreen-detalhes', hidden: true },
    h('p', {}, 'Aplicativo: ', h('strong', { text: `${item.nome}.exe` })),
    h('p', {}, 'Editor: ', h('strong', { text: 'Editor desconhecido' }))
  );
  const mais = h('a', {
    href: '#',
    class: 'smartscreen-mais',
    'data-alvo': 'dialogo.smartscreen.mais',
    text: 'Mais informações',
    onClick: (e) => {
      e.preventDefault();
      detalhes.hidden = false;
      mais.hidden = true;
      dlg.opcoes.botoes = [{ rotulo: 'Executar assim mesmo', valor: 'executar', alvo: 'dialogo.smartscreen.executar' }, ...dlg.opcoes.botoes];
      dlg.montarBotoes();
      emitir({ acao: 'mais-informacoes' });
    },
  });
  dlg.corpo.append(
    h('h2', { class: 'smartscreen-titulo', text: 'O Windows protegeu o computador' }),
    h('p', { text: 'O Microsoft Defender SmartScreen impediu que um aplicativo desconhecido fosse iniciado. A execução desse aplicativo pode colocar seu computador em risco.' }),
    mais,
    detalhes
  );
  const escolha = await dlg.abrir();
  if (escolha === 'executar') {
    sim.mundo.infectado = true;
    sim.el.classList.add('virus');
    setTimeout(() => sim.el.classList.remove('virus'), 1400);
    emitir({ acao: 'executar', deslize: true, marco: 'seg:executou' });
    sim.mundo.mudou();
  } else {
    emitir({ acao: 'nao-executar', marco: 'seg:nao-executou' });
  }
}
