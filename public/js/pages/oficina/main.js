import { SiteHeader } from '../../components/SiteHeader.js';
import { criarJogo } from './jogo/criarJogo.js';
import { ARQUIVO_ZONAS, aplicarZonas } from './jogo/sprites/zonas.js';

SiteHeader.montarNaPagina();

/** Zonas calibradas no editor (public/images/oficina/zonas.json), se existirem */
async function carregarZonas() {
  const resposta = await fetch(ARQUIVO_ZONAS, { cache: 'no-cache' }).catch(() => null);
  if (!resposta || !resposta.ok) return;
  try {
    aplicarZonas(await resposta.json());
  } catch (erro) {
    console.warn('[oficina] zonas.json ignorado, usando as zonas padrão:', erro.message);
  }
}

async function iniciar() {
  const alvo = document.getElementById('jogo');
  const [sprites] = await Promise.all([
    fetch('/api/oficina/sprites').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    carregarZonas(),
    // A fonte pixelada precisa estar carregada antes de o Phaser desenhar textos
    document.fonts ? document.fonts.load('16px "Pixelify Sans"').catch(() => null) : null,
  ]);
  alvo.querySelector('.jogo-carregando')?.remove();
  const parametros = new URLSearchParams(location.search);
  const jogo = criarJogo(alvo, {
    spritesDisponiveis: sprites,
    mostrarZonas: parametros.has('zonas'),
  });
  // ?teste expõe o jogo para testes automatizados de navegador
  if (parametros.has('teste')) window.jogoOficina = jogo;
}

iniciar();
