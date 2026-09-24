// Progresso do aluno guardado no navegador: estrelas por fase e o último
// plano montado em cada uma (para continuar de onde parou).

import { armazenamentoLocal } from '../../../core/SafeStorage.js';
import { FASES } from '../regras/fases.js';

const CHAVE = 'horta:progresso';

export class Progresso {
  constructor({ liberarTudo = false } = {}) {
    const salvo = armazenamentoLocal.ler(CHAVE, null);
    this.dados = { fases: {}, planos: {}, ...(salvo && typeof salvo === 'object' ? salvo : {}) };
    this.liberarTudo = liberarTudo;
  }

  salvar() {
    armazenamentoLocal.salvar(CHAVE, this.dados);
  }

  estrelas(id) {
    return (this.dados.fases[id] && this.dados.fases[id].estrelas) || 0;
  }

  /** Guarda o resultado se for melhor que o anterior. Devolve true se melhorou */
  registrar(id, { estrelas, blocos }) {
    const antes = this.dados.fases[id];
    if (antes && (antes.estrelas > estrelas || (antes.estrelas === estrelas && antes.blocos <= blocos))) return false;
    this.dados.fases[id] = { estrelas, blocos };
    this.salvar();
    return true;
  }

  plano(id) {
    return this.dados.planos[id] || [];
  }

  guardarPlano(id, plano) {
    this.dados.planos[id] = plano;
    this.salvar();
  }

  liberada(indice) {
    return this.liberarTudo || indice === 0 || this.estrelas(FASES[indice - 1].id) > 0;
  }

  total() {
    return FASES.reduce((soma, f) => soma + this.estrelas(f.id), 0);
  }
}
