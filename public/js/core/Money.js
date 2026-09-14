// Valores em reais (R$): leitura tolerante e formatação.
//
// Aceita qualquer jeito comum de digitar um preço — "2500", "2.500",
// "2.500,00", "2500,5", "2500.50", "R$ 1.299,90" — e devolve centavos
// (inteiro), ou null se não der pra entender o valor.

export function paraCentavos(texto) {
  if (typeof texto === 'number') return Number.isFinite(texto) && texto >= 0 ? Math.round(texto * 100) : null;
  if (typeof texto !== 'string') return null;

  let limpo = texto.replace(/[^\d.,]/g, '');
  if (!/\d/.test(limpo)) return null;

  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');

  if (ultimaVirgula !== -1 && ultimoPonto !== -1) {
    // Os dois separadores: o último é o decimal ("1.299,90" ou "1,299.90")
    limpo = ultimaVirgula > ultimoPonto ? limpo.replace(/\./g, '').replace(',', '.') : limpo.replace(/,/g, '');
  } else if (ultimaVirgula !== -1) {
    // Só vírgula: várias = milhares ("1,299,000"); uma = decimal ("1299,9")
    const partes = limpo.split(',');
    limpo = partes.length > 2 ? partes.join('') : partes.join('.');
  } else if (ultimoPonto !== -1) {
    // Só ponto: "2.500" e "1.299.000" são milhares; "99.9" e "1299.90" são decimais
    const partes = limpo.split('.');
    const pareceMilhar = partes[0].length > 0 && partes.slice(1).every((p) => p.length === 3);
    limpo = pareceMilhar ? partes.join('') : `${partes.slice(0, -1).join('')}.${partes[partes.length - 1]}`;
  }

  if (limpo.startsWith('.')) limpo = `0${limpo}`;
  const valor = Number(limpo);
  return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) : null;
}

export function formatarReais(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Só o número ("1.299,90"), para devolver ao campo depois de digitar */
export function formatarNumero(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Transforma um <input> de texto em campo de dinheiro: filtra caracteres
 * inválidos enquanto digita e, ao sair, reescreve no formato "1.299,90".
 */
export function ligarCampoDinheiro(input, aoMudar = () => {}) {
  input.inputMode = 'decimal';
  input.autocomplete = 'off';

  input.addEventListener('input', () => {
    const filtrado = input.value.replace(/[^\d.,]/g, '');
    if (filtrado !== input.value) input.value = filtrado;
    input.classList.remove('campo-invalido');
    aoMudar();
  });

  input.addEventListener('blur', () => {
    if (!input.value.trim()) return;
    const centavos = paraCentavos(input.value);
    if (centavos === null) input.classList.add('campo-invalido');
    else input.value = formatarNumero(centavos);
    aoMudar();
  });

  // Obs: não selecionar o texto automaticamente ao focar — com digitação
  // rápida a seleção atrasada apagava o primeiro dígito ("450" virava "50").
}
