// Modo leve: para computadores sem aceleração de vídeo (ou fracos), o jogo
// desenha em 960×540 em vez de 1920×1080 — quatro vezes menos pixels por
// quadro — e corta os efeitos mais caros (partículas e fumaça).
//
// A escolha fica salva no navegador. Se o jogador nunca escolheu, o modo é
// decidido pela placa de vídeo que o navegador informa.

const CHAVE = 'oficina:modo-leve';

const PLACAS_LENTAS = /swiftshader|basic render|llvmpipe|software|microsoft basic/i;

/** O navegador está desenhando por software (sem placa de vídeo)? */
function semAceleracao() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const extensao = gl.getExtension('WEBGL_debug_renderer_info');
    const placa = extensao ? String(gl.getParameter(extensao.UNMASKED_RENDERER_WEBGL)) : '';
    return PLACAS_LENTAS.test(placa);
  } catch {
    return true;
  }
}

export function modoLeveEscolhido() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo !== null) return salvo === 'sim';
  } catch {
    // sem armazenamento: decide pela placa de vídeo
  }
  return semAceleracao();
}

export function definirModoLeve(ligado) {
  try {
    localStorage.setItem(CHAVE, ligado ? 'sim' : 'nao');
  } catch {
    // sem armazenamento: vale só para esta sessão
  }
  // O tamanho do canvas muda: mais simples recarregar do que recriar o jogo
  window.location.reload();
}

/** O jogo está no modo leve? (usado pelas cenas para cortar efeitos) */
export function ehLeve(cena) {
  return Boolean(cena.registry.get('modoLeve'));
}
