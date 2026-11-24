/**
 * Dados pessoais que não devem ficar à mostra num perfil público:
 * endereço, telefone e escola (com a turma). Gostos e hobbies podem.
 *
 * dadosPessoais(texto) → [{ tipo: 'endereco' | 'telefone' | 'escola', descricao, trecho }]
 */
const REGRAS = [
  { tipo: 'telefone', descricao: 'um telefone', padrao: /(\(?\d{2}\)?\s*)?9?\d{4}[\s.-]?\d{4}/ },
  { tipo: 'endereco', descricao: 'um endereço', padrao: /\b(rua|r\.|avenida|av\.|travessa|alameda|estrada|moro (na|no|em))\b[^|,\n]*(,?\s*(n[ºo°.]?\s*)?\d+)?/i },
  { tipo: 'escola', descricao: 'a sua escola ou turma', padrao: /\b(escola|col[eé]gio|\d{1,2}\s*[ºo°]\s*(ano\s*)?[a-z]?)\b[^|,\n]*/i },
];

export function dadosPessoais(texto) {
  const achados = [];
  for (const regra of REGRAS) {
    const m = String(texto ?? '').match(regra.padrao);
    if (m) achados.push({ tipo: regra.tipo, descricao: regra.descricao, trecho: m[0].trim() });
  }
  return achados;
}
