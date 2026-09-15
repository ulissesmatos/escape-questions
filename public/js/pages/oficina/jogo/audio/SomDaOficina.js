import { SafeStorage } from '../../../../core/SafeStorage.js';
import { tocarSom, SomContinuo } from './Sintetizador.js';
import { Musica } from './Musica.js';
import { EFEITOS } from './efeitos.js';
import { FAIXAS } from './faixas.js';

const CONTINUOS = {
  ventoinha: { volume: 0.1, corteMinimo: 180, corteMaximo: 1400, filtro: 'lowpass', q: 0.6 },
  pasta: { volume: 0.08, corteMinimo: 500, corteMaximo: 1100, filtro: 'bandpass', q: 3 },
};

const SILENCIO_CONTINUO = { intensidade() { return this; }, parar() {} };

/**
 * Som do jogo: efeitos, sons contínuos e música, com as preferências do
 * jogador (música/efeitos ligados) salvas no navegador.
 *
 * O navegador só libera áudio depois de um clique ou tecla: até lá os
 * efeitos são ignorados e a música pedida começa assim que liberar.
 */
export class SomDaOficina {
  constructor({ armazenamento = new SafeStorage('local', 'oficina:') } = {}) {
    this.armazenamento = armazenamento;
    this.preferencias = { musica: true, efeitos: true, ...armazenamento.ler('som', {}) };
    this.ctx = null;
    this.faixaPedida = null;
    this.ouvintes = new Set();
  }

  /** Chamado no primeiro clique/tecla da página */
  desbloquear() {
    const Contexto = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Contexto) return;
    if (!this.ctx) {
      this.ctx = new Contexto();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.connect(this.ctx.destination);
      this.saidaEfeitos = this.ctx.createGain();
      this.saidaEfeitos.connect(compressor);
      this.saidaMusica = this.ctx.createGain();
      this.saidaMusica.gain.value = 0.9;
      this.saidaMusica.connect(compressor);
      this.musicaAtual = new Musica(this.ctx, this.saidaMusica);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.aplicarMusica();
  }

  /** Pausa tudo com a aba escondida e retoma ao voltar */
  pausar(pausado) {
    if (!this.ctx) return;
    if (pausado) this.ctx.suspend();
    else this.ctx.resume();
  }

  get pronto() {
    return Boolean(this.ctx) && this.ctx.state === 'running';
  }

  efeito(nome, { tom = 0 } = {}) {
    if (!this.preferencias.efeitos || !this.pronto) return;
    const sons = EFEITOS[nome];
    if (!sons) throw new Error(`Efeito sonoro desconhecido: ${nome}`);
    const agora = this.ctx.currentTime;
    for (const som of sons) tocarSom(this.ctx, this.saidaEfeitos, som, agora, { tom });
  }

  /** Som que dura enquanto a ação acontece; devolve { intensidade(v), parar() } */
  continuo(nome) {
    if (!this.preferencias.efeitos || !this.pronto) return SILENCIO_CONTINUO;
    return new SomContinuo(this.ctx, this.saidaEfeitos, CONTINUOS[nome]);
  }

  musica(nome) {
    this.faixaPedida = nome;
    this.aplicarMusica();
  }

  aplicarMusica() {
    if (!this.musicaAtual) return;
    if (this.preferencias.musica && this.faixaPedida) this.musicaAtual.tocar(this.faixaPedida, FAIXAS[this.faixaPedida]);
    else this.musicaAtual.parar();
  }

  alternar(tipo) {
    this.preferencias[tipo] = !this.preferencias[tipo];
    this.armazenamento.salvar('som', this.preferencias);
    if (tipo === 'musica') this.aplicarMusica();
    this.ouvintes.forEach((ouvinte) => ouvinte(this.preferencias));
    return this.preferencias[tipo];
  }

  /** Avisa quando as preferências mudam (para os ícones se redesenharem) */
  aoMudar(ouvinte) {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }
}

/** Som usado por uma cena; sem som registrado (testes), tudo fica mudo */
const MUDO = {
  preferencias: { musica: false, efeitos: false },
  efeito() {},
  continuo: () => SILENCIO_CONTINUO,
  musica() {},
  alternar() { return false; },
  aoMudar: () => () => {},
};

export function somDa(cena) {
  return cena.registry.get('som') || MUDO;
}
