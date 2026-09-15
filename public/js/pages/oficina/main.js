import { SiteHeader } from '../../components/SiteHeader.js';
import { criarJogo } from './jogo/criarJogo.js';

SiteHeader.montarNaPagina();

async function iniciar() {
  const alvo = document.getElementById('jogo');
  const [sprites] = await Promise.all([
    fetch('/api/oficina/sprites').then((r) => (r.ok ? r.json() : [])).catch(() => []),
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
