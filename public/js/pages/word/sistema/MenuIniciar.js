import { h } from '../../../core/dom.js';
import { icone, iconeDoArquivo } from './icones.js';
import { MenuDeContexto } from './MenuDeContexto.js';
import { LIXEIRA } from '../regras/SistemaDeArquivos.js';
import { comparavel } from '../regras/objetivos.js';

const FIXADOS = [
  { id: 'word', nome: 'Word', icone: 'img:logo-word' },
  { id: 'bloco', nome: 'Bloco de Notas', icone: 'img:logo-bloco-de-notas' },
  { id: 'explorador', nome: 'Explorador de Arquivos', icone: 'img:pasta' },
  { id: 'edge', nome: 'Microsoft Edge', icone: 'img:logo-edge' },
  { id: 'fotos', nome: 'Fotos', icone: 'img:image-48-color' },
  { id: 'configuracoes', nome: 'Configurações', icone: 'img:settings-24-color' },
  { id: 'calculadora', nome: 'Calculadora', icone: 'img:computador' },
  { id: 'paint', nome: 'Paint', icone: 'img:paint-brush-32-color' },
];

/**
 * Menu Iniciar do Windows 11: pesquisa (é só começar a digitar), programas
 * fixados, arquivos recomendados e a conta do aluno (o @) com o botão de
 * desligar, que sai do simulador.
 */
export class MenuIniciar {
  constructor(sim) {
    this.sim = sim;
    this.aberto = false;
    this.campo = h('input', { type: 'text', class: 'iniciar-busca-campo', placeholder: 'Pesquise aplicativos, configurações e documentos', spellcheck: false, 'data-alvo': 'iniciar.busca' });
    this.campo.addEventListener('input', () => this.desenharConteudo());
    this.campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.conteudo.querySelector('.iniciar-resultado')?.click();
      } else if (e.key === 'Escape') this.fechar();
    });
    this.conteudo = h('div', { class: 'iniciar-conteudo' });
    const inicial = (sim.conta.nome || sim.conta.arroba || '?').trim()[0].toUpperCase();
    this.el = h(
      'div',
      { class: 'menu-iniciar', hidden: true, role: 'dialog', 'aria-label': 'Iniciar' },
      h('div', { class: 'iniciar-busca' }, icone('search', { tamanho: 16 }), this.campo),
      this.conteudo,
      h(
        'div',
        { class: 'iniciar-rodape' },
        h('div', { class: 'iniciar-conta' }, h('span', { class: 'iniciar-avatar', text: inicial }), h('span', { text: `@${sim.conta.arroba}` })),
        h('button', { type: 'button', class: 'iniciar-energia', 'aria-label': 'Ligar/Desligar', 'data-alvo': 'iniciar.energia', onClick: (e) => this.menuEnergia(e.currentTarget) }, icone('power', { tamanho: 18 }))
      )
    );
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.fora = (e) => {
      if (this.aberto && !this.el.contains(e.target) && !e.target.closest('[data-alvo="barra.iniciar"], [data-alvo="barra.pesquisa"], [data-menu]')) this.fechar();
    };
    document.addEventListener('pointerdown', this.fora, true);
  }

  destruir() {
    document.removeEventListener('pointerdown', this.fora, true);
  }

  alternar() {
    if (this.aberto) this.fechar();
    else this.abrir();
  }

  abrir({ pesquisar = false } = {}) {
    this.aberto = true;
    this.campo.value = '';
    this.desenharConteudo();
    this.el.hidden = false;
    this.el.classList.remove('iniciar-entrando');
    void this.el.offsetWidth;
    this.el.classList.add('iniciar-entrando');
    this.sim.barra.atualizar();
    this.sim.emitir({ tipo: 'menu', menu: 'iniciar' });
    if (pesquisar) setTimeout(() => this.campo.focus(), 50);
  }

  fechar() {
    if (!this.aberto) return;
    this.aberto = false;
    this.el.hidden = true;
    this.sim.barra.atualizar();
  }

  /** Começar a digitar com o menu aberto já pesquisa */
  aoTeclar(e) {
    if (e.key === 'Escape') {
      this.fechar();
      return true;
    }
    if (document.activeElement !== this.campo && e.key.length === 1 && !e.ctrlKey && !e.altKey) {
      this.campo.focus();
      return false;
    }
    return false;
  }

  desenharConteudo() {
    const termo = comparavel(this.campo.value);
    if (termo) return this.desenharBusca(termo);
    const recentes = this.sim.fs.itens
      .filter((i) => i.pasta !== LIXEIRA && ['docx', 'txt', 'pdf'].includes(i.tipo))
      .sort((a, b) => b.modificado - a.modificado)
      .slice(0, 4);
    this.conteudo.replaceChildren(
      h('div', { class: 'iniciar-secao' }, h('strong', { text: 'Fixado' }), h('button', { type: 'button', class: 'iniciar-mais' }, 'Todos os aplicativos ', icone('chevron_right', { tamanho: 12 }))),
      h(
        'div',
        { class: 'iniciar-fixados' },
        FIXADOS.map((app) =>
          h(
            'button',
            { type: 'button', class: 'iniciar-app', 'data-alvo': `iniciar.app.${app.id}`, onClick: () => this.sim.abrirApp(app.id, { via: 'iniciar' }) },
            icone(app.icone, { tamanho: 32 }),
            h('span', { text: app.nome })
          )
        )
      ),
      h('div', { class: 'iniciar-secao' }, h('strong', { text: 'Recomendado' })),
      h(
        'div',
        { class: 'iniciar-recomendados' },
        recentes.length
          ? recentes.map((item) =>
              h(
                'button',
                { type: 'button', class: 'iniciar-recente', onClick: () => (this.fechar(), this.sim.abrirArquivo(item, { via: 'iniciar' })) },
                iconeDoArquivo(item, 28),
                h('span', {}, h('strong', { text: item.nome }), h('small', { text: tempoAtras(item.modificado) }))
              )
            )
          : h('p', { class: 'iniciar-vazio', text: 'Os arquivos que você usar aparecerão aqui.' })
      )
    );
  }

  desenharBusca(termo) {
    const apps = FIXADOS.filter((a) => comparavel(a.nome).includes(termo) || (a.id === 'word' && 'documento texto'.includes(termo)));
    const arquivos = this.sim.fs.itens.filter((i) => i.pasta !== LIXEIRA && i.tipo !== 'pasta' && comparavel(i.nome).includes(termo)).slice(0, 5);
    const resultado = (rotulo, sub, ico, acao) =>
      h('button', { type: 'button', class: 'iniciar-resultado', onClick: acao }, ico, h('span', {}, h('strong', { text: rotulo }), h('small', { text: sub })));
    this.conteudo.replaceChildren(
      h('div', { class: 'iniciar-secao' }, h('strong', { text: apps.length || arquivos.length ? 'Melhor correspondência' : 'Nenhum resultado' })),
      h(
        'div',
        { class: 'iniciar-resultados' },
        apps.map((a) => resultado(a.nome, 'Aplicativo', icone(a.icone, { tamanho: 28 }), () => this.sim.abrirApp(a.id, { via: 'pesquisa' }))),
        arquivos.map((i) => resultado(i.nome, `Documento - ${i.pasta}`, iconeDoArquivo(i, 28), () => (this.fechar(), this.sim.abrirArquivo(i, { via: 'pesquisa' }))))
      )
    );
  }

  menuEnergia(botao) {
    MenuDeContexto.abrir({
      ancora: botao,
      raiz: this.sim.el,
      itens: [
        { rotulo: 'Suspender', icone: 'clock', acao: () => this.sim.emitir({ tipo: 'desligar' }) },
        { rotulo: 'Desligar (sair do simulador)', icone: 'power', alvo: 'iniciar.desligar', acao: () => this.sim.emitir({ tipo: 'desligar' }) },
      ],
    });
  }
}

function tempoAtras(ms) {
  const minutos = Math.round((Date.now() - ms) / 60000);
  if (minutos < 1) return 'Agora há pouco';
  if (minutos < 60) return `Há ${minutos} min`;
  return new Date(ms).toLocaleDateString('pt-BR');
}
