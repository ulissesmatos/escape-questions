import { SiteHeader } from '../../components/SiteHeader.js';
import {
  SPRITES, LAYOUTS_PADRAO, layoutsAtuais,
  salvarLayoutsPersonalizados, restaurarLayoutsPadrao,
  spritesPersonalizadosAtuais, salvarSpritePersonalizado,
} from './jogo/sprites/manifesto.js';

SiteHeader.montarNaPagina();

const grupos = [
  ['placas', 'Placas-mãe', ['placa-atx', 'placa-matx', 'placa-matx-intel']],
  ['gabinetes', 'Gabinetes', ['gabinete-mini', 'gabinete-mid']],
];
const nomes = { socket: 'Socket do processador', ram: 'Memória RAM', m2: 'SSD M.2', pcie: 'PCI Express', conector24: 'Conector ATX 24 pinos', conectorCpu: 'Conector CPU', placa: 'Área da placa-mãe', fonte: 'Baia da fonte', sata: 'Baia SATA' };
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const limitar = (valor, minimo = 0, maximo = 1) => Math.min(maximo, Math.max(minimo, Number.isFinite(valor) ? valor : minimo));

const seletor = document.querySelector('#sprite-seletor');
const palco = document.querySelector('#palco-zonas');
const preview = document.querySelector('#preview-sprite');
const lista = document.querySelector('#lista-zonas');
const form = document.querySelector('#form-zona');
const titulo = document.querySelector('#titulo-zona');
const status = document.querySelector('#status-zonas');
const arquivoPreview = document.querySelector('#arquivo-preview');
const idSprite = document.querySelector('#id-sprite');
const grupoSprite = document.querySelector('#grupo-sprite');
const botaoAdicionarSprite = document.querySelector('#adicionar-sprite');

let layouts = layoutsAtuais();
let spritesPersonalizados = spritesPersonalizadosAtuais();
let atual = { grupo: 'placas', sprite: 'placa-atx' };
let selecionada = null;
let previewUrl = null;

function preencherSeletor(valor = seletor.value || 'placas:placa-atx') {
  seletor.replaceChildren();
  for (const [grupo, rotulo, sprites] of grupos) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = rotulo;
    sprites.forEach((sprite) => optgroup.append(new Option(sprite, `${grupo}:${sprite}`)));
    seletor.append(optgroup);
  }
  const meus = Object.values(spritesPersonalizados);
  if (meus.length) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = 'Meus sprites';
    meus.forEach((sprite) => optgroup.append(new Option(sprite.nome || sprite.id, `${sprite.grupo}:${sprite.id}`)));
    seletor.append(optgroup);
  }
  seletor.value = valor;
}

function layoutAtual() {
  if (!layouts[atual.grupo][atual.sprite]) {
    const modelo = atual.grupo === 'placas' ? LAYOUTS_PADRAO.placas['placa-matx'] : LAYOUTS_PADRAO.gabinetes['gabinete-mini'];
    layouts[atual.grupo][atual.sprite] = copiar(modelo);
  }
  return layouts[atual.grupo][atual.sprite];
}

function zonasDoLayout() {
  const zonas = [];
  for (const [chave, valor] of Object.entries(layoutAtual())) {
    if (Array.isArray(valor[0])) valor.forEach((ret, indice) => zonas.push({ chave, indice, ret }));
    else zonas.push({ chave, indice: null, ret: valor });
  }
  return zonas;
}

function rotuloZona(zona) {
  const base = nomes[zona.chave] || zona.chave;
  return zona.indice === null ? base : `${base} ${zona.indice + 1}`;
}

function zonaSelecionada() {
  return zonasDoLayout().find((zona) => zona.chave === selecionada?.chave && zona.indice === selecionada?.indice) || null;
}

function definirRet(zona, ret) {
  const layout = layoutAtual();
  if (zona.indice === null) layout[zona.chave] = ret;
  else layout[zona.chave][zona.indice] = ret;
}

function renderizarFormulario() {
  const zona = zonaSelecionada();
  form.hidden = !zona;
  if (!zona) return;
  titulo.textContent = rotuloZona(zona);
  ['x', 'y', 'w', 'h'].forEach((nome, indice) => { form.elements[nome].value = (zona.ret[indice] * 100).toFixed(1); });
}

function selecionar(zona) {
  selecionada = { chave: zona.chave, indice: zona.indice };
  renderizar();
}

function iniciarArrasto(evento, zona, modo) {
  evento.preventDefault();
  evento.stopPropagation();
  selecionar(zona);
  const inicio = { x: evento.clientX, y: evento.clientY, ret: [...zona.ret] };
  const mover = (movimento) => {
    const caixa = palco.getBoundingClientRect();
    const dx = (movimento.clientX - inicio.x) / caixa.width;
    const dy = (movimento.clientY - inicio.y) / caixa.height;
    const ret = [...inicio.ret];
    if (modo === 'mover') {
      ret[0] = limitar(inicio.ret[0] + dx, 0, 1 - ret[2]);
      ret[1] = limitar(inicio.ret[1] + dy, 0, 1 - ret[3]);
    } else {
      ret[2] = limitar(inicio.ret[2] + dx, 0.01, 1 - ret[0]);
      ret[3] = limitar(inicio.ret[3] + dy, 0.01, 1 - ret[1]);
    }
    definirRet(zona, ret);
    renderizar();
  };
  const terminar = () => {
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', terminar);
  };
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', terminar, { once: true });
}

function renderizar() {
  const { largura, altura } = SPRITES[atual.sprite];
  palco.style.width = `${Math.min(680, largura * 1.65)}px`;
  palco.style.aspectRatio = `${largura} / ${altura}`;
  preview.src = previewUrl || spritesPersonalizados[atual.sprite]?.fonte || `/images/oficina/${atual.sprite}.png`;
  preview.alt = `Sprite ${atual.sprite}`;
  lista.replaceChildren();
  [...palco.querySelectorAll('.editor-zona')].forEach((elemento) => elemento.remove());

  zonasDoLayout().forEach((zona) => {
    const ativo = selecionada?.chave === zona.chave && selecionada?.indice === zona.indice;
    const botao = document.createElement('button');
    botao.type = 'button'; botao.className = `editor-item-zona${ativo ? ' ativo' : ''}`;
    botao.textContent = rotuloZona(zona);
    botao.addEventListener('click', () => selecionar(zona));
    lista.append(botao);

    const caixa = document.createElement('div');
    caixa.className = `editor-zona${ativo ? ' ativa' : ''}`;
    caixa.style.left = `${zona.ret[0] * 100}%`; caixa.style.top = `${zona.ret[1] * 100}%`;
    caixa.style.width = `${zona.ret[2] * 100}%`; caixa.style.height = `${zona.ret[3] * 100}%`;
    caixa.title = `${rotuloZona(zona)} — arraste para mover`;
    caixa.addEventListener('pointerdown', (evento) => iniciarArrasto(evento, zona, 'mover'));
    const alca = document.createElement('span');
    alca.className = 'editor-alca'; alca.title = 'Redimensionar';
    alca.addEventListener('pointerdown', (evento) => iniciarArrasto(evento, zona, 'redimensionar'));
    caixa.append(alca); palco.append(caixa);
  });
  renderizarFormulario();
}

seletor.addEventListener('change', () => {
  const [grupo, sprite] = seletor.value.split(':');
  atual = { grupo, sprite }; selecionada = null; previewUrl = null; renderizar();
});

form.addEventListener('input', () => {
  const zona = zonaSelecionada();
  if (!zona) return;
  const ret = ['x', 'y', 'w', 'h'].map((nome) => Number(form.elements[nome].value) / 100);
  ret[0] = limitar(ret[0], 0, 0.99); ret[1] = limitar(ret[1], 0, 0.99);
  ret[2] = limitar(ret[2], 0.01, 1 - ret[0]); ret[3] = limitar(ret[3], 0.01, 1 - ret[1]);
  definirRet(zona, ret); renderizar();
});

arquivoPreview.addEventListener('change', (evento) => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  const arquivo = evento.target.files[0];
  previewUrl = arquivo ? URL.createObjectURL(arquivo) : null;
  botaoAdicionarSprite.disabled = !arquivo;
  renderizar();
});

botaoAdicionarSprite.addEventListener('click', async () => {
  const arquivo = arquivoPreview.files[0];
  if (!arquivo) return;
  const id = idSprite.value.trim();
  if (!id) { status.textContent = 'Informe um identificador, como minha-placa-am5.'; return; }
  try {
    const fonte = await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result); leitor.onerror = reject; leitor.readAsDataURL(arquivo);
    });
    const imagem = await new Promise((resolve, reject) => {
      const elemento = new Image(); elemento.onload = () => resolve(elemento); elemento.onerror = reject; elemento.src = fonte;
    });
    const sprite = salvarSpritePersonalizado({
      id, grupo: grupoSprite.value, fonte,
      largura: imagem.naturalWidth, altura: imagem.naturalHeight, nome: arquivo.name.replace(/\.[^.]+$/, ''),
    });
    spritesPersonalizados = spritesPersonalizadosAtuais();
    if (!layouts[sprite.grupo][sprite.id]) {
      const modelo = sprite.grupo === 'placas' ? LAYOUTS_PADRAO.placas['placa-matx'] : LAYOUTS_PADRAO.gabinetes['gabinete-mini'];
      layouts[sprite.grupo][sprite.id] = copiar(modelo);
    }
    atual = { grupo: sprite.grupo, sprite: sprite.id }; selecionada = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
    arquivoPreview.value = ''; idSprite.value = ''; botaoAdicionarSprite.disabled = true;
    preencherSeletor(`${sprite.grupo}:${sprite.id}`); renderizar();
    status.textContent = 'Sprite adicionado. Ajuste as zonas e clique em “Salvar neste navegador”.';
  } catch (erro) {
    status.textContent = erro.message || 'Não foi possível adicionar esse PNG.';
  }
});

document.querySelector('#adicionar-zona').addEventListener('click', () => {
  const chave = window.prompt('Nome técnico da nova zona (ex.: ventoinha-frontal):');
  if (!chave) return;
  if (layoutAtual()[chave]) { status.textContent = 'Já existe uma zona com esse nome.'; return; }
  layoutAtual()[chave] = [0.1, 0.1, 0.2, 0.2];
  selecionar({ chave, indice: null });
});

document.querySelector('#remover-zona').addEventListener('click', () => {
  const zona = zonaSelecionada();
  if (!zona) return;
  if (zona.indice === null) delete layoutAtual()[zona.chave];
  else layoutAtual()[zona.chave].splice(zona.indice, 1);
  selecionada = null; renderizar();
});

document.querySelector('#salvar-zonas').addEventListener('click', () => {
  salvarLayoutsPersonalizados(layouts);
  status.textContent = 'Zonas salvas. Recarregue a Oficina para vê-las no jogo.';
});

document.querySelector('#exportar-zonas').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ versao: 2, layouts, sprites: spritesPersonalizados }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'oficina-zonas.json'; link.click();
  URL.revokeObjectURL(link.href);
  status.textContent = 'Arquivo de zonas exportado.';
});

document.querySelector('#importar-zonas').addEventListener('change', async (evento) => {
  const arquivo = evento.target.files[0]; if (!arquivo) return;
  try {
    const dado = JSON.parse(await arquivo.text());
    if (!dado.layouts && !(dado.placas || dado.gabinetes)) throw new Error('Estrutura ausente');
    layouts = copiar(dado.layouts || dado);
    if (!layouts.placas || !layouts.gabinetes) throw new Error('Grupos ausentes');
    for (const sprite of Object.values(dado.sprites || {})) salvarSpritePersonalizado(sprite);
    spritesPersonalizados = spritesPersonalizadosAtuais();
    preencherSeletor(); selecionada = null; renderizar(); status.textContent = 'Arquivo importado. Clique em “Salvar neste navegador” para aplicar.';
  } catch {
    status.textContent = 'Não foi possível ler esse JSON de zonas.';
  }
  evento.target.value = '';
});

document.querySelector('#restaurar-zonas').addEventListener('click', () => {
  layouts = copiar(LAYOUTS_PADRAO); restaurarLayoutsPadrao(); selecionada = null; renderizar();
  status.textContent = 'Padrão restaurado neste navegador.';
});

preencherSeletor();
renderizar();
