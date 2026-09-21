import { h } from '../../core/dom.js';
import { api } from '../../core/ApiClient.js';
import { Modal } from '../../components/Modal.js';
import { estadoCarregando } from '../../components/ui.js';
import { QuestionViewFactory } from '../../questions/QuestionViewFactory.js';
import { AntiCopia } from '../../core/antiCopia.js';

/**
 * Modal de desafio de uma peça do mapa. Estados:
 * carregando → pergunta → (acerto | erro | rápido demais | pausa) → nova pergunta ou fechar.
 *
 * props: { identidade, onResultado?({ resultado, componente }) }
 */
export class ChallengeModal extends Modal {
  constructor(props) {
    super({ classe: 'modal-desafio', ...props });
    this.token = 0;
  }

  abrirPara(componente, { descoberto = false } = {}) {
    this.componente = componente;
    this.abrir();
    this.definirCabecalho(this.cabecalhoDaPeca(descoberto ? '✓ Peça descoberta' : 'Peça liberada', descoberto));
    if (descoberto) this.mostrarDescoberta();
    else this.carregarDesafio();
  }

  fechar(opcoes) {
    this.token++;
    this.antiCopia?.parar();
    this.pararContagem();
    super.fechar(opcoes);
  }

  cabecalhoDaPeca(etiqueta, descoberto) {
    const { nome, imagem, icone } = this.componente;
    return h(
      'div',
      { class: 'desafio-cabecalho' },
      h('div', { class: 'modal-figura' }, imagem ? h('img', { src: imagem, alt: '' }) : h('span', { text: icone })),
      h(
        'div',
        { class: 'modal-titulo' },
        h('span', { class: `modal-etiqueta${descoberto ? ' descoberta' : ''}`, text: etiqueta }),
        h('h2', { text: nome })
      )
    );
  }

  // ---------------- Pergunta ----------------

  async carregarDesafio() {
    const meu = ++this.token;
    this.pararContagem();
    this.definirCorpo(estadoCarregando('Sorteando uma pergunta para você...'));
    this.definirRodape();

    let desafio;
    try {
      desafio = await api.post('/hardware/desafios', { ...this.props.identidade, componentId: this.componente.id });
    } catch (err) {
      if (meu !== this.token) return;
      if (err.status === 429) return this.mostrarPausa(err.dados.pausaRestanteMs);
      return this.mostrarFalha(err.message);
    }
    if (meu !== this.token) return;

    this.desafio = desafio;
    this.antiCopia?.parar();
    this.antiCopia = new AntiCopia({ aoTentar: (mensagem) => this.mostrarAviso(mensagem) }).vigiarAba();
    this.view = QuestionViewFactory.criar(desafio.questao, {
      onMudar: () => this.atualizarBotao(),
      onEnviar: () => this.confirmar(),
    });

    this.botaoConfirmar = h('button', { type: 'button', class: 'btn btn-primario', text: 'Confirmar resposta', onClick: () => this.confirmar() });
    this.definirCorpo(this.seloDificuldade(desafio), this.view.montar());
    this.definirRodape(this.botaoConfirmar);
    this.antiCopia.protegerTexto(this.corpo).protegerCampos(this.corpo);
    this.atualizarBotao();
  }

  seloDificuldade({ dificuldade, rotulo }) {
    return h(
      'div',
      { class: 'desafio-selo', title: 'O nível das perguntas se adapta ao seu desempenho' },
      h('span', { class: 'medidor-pontos', 'aria-hidden': 'true' }, [1, 2, 3, 4, 5].map((n) => h('span', { class: `medidor-ponto${n <= dificuldade ? ' ativo' : ''}` }))),
      h('span', { text: `Nível ${rotulo}` })
    );
  }

  atualizarBotao() {
    if (this.botaoConfirmar && this.view) this.botaoConfirmar.disabled = this.enviando || !this.view.estaRespondida();
  }

  async confirmar() {
    if (this.enviando || !this.view || !this.view.estaRespondida()) return;
    const meu = this.token;
    this.enviando = true;
    this.view.bloquear(true);
    this.botaoConfirmar.disabled = true;
    this.botaoConfirmar.textContent = 'Conferindo...';

    let resultado;
    try {
      resultado = await api.post(`/hardware/desafios/${this.desafio.desafioId}/resposta`, {
        ...this.props.identidade,
        resposta: this.view.obterResposta(),
        sinais: this.antiCopia.relatorio,
      });
    } catch (err) {
      this.enviando = false;
      if (meu !== this.token) return;
      if (err.status === 409 || err.status === 404) return this.mostrarFalha(err.message, { novaPergunta: true });
      this.view.bloquear(false);
      this.botaoConfirmar.textContent = 'Confirmar resposta';
      this.atualizarBotao();
      return this.mostrarAviso(err.message);
    }
    this.enviando = false;
    if (meu !== this.token) return;

    this.emitir('Resultado', { resultado, componente: this.componente });

    if (resultado.resultado === 'correta') this.mostrarAcerto(resultado);
    else if (resultado.resultado === 'rapido_demais') this.mostrarRapido(resultado);
    else this.mostrarErro(resultado);
  }

  mostrarAviso(mensagem) {
    const aviso = h('div', { class: 'erro-msg mostrar', role: 'alert', text: mensagem });
    this.corpo.querySelector('.erro-msg')?.remove();
    this.corpo.appendChild(aviso);
  }

  // ---------------- Resultados ----------------

  mostrarAcerto(r) {
    this.definirCabecalho(this.cabecalhoDaPeca('✓ Peça descoberta', true));
    this.definirCorpo(
      h(
        'div',
        { class: 'resultado resultado-acerto' },
        h('span', { class: 'resultado-icone', 'aria-hidden': 'true', text: r.nivelCompleto ? '🏆' : '🎉' }),
        h('h3', { text: r.nivelCompleto ? 'Acertou — e completou o nível!' : 'Acertou!' }),
        h('p', { text: r.nivelCompleto ? 'Você descobriu todas as peças deste nível.' : 'As peças vizinhas foram liberadas no mapa.' }),
        this.textoEvolucao(r)
      ),
      r.explicacao && h('div', { class: 'secao secao-explicacao' }, h('span', { class: 'secao-titulo', text: '💡 Por quê?' }), h('p', { text: r.explicacao }))
    );
    const continuar = h('button', { type: 'button', class: 'btn btn-primario', text: r.nivelCompleto ? 'Ver o mapa completo' : 'Continuar', onClick: () => this.fechar() });
    this.definirRodape(continuar);
    continuar.focus({ preventScroll: true });
  }

  mostrarErro(r) {
    this.definirCorpo(
      h(
        'div',
        { class: 'resultado resultado-erro' },
        h('span', { class: 'resultado-icone', 'aria-hidden': 'true', text: '🤔' }),
        h('h3', { text: 'Não foi dessa vez' }),
        h('p', { text: 'Essa pergunta foi trocada. Pesquise um pouco mais e tente uma nova.' }),
        this.textoEvolucao(r)
      ),
      this.desafio.questao.enunciado &&
        h('div', { class: 'secao secao-contexto' }, h('span', { class: 'secao-titulo', text: '🔎 Dica de pesquisa' }), h('p', { text: this.desafio.questao.enunciado }))
    );
    this.rodapeDepoisDeResponder(r);
  }

  mostrarRapido(r) {
    this.definirCorpo(
      h(
        'div',
        { class: 'resultado resultado-rapido' },
        h('span', { class: 'resultado-icone', 'aria-hidden': 'true', text: '⏱️' }),
        h('h3', { text: 'Opa, rápido demais!' }),
        h('p', { text: 'Não deu tempo de ler a pergunta inteira. Leia com calma — respostas no chute não liberam peças.' })
      )
    );
    this.rodapeDepoisDeResponder(r);
  }

  rodapeDepoisDeResponder(r) {
    if (r.pausaSegundos > 0) {
      this.mostrarPausa(r.pausaSegundos * 1000, { manterCorpo: true });
      return;
    }
    const nova = h('button', { type: 'button', class: 'btn btn-primario', text: '🔄 Nova pergunta', onClick: () => this.carregarDesafio() });
    this.definirRodape(h('button', { type: 'button', class: 'btn btn-contorno', text: 'Fechar', onClick: () => this.fechar() }), nova);
    nova.focus({ preventScroll: true });
  }

  textoEvolucao(r) {
    const antes = this.desafio && this.desafio.perfil ? this.desafio.perfil.dificuldade : null;
    const depois = r.perfil ? r.perfil.dificuldade : null;
    if (!depois || antes === null) return null;
    if (depois > antes) return h('p', { class: 'evolucao evolucao-sobe', text: `⬆️ Mandou bem! As próximas perguntas vão para o nível ${r.perfil.rotulo}.` });
    if (depois < antes) return h('p', { class: 'evolucao evolucao-desce', text: `As próximas perguntas vão para o nível ${r.perfil.rotulo}. Você consegue!` });
    if (r.sequenciaAcertos >= 3) return h('p', { class: 'evolucao evolucao-sobe', text: `🔥 ${r.sequenciaAcertos} acertos seguidos!` });
    return null;
  }

  mostrarPausa(ms, { manterCorpo = false } = {}) {
    const meu = this.token;
    this.pararContagem();
    const fim = Date.now() + ms;
    const relogio = h('strong', { class: 'pausa-relogio' });
    const botao = h('button', { type: 'button', class: 'btn btn-primario', disabled: true, onClick: () => this.carregarDesafio() });

    const pausa = h(
      'div',
      { class: 'resultado resultado-pausa' },
      h('span', { class: 'resultado-icone', 'aria-hidden': 'true', text: '☕' }),
      h('h3', { text: 'Pausa rápida' }),
      h('p', { text: `Várias respostas saíram rápido demais. Use esse tempo para pesquisar sobre "${this.componente.nome}".` }),
      relogio
    );

    if (manterCorpo) this.corpo.appendChild(pausa);
    else this.definirCorpo(pausa);
    this.definirRodape(h('button', { type: 'button', class: 'btn btn-contorno', text: 'Fechar', onClick: () => this.fechar() }), botao);

    const tique = () => {
      if (meu !== this.token) return this.pararContagem();
      const restante = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
      relogio.textContent = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`;
      if (restante > 0) {
        botao.textContent = `Aguarde ${restante}s`;
      } else {
        this.pararContagem();
        relogio.textContent = 'Pronto!';
        botao.disabled = false;
        botao.textContent = '🔄 Nova pergunta';
      }
    };
    tique();
    this.intervalo = setInterval(tique, 250);
  }

  pararContagem() {
    clearInterval(this.intervalo);
    this.intervalo = null;
  }

  mostrarDescoberta() {
    this.definirCorpo(
      h(
        'div',
        { class: 'resultado resultado-acerto' },
        h('span', { class: 'resultado-icone', 'aria-hidden': 'true', text: '✅' }),
        h('h3', { text: 'Você já descobriu esta peça!' }),
        h('p', { text: 'Quer treinar? Responder mais perguntas ajuda a subir o seu nível de desafio.' })
      )
    );
    this.definirRodape(
      h('button', { type: 'button', class: 'btn btn-contorno', text: 'Fechar', onClick: () => this.fechar() }),
      h('button', { type: 'button', class: 'btn btn-primario', text: '💪 Treinar', onClick: () => this.carregarDesafio() })
    );
  }

  mostrarFalha(mensagem, { novaPergunta = false } = {}) {
    this.definirCorpo(
      h(
        'div',
        { class: 'resultado resultado-erro' },
        h('span', { class: 'resultado-icone', 'aria-hidden': 'true', text: '⚠️' }),
        h('h3', { text: 'Não deu certo' }),
        h('p', { text: mensagem })
      )
    );
    this.definirRodape(
      h('button', { type: 'button', class: 'btn btn-contorno', text: 'Fechar', onClick: () => this.fechar() }),
      h('button', { type: 'button', class: 'btn btn-primario', text: novaPergunta ? '🔄 Nova pergunta' : 'Tentar de novo', onClick: () => this.carregarDesafio() })
    );
  }
}
