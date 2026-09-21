/**
 * Atrito contra copiar e colar nas perguntas: o aluno precisa ler o enunciado
 * e digitar a resposta, em vez de jogar o texto num buscador ou numa IA.
 *
 * Não é uma barreira: dá para fotografar a tela ou digitar tudo à mão. O que
 * ele faz é tirar o caminho fácil e contar as tentativas (e as saídas da aba)
 * para o professor ver depois quem tentou.
 */

const EVENTOS_DE_COPIA = ['copy', 'cut', 'contextmenu', 'dragstart'];

export class AntiCopia {
  /** @param {(mensagem: string) => void} aoTentar chamado quando o aluno tenta copiar/colar */
  constructor({ aoTentar = () => {} } = {}) {
    this.aoTentar = aoTentar;
    this.sinais = { copias: 0, colagens: 0, saidasDeAba: 0, tempoForaMs: 0 };
    this.limpezas = [];
  }

  ouvir(alvo, evento, fn) {
    alvo.addEventListener(evento, fn, true);
    this.limpezas.push(() => alvo.removeEventListener(evento, fn, true));
  }

  /** Impede selecionar e copiar o enunciado (e o menu do botão direito) */
  protegerTexto(raiz) {
    raiz.classList.add('sem-copia');
    for (const evento of EVENTOS_DE_COPIA) {
      this.ouvir(raiz, evento, (e) => {
        e.preventDefault();
        this.sinais.copias++;
        this.aoTentar('Copiar está desligado aqui: leia a pergunta e responda com as suas palavras.');
      });
    }
    return this;
  }

  /** Impede colar (e arrastar texto) nos campos de resposta */
  protegerCampos(raiz) {
    for (const evento of ['paste', 'drop']) {
      this.ouvir(raiz, evento, (e) => {
        if (!e.target.matches('input, textarea')) return;
        e.preventDefault();
        this.sinais.colagens++;
        this.aoTentar('Colar está desligado aqui: escreva a resposta digitando.');
      });
    }
    return this;
  }

  /** Conta quantas vezes o aluno saiu da aba (e quanto tempo ficou fora) */
  vigiarAba() {
    let saiuEm = null;
    this.ouvir(document, 'visibilitychange', () => {
      if (document.hidden) {
        saiuEm = Date.now();
        return;
      }
      if (saiuEm === null) return;
      this.sinais.saidasDeAba++;
      this.sinais.tempoForaMs += Date.now() - saiuEm;
      saiuEm = null;
    });
    return this;
  }

  /** Resumo para mandar junto com a resposta (o servidor guarda no histórico) */
  get relatorio() {
    return { ...this.sinais };
  }

  parar() {
    this.limpezas.splice(0).forEach((limpar) => limpar());
  }
}
