import { h } from '../../../../core/dom.js';
import { Janela } from '../Janela.js';

/** Fotos do Windows: mostra a imagem com fundo escuro */
export class Fotos {
  constructor(sim) {
    this.sim = sim;
    this.janela = new Janela(sim, { app: 'fotos', titulo: 'Fotos', icone: 'img:image-48-color', largura: 720, altura: 500, classe: 'janela-fotos' });
    this.imagem = h('img', { class: 'fotos-imagem', alt: '' });
    this.legenda = h('div', { class: 'fotos-legenda' });
    this.janela.conteudo.append(h('div', { class: 'fotos-palco' }, this.imagem), this.legenda);
  }

  abrirArquivo(item) {
    this.imagem.src = item.conteudo.src;
    this.imagem.alt = item.nome;
    this.legenda.textContent = `${item.nome}.png · ${item.conteudo.larguraPx} × ${item.conteudo.alturaPx}`;
    this.janela.definirTitulo(`${item.nome}.png - Fotos`);
    this.sim.emitir({ tipo: 'arquivo', acao: 'abrir', nome: item.nome, pasta: item.pasta, tipoItem: item.tipo, app: 'fotos' });
  }

  estado() {
    return {};
  }
}
