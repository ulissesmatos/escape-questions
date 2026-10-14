import { h } from '../../../core/dom.js';
import { Dialogo } from './Dialogo.js';
import { icone, iconeDoArquivo } from './icones.js';
import { PASTAS_RAIZ, TIPOS, ErroDeArquivo, SistemaDeArquivos, separarExtensao, validarNome } from '../regras/SistemaDeArquivos.js';

const ICONE_PASTA = { 'Área de Trabalho': 'desktop', Documentos: 'document', Imagens: 'image', Downloads: 'arrow_download' };

/**
 * Janela "Salvar como" / "Abrir" do Windows.
 *
 * opcoes: { modo: 'salvar' | 'abrir', titulo, pasta, nome, tipos: [{ tipo,
 *           rotulo }], botao ('Salvar', 'Abrir', 'Inserir', 'Publicar'),
 *           nomeEvento }
 * abrir() → { pasta, nome, tipo } ou null.
 */
export class DialogoDeArquivo extends Dialogo {
  constructor(sim, opcoes) {
    const modo = opcoes.modo || 'salvar';
    super(sim, {
      nome: opcoes.nomeEvento || modo,
      titulo: opcoes.titulo || (modo === 'salvar' ? 'Salvar como' : 'Abrir'),
      largura: 760,
      classe: 'dlg-arquivo',
      botoes: [
        { rotulo: opcoes.botao || (modo === 'salvar' ? 'Salvar' : 'Abrir'), primario: true, alvo: `dialogo.${modo}.ok`, valor: 'ok', antes: () => this.confirmar() },
        { rotulo: 'Cancelar', valor: null, alvo: `dialogo.${modo}.cancelar` },
      ],
    });
    this.modo = modo;
    this.prefixo = `dialogo.${modo}`;
    this.pasta = opcoes.pasta || 'Documentos';
    this.tipos = opcoes.tipos || [{ tipo: 'docx', rotulo: 'Documento do Word (*.docx)' }];
    this.tipo = this.tipos[0].tipo;
    this.nomeInicial = opcoes.nome || '';
    this.historico = [];
    this.resultado = null;
  }

  aoAbrir() {
    this.sim.dialogoDeArquivo = this;
    this.lista = h('div', { class: 'arq-lista', role: 'listbox' });
    this.caminho = h('div', { class: 'arq-caminho' });
    this.navegacao = h('nav', { class: 'arq-nav' });
    this.campoNome = h('input', {
      type: 'text',
      class: 'arq-campo-nome',
      value: this.nomeInicial,
      spellcheck: false,
      autocomplete: 'off',
      'data-alvo': `${this.prefixo}.nome`,
      autofocus: this.modo === 'salvar' ? true : null,
    });
    this.campoTipo = h(
      'select',
      { class: 'arq-campo-tipo', 'data-alvo': `${this.prefixo}.tipo`, onChange: () => ((this.tipo = this.campoTipo.value), this.desenharLista()) },
      this.tipos.map((t) => h('option', { value: t.tipo, text: t.rotulo }))
    );
    this.erro = h('p', { class: 'arq-erro', role: 'alert', hidden: true });

    const barraEndereco = h(
      'div',
      { class: 'arq-endereco' },
      h('button', { type: 'button', class: 'arq-nav-botao', 'aria-label': 'Voltar', onClick: () => this.voltar() }, icone('arrow_left', { tamanho: 16 })),
      h('button', { type: 'button', class: 'arq-nav-botao', 'aria-label': 'Acima', onClick: () => this.acima() }, icone('arrow_up', { tamanho: 16 })),
      this.caminho,
      h('div', { class: 'arq-pesquisa' }, icone('search', { tamanho: 14 }), h('span', { text: 'Pesquisar' }))
    );
    const comandos = h(
      'div',
      { class: 'arq-comandos' },
      h('button', { type: 'button', class: 'arq-comando' }, 'Organizar ', icone('chevron_down', { tamanho: 12 })),
      this.modo === 'salvar' &&
        h('button', { type: 'button', class: 'arq-comando', 'data-alvo': `${this.prefixo}.novaPasta`, onClick: () => this.novaPasta() }, icone('folder_add', { tamanho: 16 }), 'Nova pasta')
    );

    this.corpo.append(
      barraEndereco,
      comandos,
      h('div', { class: 'arq-meio' }, this.navegacao, this.lista),
      h(
        'div',
        { class: 'arq-campos' },
        h('label', {}, h('span', { text: this.modo === 'salvar' ? 'Nome do arquivo:' : 'Nome:' }), this.campoNome),
        h('label', {}, h('span', { text: this.modo === 'salvar' ? 'Tipo:' : 'Arquivos:' }), this.campoTipo)
      ),
      this.erro
    );
    this.campoNome.addEventListener('input', () => (this.erro.hidden = true));
    this.ir(this.pasta, { guardar: false });
    if (this.modo === 'salvar') setTimeout(() => this.campoNome.select(), 40);
  }

  aoFechar(valor) {
    if (this.sim.dialogoDeArquivo === this) this.sim.dialogoDeArquivo = null;
    if (valor !== 'ok') this.resultado = null;
    this.resolverArquivo?.(this.resultado);
  }

  /** Como abrir(), mas devolve { pasta, nome, tipo } */
  escolher() {
    const promessa = new Promise((resolver) => (this.resolverArquivo = resolver));
    this.abrir();
    return promessa;
  }

  ir(pasta, { guardar = true } = {}) {
    if (guardar && pasta !== this.pasta) this.historico.push(this.pasta);
    this.pasta = pasta;
    this.desenharNavegacao();
    this.desenharCaminho();
    this.desenharLista();
    this.sim.emitir({ tipo: 'navegar', onde: 'dialogo', pasta });
  }

  voltar() {
    if (this.historico.length) this.ir(this.historico.pop(), { guardar: false });
  }

  acima() {
    if (this.pasta.includes('/')) this.ir(this.pasta.split('/').slice(0, -1).join('/'));
  }

  desenharNavegacao() {
    this.navegacao.replaceChildren(
      h('div', { class: 'arq-nav-grupo' }, icone('desktop', { tamanho: 16 }), 'Este Computador'),
      ...PASTAS_RAIZ.map((p) =>
        h(
          'button',
          {
            type: 'button',
            class: `arq-nav-item${this.pasta === p || this.pasta.startsWith(`${p}/`) ? ' ativo' : ''}`,
            'data-alvo': `${this.prefixo}.nav.${p}`,
            onClick: () => this.ir(p),
          },
          icone(ICONE_PASTA[p], { tamanho: 16 }),
          p
        )
      )
    );
  }

  desenharCaminho() {
    const partes = this.pasta.split('/');
    this.caminho.replaceChildren(
      icone('desktop', { tamanho: 14 }),
      ...partes.flatMap((parte, i) => [
        h('span', { class: 'arq-caminho-sep' }, icone('chevron_right', { tamanho: 10 })),
        h('button', { type: 'button', class: 'arq-caminho-parte', text: parte, onClick: () => this.ir(partes.slice(0, i + 1).join('/')) }),
      ])
    );
  }

  /** Mostra pastas e os arquivos do tipo escolhido */
  desenharLista() {
    const itens = this.sim.fs.listar(this.pasta).filter((i) => i.tipo === 'pasta' || this.aceita(i.tipo));
    const cabecalho = h('div', { class: 'arq-linha arq-cabecalho' }, h('span', { text: 'Nome' }), h('span', { text: 'Data de modificação' }), h('span', { text: 'Tipo' }));
    if (!itens.length) {
      this.lista.replaceChildren(cabecalho, h('p', { class: 'arq-vazio', text: 'Nenhum item corresponde à sua pesquisa.' }));
      return;
    }
    this.lista.replaceChildren(
      cabecalho,
      ...itens.map((item) => {
        const linha = h(
          'button',
          { type: 'button', class: 'arq-linha', role: 'option', 'data-alvo': `${this.prefixo}.item.${item.nome}` },
          h('span', { class: 'arq-nome' }, iconeDoArquivo(item, 18), item.nome),
          h('span', { text: new Date(item.modificado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }),
          h('span', { text: TIPOS[item.tipo].descricao })
        );
        linha.addEventListener('click', () => {
          for (const l of this.lista.querySelectorAll('.selecionado')) l.classList.remove('selecionado');
          linha.classList.add('selecionado');
          if (item.tipo !== 'pasta') {
            this.campoNome.value = item.nome;
            this.selecionado = item;
          }
        });
        linha.addEventListener('dblclick', () => {
          if (item.tipo === 'pasta') this.ir(SistemaDeArquivos.caminhoDaPasta(item));
          else this.clicar((this.opcoes.botoes || [])[0]);
        });
        return linha;
      })
    );
  }

  aceita(tipo) {
    if (this.modo === 'salvar') return tipo === this.tipo;
    return this.tipos.some((t) => t.tipo === tipo || (t.tipos && t.tipos.includes(tipo)));
  }

  mostrarErro(texto) {
    this.erro.textContent = texto;
    this.erro.hidden = false;
  }

  async novaPasta() {
    const item = this.sim.fs.criarPasta(this.pasta);
    this.sim.emitir({ tipo: 'arquivo', acao: 'criar-pasta', nome: item.nome, pasta: this.pasta, tipoItem: 'pasta' });
    this.desenharLista();
    const linha = this.lista.querySelector(`[data-alvo="${CSS.escape(`${this.prefixo}.item.${item.nome}`)}"]`);
    if (!linha) return;
    const campo = h('input', { type: 'text', class: 'arq-renomear', value: item.nome });
    const nome = linha.querySelector('.arq-nome');
    nome.lastChild.replaceWith(campo);
    campo.select();
    const terminar = () => {
      try {
        if (campo.value.trim() && campo.value.trim() !== item.nome) {
          const antigo = item.nome;
          this.sim.fs.renomear(item, campo.value);
          this.sim.emitir({ tipo: 'arquivo', acao: 'renomear', nome: item.nome, antigo, pasta: this.pasta, tipoItem: 'pasta' });
        }
      } catch (erro) {
        this.mostrarErro(erro.message);
      }
      this.desenharLista();
    };
    campo.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') campo.blur();
      if (e.key === 'Escape') this.desenharLista();
    });
    campo.addEventListener('blur', terminar, { once: true });
  }

  async confirmar() {
    const digitado = this.campoNome.value.trim();
    if (this.modo === 'abrir') {
      const { base } = separarExtensao(digitado);
      const item = this.sim.fs.listar(this.pasta).find((i) => i.tipo !== 'pasta' && this.aceita(i.tipo) && i.nome.toLowerCase() === base.toLowerCase());
      if (!item) {
        this.mostrarErro(digitado ? `"${digitado}" não foi encontrado. Escolha um arquivo da lista.` : 'Clique num arquivo da lista.');
        return false;
      }
      this.resultado = { pasta: this.pasta, nome: item.nome, tipo: item.tipo, item };
      return true;
    }
    const { base, tipo: tipoDigitado } = separarExtensao(digitado);
    let nome;
    try {
      nome = validarNome(base);
    } catch (erro) {
      if (erro instanceof ErroDeArquivo) {
        await Dialogo.mensagem(this.sim, { titulo: this.opcoes.titulo || 'Salvar como', texto: erro.message, tipo: 'erro', nome: 'nomeInvalido' });
        return false;
      }
      throw erro;
    }
    const tipo = tipoDigitado && this.tipos.some((t) => t.tipo === tipoDigitado) ? tipoDigitado : this.tipo;
    if (this.sim.fs.obter(this.pasta, nome, tipo)) {
      const resposta = await Dialogo.mensagem(this.sim, {
        titulo: 'Confirmar Salvar como',
        texto: `${nome}${TIPOS[tipo].extensao} já existe.\nDeseja substituí-lo?`,
        tipo: 'aviso',
        botoes: ['Sim', 'Não'],
        nome: 'substituir',
      });
      if (resposta !== 'Sim') return false;
    }
    this.resultado = { pasta: this.pasta, nome, tipo };
    return true;
  }
}
