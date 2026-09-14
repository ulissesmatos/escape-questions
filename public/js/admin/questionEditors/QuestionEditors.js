import { h } from '../../core/dom.js';
import { CampoTexto, CampoNumero, linhaCampos } from '../components/campos.js';
import { TextListEditor, StatementListEditor, PairListEditor } from './ListEditors.js';

/**
 * Editor do conteúdo de uma questão do Mapa de Hardware. Cada tipo de
 * pergunta tem sua subclasse — o formulário só chama renderizar() e
 * lerConteudo(), sem saber qual tipo está editando.
 */
export class QuestionEditor {
  static tipo = '';
  static rotulo = '';
  static dica = '';

  constructor(conteudo = {}) {
    const { variantes, ...base } = conteudo;
    this.conteudo = base;
    this.variantes = Array.isArray(variantes) ? variantes : [];
  }

  /** Se a pergunta principal é obrigatória (V/F usa a própria afirmação) */
  get perguntaObrigatoria() {
    return true;
  }

  get exemploPergunta() {
    return 'Ex: Qual é a função da placa de vídeo?';
  }

  renderizar() {
    this.campoVariantes = new CampoTexto({
      rotulo: 'Variações (JSON)',
      multilinha: true,
      linhas: 5,
      max: 20000,
      ajuda: 'Opcional. Lista de versões da mesma pergunta; cada aluno recebe uma sorteada. Cada item pode trocar "pergunta" e qualquer campo acima.',
    });
    if (this.variantes.length) this.campoVariantes.definir(JSON.stringify(this.variantes, null, 2));

    return h(
      'div',
      { class: 'editor-questao' },
      this.constructor.dica && h('p', { class: 'editor-dica', text: this.constructor.dica }),
      this.renderizarCampos(),
      h(
        'details',
        { class: 'editor-avancado', open: this.variantes.length > 0 },
        h('summary', { text: `Variações da pergunta${this.variantes.length ? ` (${this.variantes.length})` : ''}` }),
        this.campoVariantes.el
      )
    );
  }

  /** @abstract */
  renderizarCampos() {
    throw new Error('renderizarCampos() não implementado');
  }

  /** @abstract Conteúdo específico do tipo */
  lerCampos() {
    throw new Error('lerCampos() não implementado');
  }

  lerConteudo() {
    const conteudo = this.lerCampos();
    const bruto = this.campoVariantes.obter();
    if (bruto) {
      let variantes;
      try {
        variantes = JSON.parse(bruto);
      } catch {
        throw new Error('As variações precisam ser um JSON válido (uma lista entre [ ]).');
      }
      if (!Array.isArray(variantes)) throw new Error('As variações precisam ser uma lista (entre [ ]).');
      if (variantes.length) conteudo.variantes = variantes;
    }
    return conteudo;
  }
}

export class MultipleChoiceEditor extends QuestionEditor {
  static tipo = 'multipla_escolha';
  static rotulo = 'Múltipla escolha';
  static dica = 'Cadastre várias alternativas certas e erradas: cada aluno recebe 1 certa + erradas sorteadas, em ordem embaralhada.';

  renderizarCampos() {
    this.corretas = new TextListEditor({ rotulo: '✓ Alternativas corretas', valores: this.conteudo.corretas, placeholder: 'Uma resposta certa', textoAdicionar: '+ Outra forma de dizer a resposta certa' });
    this.incorretas = new TextListEditor({ rotulo: '✗ Alternativas erradas', valores: this.conteudo.incorretas, placeholder: 'Uma resposta errada (mas convincente)', textoAdicionar: '+ Alternativa errada', minimo: 3 });
    this.quantidade = new CampoNumero({ rotulo: 'Alternativas exibidas', min: 2, max: 6, ajuda: 'Quantas opções o aluno vê (padrão 4).' });
    this.quantidade.definir(this.conteudo.quantidade || 4);
    return h('div', {}, this.corretas.montar(), this.incorretas.montar(), this.quantidade.el);
  }

  lerCampos() {
    return { corretas: this.corretas.obter(), incorretas: this.incorretas.obter(), quantidade: this.quantidade.obter() || 4 };
  }
}

export class TrueFalseEditor extends QuestionEditor {
  static tipo = 'verdadeiro_falso';
  static rotulo = 'Verdadeiro ou falso';
  static dica = 'Cadastre afirmações verdadeiras E falsas: o sistema sorteia uma, equilibrando os dois lados.';

  get perguntaObrigatoria() {
    return false;
  }

  get exemploPergunta() {
    return 'Essa afirmação é verdadeira ou falsa?';
  }

  renderizarCampos() {
    this.afirmacoes = new StatementListEditor({ rotulo: 'Afirmações', valores: this.conteudo.afirmacoes, textoAdicionar: '+ Afirmação', minimo: 2 });
    return this.afirmacoes.montar();
  }

  lerCampos() {
    return { afirmacoes: this.afirmacoes.obter() };
  }
}

export class TextEditor extends QuestionEditor {
  static tipo = 'texto';
  static rotulo = 'Resposta escrita';
  static dica = 'Acentos e maiúsculas são ignorados, e erros pequenos de digitação são aceitos em palavras longas.';

  renderizarCampos() {
    this.respostas = new TextListEditor({ rotulo: 'Respostas aceitas', valores: this.conteudo.respostas, placeholder: 'Ex: memória RAM', textoAdicionar: '+ Outra grafia aceita' });
    this.dicaCampo = new CampoTexto({ rotulo: 'Dica no campo (opcional)', placeholder: 'Ex: Uma palavra' });
    this.dicaCampo.definir(this.conteudo.dica);
    return h('div', {}, this.respostas.montar(), this.dicaCampo.el);
  }

  lerCampos() {
    return { respostas: this.respostas.obter(), ...(this.dicaCampo.obter() && { dica: this.dicaCampo.obter() }) };
  }
}

export class NumberEditor extends QuestionEditor {
  static tipo = 'numero';
  static rotulo = 'Número (slider)';
  static dica = 'O aluno arrasta um slider. A posição inicial é sorteada longe da resposta.';

  renderizarCampos() {
    this.campos = {
      min: new CampoNumero({ rotulo: 'Mínimo', passo: 'any' }),
      max: new CampoNumero({ rotulo: 'Máximo', passo: 'any' }),
      passo: new CampoNumero({ rotulo: 'Passo', passo: 'any', ajuda: 'De quanto em quanto o slider anda' }),
      resposta: new CampoNumero({ rotulo: 'Resposta certa', passo: 'any' }),
      tolerancia: new CampoNumero({ rotulo: 'Tolerância (±)', passo: 'any', ajuda: '0 = valor exato' }),
      unidade: new CampoTexto({ rotulo: 'Unidade', placeholder: 'Ex: GB, W, pixels' }),
    };
    const c = this.conteudo;
    this.campos.min.definir(c.min ?? 0);
    this.campos.max.definir(c.max ?? 100);
    this.campos.passo.definir(c.passo ?? 1);
    this.campos.resposta.definir(c.resposta);
    this.campos.tolerancia.definir(c.tolerancia ?? 0);
    this.campos.unidade.definir(c.unidade);
    const { min, max, passo, resposta, tolerancia, unidade } = this.campos;
    return h('div', {}, linhaCampos(min, max, passo), linhaCampos(resposta, tolerancia, unidade));
  }

  lerCampos() {
    const v = Object.fromEntries(Object.entries(this.campos).map(([k, campo]) => [k, campo.obter()]));
    return { ...v, tolerancia: v.tolerancia || 0 };
  }
}

export class OrderingEditor extends QuestionEditor {
  static tipo = 'ordenar';
  static rotulo = 'Colocar em ordem';
  static dica = 'Cadastre os itens JÁ na ordem correta — o aluno recebe embaralhado.';

  renderizarCampos() {
    this.itens = new TextListEditor({ rotulo: 'Itens na ordem certa', valores: this.conteudo.itens, placeholder: 'Item', textoAdicionar: '+ Item', minimo: 3, reordenavel: true });
    this.inicio = new CampoTexto({ rotulo: 'Rótulo do início', placeholder: 'Ex: Menor' });
    this.fim = new CampoTexto({ rotulo: 'Rótulo do fim', placeholder: 'Ex: Maior' });
    this.inicio.definir(this.conteudo.rotuloInicio);
    this.fim.definir(this.conteudo.rotuloFim);
    return h('div', {}, this.itens.montar(), linhaCampos(this.inicio, this.fim));
  }

  lerCampos() {
    return { itens: this.itens.obter(), rotuloInicio: this.inicio.obter(), rotuloFim: this.fim.obter() };
  }
}

export class AnagramEditor extends QuestionEditor {
  static tipo = 'anagrama';
  static rotulo = 'Palavra embaralhada';
  static dica = 'Uma palavra de 3 a 14 letras (sem espaços). O aluno monta tocando nas letras.';

  get exemploPergunta() {
    return 'Ex: Monte o nome da peça que resfria o processador.';
  }

  renderizarCampos() {
    this.palavra = new CampoTexto({ rotulo: 'Palavra', placeholder: 'Ex: COOLER', max: 14 });
    this.dicaCampo = new CampoTexto({ rotulo: 'Dica (opcional)', placeholder: 'Ex: 6 letras' });
    this.palavra.definir(this.conteudo.palavra);
    this.dicaCampo.definir(this.conteudo.dica);
    return linhaCampos(this.palavra, this.dicaCampo);
  }

  lerCampos() {
    return { palavra: this.palavra.obter().toUpperCase(), ...(this.dicaCampo.obter() && { dica: this.dicaCampo.obter() }) };
  }
}

export class MatchingEditor extends QuestionEditor {
  static tipo = 'associar';
  static rotulo = 'Ligar pares';
  static dica = 'Cadastre mais pares do que o aluno vê: a cada vez são sorteados alguns.';

  renderizarCampos() {
    this.pares = new PairListEditor({ rotulo: 'Pares', valores: this.conteudo.pares, textoAdicionar: '+ Par', minimo: 4 });
    this.quantidade = new CampoNumero({ rotulo: 'Pares exibidos', min: 2, max: 6, ajuda: 'Quantos pares o aluno liga por vez (padrão 4).' });
    this.quantidade.definir(this.conteudo.quantidade || 4);
    return h('div', {}, this.pares.montar(), this.quantidade.el);
  }

  lerCampos() {
    return { pares: this.pares.obter(), quantidade: this.quantidade.obter() || 4 };
  }
}

export class QuestionEditorFactory {
  static classes = [MultipleChoiceEditor, TrueFalseEditor, TextEditor, NumberEditor, OrderingEditor, AnagramEditor, MatchingEditor];

  static opcoes() {
    return QuestionEditorFactory.classes.map((C) => ({ valor: C.tipo, rotulo: C.rotulo }));
  }

  static rotulo(tipo) {
    const Classe = QuestionEditorFactory.classes.find((C) => C.tipo === tipo);
    return Classe ? Classe.rotulo : tipo;
  }

  static criar(tipo, conteudo) {
    const Classe = QuestionEditorFactory.classes.find((C) => C.tipo === tipo) || MultipleChoiceEditor;
    return new Classe(conteudo);
  }
}
