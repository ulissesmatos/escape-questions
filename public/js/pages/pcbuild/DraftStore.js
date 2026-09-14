import { armazenamentoLocal } from '../../core/SafeStorage.js';

/**
 * Rascunho da proposta salvo no navegador, por missão e por aluno — assim
 * recarregar a página ou trocar de missão não apaga o que foi pesquisado.
 */
export class DraftStore {
  constructor(identidade, armazenamento = armazenamentoLocal) {
    this.identidade = identidade;
    this.armazenamento = armazenamento;
  }

  chave(missaoId) {
    const normalizar = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return `pc_rascunho:${missaoId}:${normalizar(this.identidade.participantes)}:${normalizar(this.identidade.turma)}`;
  }

  ler(missaoId) {
    return this.armazenamento.ler(this.chave(missaoId), null);
  }

  salvar(missaoId, rascunho) {
    if (DraftStore.temConteudo(rascunho)) this.armazenamento.salvar(this.chave(missaoId), { ...rascunho, atualizadoEm: Date.now() });
    else this.remover(missaoId);
  }

  remover(missaoId) {
    this.armazenamento.remover(this.chave(missaoId));
  }

  static temConteudo(rascunho) {
    if (!rascunho) return false;
    const obrigatorias = Object.values(rascunho.obrigatorias || {}).some((p) => p.nome || p.preco || p.link);
    return obrigatorias || (rascunho.extras || []).length > 0 || Boolean((rascunho.justificativa || '').trim());
  }
}
