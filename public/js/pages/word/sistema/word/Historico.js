/**
 * Desfazer/Refazer do Word simulado. Guarda "fotos" do documento (HTML,
 * configurações da página e seleção). A digitação vira um passo só por
 * "rajada" (pausa de 1 segundo, troca de palavra com espaço ou Enter), como
 * no Word: Ctrl+Z não apaga letra por letra.
 *
 * Cada foto pode ter uma marca (ex.: 'virus'): quando o aluno desfaz até ela,
 * desfazer() devolve a marca para a missão saber.
 */
export class Historico {
  constructor({ limite = 100 } = {}) {
    this.limite = limite;
    this.passado = [];
    this.futuro = [];
    this.ultimaDigitacao = 0;
  }

  limpar() {
    this.passado = [];
    this.futuro = [];
    this.ultimaDigitacao = 0;
  }

  /** Guarda o estado de ANTES de uma mudança */
  registrar(foto, { marca = null, descricao = '' } = {}) {
    this.passado.push({ ...foto, marca, descricao });
    if (this.passado.length > this.limite) this.passado.shift();
    this.futuro = [];
    this.ultimaDigitacao = 0;
  }

  /** Digitação: só guarda no começo de uma rajada */
  digitacao(foto, { quebra = false, agora = Date.now() } = {}) {
    if (quebra || agora - this.ultimaDigitacao > 1000) {
      this.passado.push({ ...foto, marca: null, descricao: 'Digitação' });
      if (this.passado.length > this.limite) this.passado.shift();
      this.futuro = [];
    }
    this.ultimaDigitacao = agora;
  }

  get podeDesfazer() {
    return this.passado.length > 0;
  }

  get podeRefazer() {
    return this.futuro.length > 0;
  }

  /** Devolve a foto para restaurar (e guarda a atual para o Refazer) */
  desfazer(fotoAtual) {
    const foto = this.passado.pop();
    if (!foto) return null;
    this.futuro.push({ ...fotoAtual, marca: foto.marca, descricao: foto.descricao });
    this.ultimaDigitacao = 0;
    return foto;
  }

  refazer(fotoAtual) {
    const foto = this.futuro.pop();
    if (!foto) return null;
    this.passado.push({ ...fotoAtual, marca: foto.marca, descricao: foto.descricao });
    this.ultimaDigitacao = 0;
    return foto;
  }

  /** Nome do próximo passo do Desfazer (dica do botão: "Desfazer Digitação") */
  get proximo() {
    return this.passado[this.passado.length - 1]?.descricao || '';
  }
}
