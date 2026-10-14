import { h } from '../../../core/dom.js';
import { normalizarArroba, problemaDoArroba, sugerirArrobas } from '../regras/arroba.js';

/**
 * Tela de entrada: "Já tenho meu @" (só digitar o @) ou "Criar meu @"
 * (nome, turma e o @, conferido na hora). Com um @ salvo no computador,
 * aparece o atalho "Continuar como @fulano".
 *
 * props: { sessao, aoEntrar() }
 */
export class TelaEntrada {
  constructor(props) {
    this.props = props;
    this.modo = props.sessao.ultimoArroba ? 'entrar' : 'criar';
    this.painel = h('div', { class: 'entrada-painel' });
    this.el = h(
      'section',
      { class: 'tela-entrada' },
      h('div', { class: 'entrada-arte', 'aria-hidden': 'true' }),
      h(
        'div',
        { class: 'entrada-caixa' },
        h('p', { class: 'entrada-olho', text: 'COMANDO CENTRAL • ACESSO DE AGENTE' }),
        h('h1', { class: 'entrada-titulo' }, 'OPERAÇÃO', h('br'), 'WORD'),
        h('p', { class: 'entrada-texto', text: 'O Dr. Kaos quer acabar com todos os documentos do mundo. A Central precisa de agentes que dominem o Word. Você topa?' }),
        this.painel,
        h('a', { href: 'index.html', class: 'entrada-voltar', text: '← Voltar para as atividades' })
      )
    );
    this.desenhar();
  }

  desenhar() {
    const abas = h(
      'div',
      { class: 'entrada-abas', role: 'tablist' },
      [
        ['entrar', 'Já tenho meu @'],
        ['criar', 'Criar meu @'],
      ].map(([id, rotulo]) =>
        h('button', {
          type: 'button',
          role: 'tab',
          class: id === this.modo ? 'ativa' : '',
          'aria-selected': String(id === this.modo),
          text: rotulo,
          onClick: () => {
            this.modo = id;
            this.desenhar();
          },
        })
      )
    );
    this.painel.replaceChildren(abas, this.modo === 'entrar' ? this.formEntrar() : this.formCriar());
    setTimeout(() => this.painel.querySelector('input')?.focus(), 30);
  }

  campoArroba(valor = '') {
    const campo = h('input', { type: 'text', class: 'entrada-arroba-campo', value: valor, placeholder: 'seu.arroba', autocomplete: 'off', autocapitalize: 'none', spellcheck: false, maxlength: 21, 'aria-label': 'Seu @' });
    return { campo, caixa: h('div', { class: 'entrada-arroba' }, h('span', { class: 'entrada-arroba-simbolo', text: '@' }), campo) };
  }

  formEntrar() {
    const ultimo = this.props.sessao.ultimoArroba;
    const { campo, caixa } = this.campoArroba(ultimo || '');
    const erro = h('p', { class: 'entrada-erro', role: 'alert', hidden: true });
    const botao = h('button', { type: 'submit', class: 'entrada-botao', text: 'Entrar na Central' });
    const form = h('form', { class: 'entrada-form', novalidate: true }, h('label', { class: 'entrada-rotulo', text: 'Digite o seu @' }), caixa, erro, botao, h('p', { class: 'entrada-ajuda', text: 'Esqueceu o seu @? Peça para o professor: ele consegue ver na área do professor.' }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const arroba = normalizarArroba(campo.value);
      if (!arroba) {
        erro.textContent = 'Digite o seu @.';
        erro.hidden = false;
        return campo.focus();
      }
      botao.disabled = true;
      botao.textContent = 'Entrando...';
      try {
        await this.props.sessao.entrar(arroba);
        this.props.aoEntrar();
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
        botao.disabled = false;
        botao.textContent = 'Entrar na Central';
        campo.select();
      }
    });
    return form;
  }

  formCriar() {
    const nome = h('input', { type: 'text', class: 'entrada-campo', placeholder: 'Ex.: Ana Júlia Souza', autocomplete: 'off', maxlength: 40 });
    const turma = h('input', { type: 'text', class: 'entrada-campo', placeholder: 'Ex.: 7º B', autocomplete: 'off', maxlength: 30 });
    const { campo, caixa } = this.campoArroba();
    const situacao = h('p', { class: 'entrada-situacao' });
    const sugestoes = h('div', { class: 'entrada-sugestoes' });
    const erro = h('p', { class: 'entrada-erro', role: 'alert', hidden: true });
    const botao = h('button', { type: 'submit', class: 'entrada-botao', text: 'Criar meu @ e entrar' });
    let consulta = 0;

    const conferir = async () => {
      const arroba = normalizarArroba(campo.value);
      caixa.classList.remove('ok', 'ruim');
      if (!arroba) {
        situacao.textContent = '';
        return;
      }
      const problema = problemaDoArroba(arroba);
      if (problema) {
        situacao.textContent = problema;
        caixa.classList.add('ruim');
        return;
      }
      const minha = ++consulta;
      situacao.textContent = 'Conferindo...';
      try {
        const r = await this.props.sessao.disponivel(arroba);
        if (minha !== consulta) return;
        situacao.textContent = r.disponivel ? `@${r.arroba} está livre!` : r.erro;
        caixa.classList.add(r.disponivel ? 'ok' : 'ruim');
      } catch {
        if (minha === consulta) situacao.textContent = 'Sem conexão para conferir agora.';
      }
    };
    let tempo;
    campo.addEventListener('input', () => {
      clearTimeout(tempo);
      tempo = setTimeout(conferir, 350);
    });
    const atualizarSugestoes = () => {
      const ideias = sugerirArrobas(nome.value, turma.value);
      sugestoes.replaceChildren(
        ...(ideias.length ? [h('span', { text: 'Ideias:' })] : []),
        ...ideias.map((i) =>
          h('button', {
            type: 'button',
            class: 'entrada-sugestao',
            text: `@${i}`,
            onClick: () => {
              campo.value = i;
              conferir();
            },
          })
        )
      );
    };
    nome.addEventListener('input', atualizarSugestoes);
    turma.addEventListener('input', atualizarSugestoes);

    const form = h(
      'form',
      { class: 'entrada-form', novalidate: true },
      h('label', { class: 'entrada-rotulo' }, 'Seu nome', nome),
      h('label', { class: 'entrada-rotulo' }, 'Sua turma', turma),
      h('label', { class: 'entrada-rotulo' }, 'Escolha o seu @', caixa),
      situacao,
      sugestoes,
      h('p', { class: 'entrada-ajuda', text: 'O @ é a sua chave para continuar depois, em qualquer computador. Não precisa de senha: anote no caderno!' }),
      erro,
      botao
    );
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.hidden = true;
      const dados = { nome: nome.value.trim(), turma: turma.value.trim(), arroba: normalizarArroba(campo.value) };
      const falta = !dados.nome ? nome : !dados.turma ? turma : !dados.arroba ? campo : null;
      if (falta) {
        erro.textContent = 'Preencha seu nome, sua turma e o @ que você quer.';
        erro.hidden = false;
        return falta.focus();
      }
      const problema = problemaDoArroba(dados.arroba);
      if (problema) {
        erro.textContent = problema;
        erro.hidden = false;
        return campo.focus();
      }
      botao.disabled = true;
      botao.textContent = 'Criando...';
      try {
        await this.props.sessao.criar(dados);
        this.mostrarCriado(dados.arroba);
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
        botao.disabled = false;
        botao.textContent = 'Criar meu @ e entrar';
      }
    });
    return form;
  }

  mostrarCriado(arroba) {
    this.painel.replaceChildren(
      h(
        'div',
        { class: 'entrada-criado' },
        h('p', { class: 'entrada-olho', text: 'CRACHÁ DE AGENTE EMITIDO' }),
        h('div', { class: 'entrada-cracha' }, h('span', { text: 'Seu @ é' }), h('strong', { text: `@${arroba}` })),
        h('p', { class: 'entrada-texto', text: 'Anote o seu @ no caderno. Da próxima vez, é só digitar ele para continuar de onde parou.' }),
        h('button', { type: 'button', class: 'entrada-botao', text: 'Anotei! Ir para a Central', onClick: () => this.props.aoEntrar() })
      )
    );
  }
}
