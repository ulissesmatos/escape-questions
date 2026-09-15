import { SiteHeader } from '../../../components/SiteHeader.js';
import { estadoCarregando } from '../../../components/ui.js';
import { api } from '../../../core/ApiClient.js';
import { SafeStorage } from '../../../core/SafeStorage.js';
import { ARQUIVO_ZONAS, aplicarZonas, validarZonas, diferencasDoPadrao } from '../jogo/sprites/zonas.js';
import { carregarArteDaOficina } from './ArteDaOficina.js';
import { EditorDeZonas } from './EditorDeZonas.js';

SiteHeader.montarNaPagina();

// O editor antigo guardava as zonas só no navegador, nestas chaves
const armazenamento = new SafeStorage('local');
const CHAVES_ANTIGAS = ['oficina:layouts:v1', 'oficina:sprites-personalizados:v1'];

function zonasDoEditorAntigo() {
  const { zonas } = validarZonas(armazenamento.ler(CHAVES_ANTIGAS[0]), { tolerante: true });
  return Object.keys(diferencasDoPadrao(zonas)).length ? zonas : null;
}

async function iniciar() {
  const alvo = document.getElementById('editor-zonas');
  alvo.replaceChildren(estadoCarregando('Carregando a arte da oficina...'));

  const [sprites, editor, arquivo] = await Promise.all([
    api.get('/oficina/sprites').catch(() => []),
    api.get('/oficina/zonas/editor').catch(() => ({ podeSalvar: false })),
    fetch(ARQUIVO_ZONAS, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  const avisos = [];
  if (arquivo) {
    try {
      aplicarZonas(arquivo);
    } catch (erro) {
      avisos.push(`O zonas.json atual foi ignorado porque tem um problema: ${erro.message}`);
    }
  }

  const arte = await carregarArteDaOficina(new Set(sprites));
  alvo.replaceChildren();
  new EditorDeZonas({
    arte,
    podeSalvar: editor.podeSalvar,
    avisos,
    zonasAntigas: zonasDoEditorAntigo(),
    onDescartarAntigas: () => CHAVES_ANTIGAS.forEach((chave) => armazenamento.remover(chave)),
  }).iniciar(alvo);
}

iniciar();
