import { h } from '../../core/dom.js';
import { api } from '../../core/ApiClient.js';
import { IdentityForm } from '../../components/IdentityForm.js';
import { ProgressBar, estadoCarregando, estadoVazio } from '../../components/ui.js';
import { PistaCard } from './PistaCard.js';

/** Escape Room: identificação + todas as pistas + envio único no final. */
export class EscapeRoomPage {
  constructor(raiz) {
    this.raiz = raiz;
    this.cartoes = [];
    this.enviando = false;
  }

  async iniciar() {
    this.identificacao = new IdentityForm({ titulo: 'Quem está jogando?', chave: 'escape' });
    this.progresso = new ProgressBar();
    this.lista = h('div', { class: 'lista-pistas' }, estadoCarregando('Carregando pistas...'));
    this.erro = h('div', { class: 'erro-msg', role: 'alert' });
    this.botaoEnviar = h('button', { type: 'submit', class: 'btn btn-primario btn-grande btn-bloco', text: 'Enviar respostas' });
    this.envio = h(
      'div',
      { class: 'envio-final', hidden: true },
      this.erro,
      this.botaoEnviar,
      h('p', { class: 'envio-dica', text: 'Confira tudo antes de enviar. A nota não aparece agora — o professor recebe as respostas.' })
    );

    this.formulario = h('form', { novalidate: true }, this.identificacao.montar(), this.progresso.montar(), this.lista, this.envio);
    this.formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      this.enviar();
    });

    this.sucesso = h(
      'section',
      { class: 'cartao tela-sucesso', hidden: true },
      h('div', { class: 'tela-sucesso-icone', text: '✅' }),
      h('h2', { text: 'Respostas enviadas!' }),
      h('p', { text: 'Suas respostas foram registradas. Aguarde as instruções do professor.' }),
      h('div', { class: 'acoes' }, h('a', { href: 'index.html', class: 'btn btn-contorno', text: 'Voltar ao início' }))
    );

    this.raiz.append(this.formulario, this.sucesso);
    await this.carregarPistas();
  }

  async carregarPistas() {
    let pistas;
    try {
      pistas = await api.get('/escape/pistas');
    } catch (err) {
      this.lista.replaceChildren(
        estadoVazio({
          icone: '⚠️',
          titulo: 'Não foi possível carregar as pistas',
          texto: err.message,
          acao: h('button', { type: 'button', class: 'btn btn-primario', text: 'Tentar de novo', onClick: () => this.carregarPistas() }),
        })
      );
      return;
    }

    if (!pistas.length) {
      this.lista.replaceChildren(estadoVazio({ icone: '🔎', titulo: 'Nenhuma pista cadastrada ainda', texto: 'Avise o professor.' }));
      return;
    }

    this.cartoes = pistas.map(
      (pista, i) => new PistaCard({ pista, numero: i + 1, total: pistas.length, onMudar: () => this.atualizarProgresso() })
    );
    this.lista.replaceChildren(...this.cartoes.map((c) => c.montar()));
    this.envio.hidden = false;
    this.atualizarProgresso();
  }

  atualizarProgresso() {
    const total = this.cartoes.length;
    const feitas = this.cartoes.filter((c) => c.respondida).length;
    const rotulo = total && feitas === total ? `Todas as ${total} pistas respondidas! Pode enviar 🎉` : `${feitas} de ${total} pistas respondidas`;
    this.progresso.definir(feitas, total, rotulo);
  }

  mostrarErro(mensagem) {
    this.erro.textContent = mensagem;
    this.erro.classList.add('mostrar');
  }

  async enviar() {
    if (this.enviando) return;
    this.erro.classList.remove('mostrar');

    const identidade = this.identificacao.obterIdentidade({ marcarErros: true });
    if (!identidade) {
      this.identificacao.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const pendentes = this.cartoes.filter((c) => !c.respondida);
    if (pendentes.length) {
      pendentes.forEach((c) => c.marcarPendente());
      const numeros = pendentes.map((c) => c.props.numero);
      this.mostrarErro(
        pendentes.length === 1
          ? `Falta responder a pista ${numeros[0]}.`
          : `Faltam ${pendentes.length} pistas: ${numeros.join(', ')}. Elas estão marcadas em vermelho.`
      );
      pendentes[0].el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const respostas = Object.fromEntries(this.cartoes.map((c) => [c.props.pista.id, c.obterResposta()]));

    this.enviando = true;
    this.botaoEnviar.disabled = true;
    this.botaoEnviar.textContent = 'Enviando...';
    try {
      await api.post('/escape/envios', { ...identidade, respostas });
      this.formulario.hidden = true;
      this.sucesso.hidden = false;
      this.sucesso.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      this.mostrarErro(err.message);
    } finally {
      this.enviando = false;
      this.botaoEnviar.disabled = false;
      this.botaoEnviar.textContent = 'Enviar respostas';
    }
  }
}
