import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';
import { estadoCarregando, estadoVazio } from '../../components/ui.js';
import { Tabs, TurmaFilter } from '../components/widgets.js';

/**
 * Seção do painel (item do menu lateral). Subclasses definem id, título,
 * ícone, descrição e as abas (cada aba é uma classe AdminTab).
 * props: { api, router }
 */
export class AdminSection extends Component {
  static id = '';
  static titulo = '';
  static icone = '';
  static descricao = '';
  /** @type {Array<{ id: string, rotulo: string, Classe: typeof AdminTab }>} */
  static abas = [];

  render() {
    const { titulo, descricao } = this.constructor;
    this.areaAbas = h('div');
    this.conteudo = h('div', { class: 'secao-admin-conteudo' });
    return h(
      'section',
      { class: 'secao-admin' },
      h('div', { class: 'secao-admin-cabecalho' }, h('div', {}, h('h1', { text: titulo }), descricao && h('p', { text: descricao }))),
      this.areaAbas,
      this.conteudo
    );
  }

  mostrarAba(idAba) {
    const abas = this.constructor.abas;
    const aba = abas.find((a) => a.id === idAba) || abas[0];

    if (abas.length > 1) {
      this.areaAbas.replaceChildren(
        new Tabs({
          abas,
          ativa: aba.id,
          onTrocar: (id) => this.props.router.ir(`/${this.constructor.id}/${id}`),
        }).montar()
      );
    }

    if (this.abaAtual) this.abaAtual.destruir();
    this.abaAtual = new aba.Classe({ api: this.props.api, router: this.props.router, secao: this });
    this.conteudo.replaceChildren(this.abaAtual.montar());
  }

  destruir() {
    if (this.abaAtual) this.abaAtual.destruir();
    super.destruir();
  }
}

/**
 * Conteúdo de uma aba: carrega dados da API e desenha. Chame recarregar()
 * depois de salvar/excluir algo.
 * props: { api, router }
 */
export class AdminTab extends Component {
  render() {
    this.area = h('div', { class: 'aba-conteudo' }, estadoCarregando());
    return this.area;
  }

  aoMontar() {
    this.recarregar();
  }

  /** @abstract Busca os dados (retorno vai para desenhar) */
  async carregar() {
    return null;
  }

  /** @abstract @returns {Node|Node[]} */
  desenhar(dados) { // eslint-disable-line no-unused-vars
    return null;
  }

  async recarregar() {
    const token = (this.tokenCarga = (this.tokenCarga || 0) + 1);
    try {
      this.dados = await this.carregar();
    } catch (err) {
      if (token !== this.tokenCarga || !this.el) return;
      this.area.replaceChildren(
        estadoVazio({
          icone: '⚠️',
          titulo: 'Não foi possível carregar',
          texto: err.message,
          acao: h('button', { type: 'button', class: 'btn btn-primario', text: 'Tentar de novo', onClick: () => this.recarregar() }),
        })
      );
      return;
    }
    if (token !== this.tokenCarga || !this.el) return;
    this.redesenhar();
  }

  redesenhar() {
    const resultado = this.desenhar(this.dados);
    this.area.replaceChildren(...[resultado].flat(Infinity).filter(Boolean));
  }

  /** Filtro de turma criado uma vez e reaproveitado entre recargas (this.turma) */
  filtroTurma() {
    if (!this.elementoFiltroTurma) {
      this.elementoFiltroTurma = new TurmaFilter({
        api: this.props.api,
        valor: this.turma,
        onMudar: (turma) => {
          this.turma = turma;
          this.recarregar();
        },
      }).montar();
    }
    return this.elementoFiltroTurma;
  }
}
