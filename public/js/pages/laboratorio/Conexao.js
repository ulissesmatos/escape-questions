// O Socket.IO serve o próprio cliente (módulo ES), sem cópia no repositório
import { io } from '/socket.io/socket.io.esm.min.js';

/** Erro de regra vindo do servidor (mensagem pronta para mostrar) */
export class ErroPedido extends Error {}

/**
 * Conexão em tempo real com o servidor do Laboratório.
 *
 * - `pedir(evento, dados)` devolve uma Promise com a resposta do servidor
 * - `agora()` é o relógio do servidor (o cronômetro fica igual em todas as telas)
 * - `aoMudarStatus(fn)` avisa quando cai e quando volta, para mostrar "Reconectando..."
 *
 * Se a internet cair, o Socket.IO tenta reconectar sozinho; quem usa a
 * Conexao refaz a entrada na sala no evento 'connect'.
 */
export class Conexao {
  constructor() {
    this.socket = io({ reconnectionDelayMax: 4000 });
    this.diferencaRelogio = 0;
    this.socket.on('estado', (estado) => {
      if (estado && estado.agora) this.ajustarRelogio(estado.agora);
    });
  }

  on(evento, fn) {
    this.socket.on(evento, fn);
    return this;
  }

  get conectado() {
    return this.socket.connected;
  }

  aoMudarStatus(fn) {
    this.socket.on('connect', () => fn(true));
    this.socket.on('disconnect', () => fn(false));
    this.socket.on('connect_error', () => fn(false));
  }

  /** Volta a conectar depois que o servidor encerrou (aluno expulso, sala fechada) */
  garantirConectado() {
    if (!this.socket.connected) this.socket.connect();
  }

  pedir(evento, dados = {}, { tempoLimite = 10000 } = {}) {
    return new Promise((resolver, rejeitar) => {
      this.socket.timeout(tempoLimite).emit(evento, dados, (falhou, resposta) => {
        if (falhou) return rejeitar(new Error('O servidor não respondeu. Confira a internet e tente de novo.'));
        if (resposta && resposta.erro) return rejeitar(new ErroPedido(resposta.erro));
        if (resposta && resposta.estado && resposta.estado.agora) this.ajustarRelogio(resposta.estado.agora);
        resolver(resposta || {});
      });
    });
  }

  ajustarRelogio(agoraServidor) {
    this.diferencaRelogio = agoraServidor - Date.now();
  }

  agora() {
    return Date.now() + this.diferencaRelogio;
  }
}
