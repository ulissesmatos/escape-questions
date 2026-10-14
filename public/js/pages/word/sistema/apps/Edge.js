import { h } from '../../../../core/dom.js';
import { Janela } from '../Janela.js';
import { icone } from '../icones.js';

/**
 * Microsoft Edge. O simulador não tem internet: sem arquivo, mostra a página
 * de "sem conexão". Com um PDF, mostra as páginas como o leitor de PDF do
 * Edge (é onde o aluno confere o PDF que exportou do Word).
 */
export class Edge {
  constructor(sim) {
    this.sim = sim;
    this.janela = new Janela(sim, { app: 'edge', titulo: 'Nova guia - Microsoft Edge', icone: 'img:logo-edge', largura: 880, altura: 560, classe: 'janela-edge' });
    this.endereco = h('div', { class: 'edge-endereco', text: 'Pesquisar ou inserir endereço Web' });
    this.aba = h('span', { class: 'edge-aba-texto', text: 'Nova guia' });
    this.pagina = h('div', { class: 'edge-pagina' });
    this.janela.conteudo.append(
      h('div', { class: 'edge-abas' }, h('div', { class: 'edge-aba' }, icone('img:logo-edge', { tamanho: 14 }), this.aba)),
      h('div', { class: 'edge-barra' }, icone('arrow_left', { tamanho: 16 }), icone('arrow_right', { tamanho: 16 }), icone('arrow_clockwise', { tamanho: 16 }), this.endereco),
      this.pagina
    );
    this.semInternet();
  }

  semInternet() {
    this.pagina.className = 'edge-pagina edge-offline';
    this.pagina.replaceChildren(
      h('div', { class: 'edge-offline-caixa' }, icone('img:satelite', { tamanho: 72 }), h('h2', { text: 'Hmmm... você não está conectado à Internet.' }), h('p', { text: 'Este computador é um simulador da Central: aqui não tem internet. O foco é o Word, agente!' }))
    );
  }

  abrirArquivo(item) {
    if (item.tipo !== 'pdf') return this.semInternet();
    const conteudo = item.conteudo || {};
    this.aba.textContent = `${item.nome}.pdf`;
    this.endereco.textContent = `C:/Usuários/${this.sim.conta.arroba}/${item.pasta}/${item.nome}.pdf`;
    this.janela.definirTitulo(`${item.nome}.pdf - Microsoft Edge`);
    this.pagina.className = 'edge-pagina edge-pdf';
    const folha = h('div', { class: `edge-pdf-folha doc-corpo${conteudo.layout?.orientacao === 'paisagem' ? ' paisagem' : ''}` });
    folha.innerHTML = conteudo.html || '';
    folha.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    if (conteudo.layout?.colunas > 1) folha.style.columnCount = conteudo.layout.colunas;
    this.pagina.replaceChildren(folha);
    this.sim.emitir({ tipo: 'arquivo', acao: 'abrir', nome: item.nome, pasta: item.pasta, tipoItem: item.tipo, app: 'edge' });
  }

  estado() {
    return {};
  }
}
