/** Pilha de "desfazer": guarda fotos (JSON) do estado antes de cada mudança */
export class Historico {
  constructor(limite = 100) {
    this.limite = limite;
    this.fotos = [];
  }

  guardar(estado) {
    const foto = typeof estado === 'string' ? estado : JSON.stringify(estado);
    if (this.fotos.at(-1) === foto) return;
    this.fotos.push(foto);
    if (this.fotos.length > this.limite) this.fotos.shift();
  }

  desfazer() {
    const foto = this.fotos.pop();
    return foto ? JSON.parse(foto) : null;
  }

  get vazio() {
    return this.fotos.length === 0;
  }
}
