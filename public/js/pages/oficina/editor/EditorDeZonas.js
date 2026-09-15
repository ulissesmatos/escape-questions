import { Component } from '../../../core/Component.js';
import { h, substituirFilhos } from '../../../core/dom.js';
import { api } from '../../../core/ApiClient.js';
import { Toast } from '../../../components/ui.js';
import { SPRITES } from '../jogo/sprites/manifesto.js';
import {
  GRUPOS_DE_ZONAS, layoutsEmUso, listarZonas, lerZona, escreverZona,
  zonasPadrao, zonaPadrao, diferencasDoPadrao, formatarZonas,
} from '../jogo/sprites/zonas.js';
import { ARTE_NO_ENCAIXE, AREA_DE_SOLTAR, PECA_DA_ZONA, daFracao, retangulo } from '../jogo/sprites/colocacao.js';
import { PECAS, peca } from '../regras/catalogo.js';
import { paraPixels, paraFracao, limitar, arrastarRetangulo } from './geometria.js';
import { Historico } from './Historico.js';
import { QuadroDeZonas } from './QuadroDeZonas.js';

const ZOOMS = [1, 1.5, 2, 2.5, 3, 4, 5, 6];
const SETAS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const CAMPOS_NUMERICOS = [['x', 'X'], ['y', 'Y'], ['w', 'Largura'], ['h', 'Altura']];

const nomeDaImagem = (chave) => PECAS.find((p) => p.sprite === chave)?.nome || chave;

/**
 * Editor visual das zonas de encaixe. Trabalha numa cópia dos layouts;
 * "Salvar" grava só as diferenças do padrão em public/images/oficina/zonas.json.
 *
 * props: { arte: { chave: url }, podeSalvar, avisos: string[], zonasAntigas, onDescartarAntigas }
 */
export class EditorDeZonas extends Component {
  constructor(props) {
    super(props);
    this.layouts = layoutsEmUso();
    this.salvo = this.assinatura();
    this.historico = new Historico();
    this.grupo = 'placas';
    this.chave = Object.keys(GRUPOS_DE_ZONAS.placas.layouts)[0];
    this.selecionada = null;
    this.zoom = this.zoomInicial();
    this.mostrarPecas = true;
    this.mostrarAreas = false;
    this.salvando = false;
    this.zonasAntigas = props.zonasAntigas || null;
    this.antigasCarregadas = false;
  }

  /** Monta na página e liga atalhos de teclado e o aviso de alterações não salvas */
  iniciar(alvo) {
    this.montar(alvo);
    this.ouvir(document, 'keydown', (evento) => this.aoTeclar(evento));
    this.ouvir(window, 'beforeunload', (evento) => {
      if (this.temAlteracoes) evento.preventDefault();
    });
  }

  // ---------------- Estado ----------------

  get layout() {
    return this.layouts[this.grupo][this.chave];
  }

  get tamanho() {
    return SPRITES[this.chave];
  }

  assinatura() {
    return JSON.stringify(diferencasDoPadrao(this.layouts));
  }

  get temAlteracoes() {
    return this.assinatura() !== this.salvo;
  }

  zoomInicial() {
    const { largura, altura } = this.tamanho;
    const cabe = Math.min(720 / largura, 620 / altura);
    return ZOOMS.filter((z) => z <= cabe).at(-1) || 1;
  }

  zonasComPixels() {
    return listarZonas(this.layout).map((zona) => ({ ...zona, px: paraPixels(zona.ret, this.tamanho) }));
  }

  /** A imagem (ou uma zona dela) está diferente do padrão? */
  ajustada(grupo, chave, id = null) {
    const layout = this.layouts[grupo][chave];
    if (id) return JSON.stringify(lerZona(layout, id)) !== JSON.stringify(zonaPadrao(grupo, chave, id));
    return Boolean(diferencasDoPadrao({ [grupo]: { [chave]: layout } })[grupo]);
  }

  // ---------------- Desenho ----------------

  render() {
    this.quadro = new QuadroDeZonas({
      imagem: this.props.arte[this.chave],
      tamanho: this.tamanho,
      zoom: this.zoom,
      zonas: this.zonasComPixels(),
      selecionada: this.selecionada,
      previa: this.previa(),
      onSelecionar: (id) => this.selecionar(id),
      onArrastar: ({ id, px: novo, primeiro }) => this.mudarZona(id, novo, { guardar: primeiro }),
    });
    this.painelImagens = h('div', { class: 'editor-imagens' });
    this.painelZonas = h('div', { class: 'editor-zonas-lista' });
    this.status = h('p', { class: 'editor-status', role: 'status' });
    this.botaoSalvar = h('button', { type: 'button', class: 'btn btn-primario', onClick: () => this.salvar() }, 'Salvar zonas');
    this.botaoDesfazer = h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', onClick: () => this.desfazer() }, '↶ Desfazer');

    const el = h(
      'div',
      { class: 'editor' },
      this.renderAvisos(),
      h('section', { class: 'editor-cartao', 'aria-label': 'Imagem' }, this.painelImagens),
      h(
        'div',
        { class: 'editor-grade' },
        h('aside', { class: 'editor-cartao editor-lateral' }, h('h2', { class: 'editor-titulo', text: 'Zonas' }), this.painelZonas),
        h(
          'section',
          { class: 'editor-cartao editor-principal' },
          this.renderFerramentas(),
          h('div', { class: 'editor-palco' }, this.quadro),
          h(
            'p',
            { class: 'editor-dica' },
            h('strong', { text: 'Arraste' }), ' para mover · ', h('strong', { text: 'puxe os cantos' }), ' para redimensionar · ',
            h('kbd', { text: 'setas' }), ' 1 px (', h('kbd', { text: 'Shift' }), ' 10 px) · ',
            h('kbd', { text: 'Alt' }), ' + setas muda o tamanho · ', h('kbd', { text: 'Ctrl+Z' }), ' desfaz · ', h('kbd', { text: 'Ctrl+S' }), ' salva'
          )
        )
      ),
      h(
        'footer',
        { class: 'editor-cartao editor-rodape' },
        this.status,
        h(
          'div',
          { class: 'editor-rodape-acoes' },
          this.botaoDesfazer,
          h('a', { class: 'btn btn-contorno btn-pequeno', href: 'oficina.html?zonas=1', target: '_blank', rel: 'noopener' }, 'Testar no jogo ↗'),
          h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', onClick: () => this.copiarJson() }, 'Copiar JSON'),
          this.botaoSalvar
        )
      )
    );
    this.redesenharPaineis();
    return el;
  }

  renderAvisos() {
    const avisos = (this.props.avisos || []).map((texto) => h('div', { class: 'editor-aviso editor-aviso-erro', text: texto }));
    if (!this.props.podeSalvar) {
      avisos.push(h('div', { class: 'editor-aviso' }, 'Este servidor está em modo de produção e não grava arquivos. Ajuste as zonas, use ', h('strong', { text: 'Copiar JSON' }), ' e salve o conteúdo em ', h('code', { text: 'public/images/oficina/zonas.json' }), '.'));
    }
    if (this.zonasAntigas && !this.antigasCarregadas) {
      avisos.push(
        h(
          'div',
          { class: 'editor-aviso' },
          h('span', {}, 'Este navegador tem zonas ajustadas no editor antigo, que ficavam salvas só aqui.'),
          h(
            'span',
            { class: 'editor-aviso-acoes' },
            h('button', { type: 'button', class: 'btn btn-suave btn-pequeno', onClick: () => this.carregarAntigas() }, 'Carregar no editor'),
            h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', onClick: () => this.descartarAntigas() }, 'Descartar')
          )
        )
      );
    }
    return avisos.length ? h('div', { class: 'editor-avisos' }, avisos) : null;
  }

  renderFerramentas() {
    const indice = ZOOMS.indexOf(this.zoom);
    const alternar = (texto, marcado, aoMudar) =>
      h('label', { class: 'editor-alternar' }, h('input', { type: 'checkbox', checked: marcado, onChange: (e) => aoMudar(e.target.checked) }), texto);
    return h(
      'div',
      { class: 'editor-ferramentas' },
      h(
        'div',
        { class: 'editor-zoom', role: 'group', 'aria-label': 'Zoom' },
        h('button', { type: 'button', class: 'btn btn-contorno btn-mini', disabled: indice <= 0, 'aria-label': 'Diminuir zoom', onClick: () => this.definirZoom(ZOOMS[indice - 1]) }, '−'),
        h('span', { class: 'editor-zoom-valor', text: `${this.zoom}×` }),
        h('button', { type: 'button', class: 'btn btn-contorno btn-mini', disabled: indice >= ZOOMS.length - 1, 'aria-label': 'Aumentar zoom', onClick: () => this.definirZoom(ZOOMS[indice + 1]) }, '+')
      ),
      alternar('Mostrar peças montadas', this.mostrarPecas, (v) => { this.mostrarPecas = v; this.quadro.mostrarPrevia(this.previa()); }),
      alternar('Mostrar área de soltar', this.mostrarAreas, (v) => { this.mostrarAreas = v; this.quadro.mostrarPrevia(this.previa()); }),
      h('span', { class: 'editor-ferramentas-espaco' }),
      h('span', { class: 'editor-tamanho', text: `${this.tamanho.largura} × ${this.tamanho.altura} px` }),
      (this.botaoRestaurarImagem = h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', onClick: () => this.restaurarImagem() }, 'Restaurar padrão desta imagem'))
    );
  }

  /** Lista de imagens e lista de zonas (sem redesenhar o quadro) */
  redesenharPaineis() {
    this.assinaturaImagens = null;
    this.campos = null;
    this.valores = new Map();
    this.marcas = new Map();
    this.botaoRestaurarZona = null;
    substituirFilhos(this.painelZonas, this.zonasComPixels().map((zona) => this.renderItemZona(zona)));
    this.atualizarIndicadores();
  }

  renderImagens() {
    return Object.entries(GRUPOS_DE_ZONAS).map(([grupo, { nome, layouts }]) =>
      h(
        'div',
        { class: 'editor-grupo-imagens', role: 'group', 'aria-label': nome },
        h('span', { class: 'editor-titulo', text: nome }),
        h(
          'div',
          { class: 'editor-grupo-botoes' },
          Object.keys(layouts).map((chave) =>
            h(
              'button',
              { type: 'button', class: `editor-imagem${chave === this.chave ? ' ativa' : ''}`, 'aria-pressed': String(chave === this.chave), onClick: () => this.abrirImagem(grupo, chave) },
              h('img', { src: this.props.arte[chave], alt: '' }),
              h('span', { class: 'editor-imagem-nome' }, nomeDaImagem(chave), this.ajustada(grupo, chave) && h('span', { class: 'editor-selo', text: 'ajustada' }))
            )
          )
        )
      )
    );
  }

  /** Selos "ajustada", marcas nas zonas, botões de restaurar e rodapé — sem tirar o foco dos campos */
  atualizarIndicadores() {
    const assinatura = Object.entries(GRUPOS_DE_ZONAS)
      .flatMap(([grupo, { layouts }]) => Object.keys(layouts).map((chave) => this.ajustada(grupo, chave)))
      .join();
    if (assinatura !== this.assinaturaImagens) {
      this.assinaturaImagens = assinatura;
      substituirFilhos(this.painelImagens, this.renderImagens());
    }
    for (const [id, marca] of this.marcas) marca.hidden = !this.ajustada(this.grupo, this.chave, id);
    if (this.botaoRestaurarZona) this.botaoRestaurarZona.disabled = !this.ajustada(this.grupo, this.chave, this.selecionada);
    this.botaoRestaurarImagem.disabled = !this.ajustada(this.grupo, this.chave);
    this.atualizarRodape();
  }

  renderItemZona(zona) {
    const ativa = zona.id === this.selecionada;
    const valores = h('span', { class: 'editor-zona-valores', text: this.textoValores(zona.px) });
    const marca = h('span', { class: 'editor-zona-ajustada', title: 'Diferente do padrão', text: '●' });
    this.valores.set(zona.id, valores);
    this.marcas.set(zona.id, marca);
    const item = h(
      'div',
      { class: `editor-zona-item${ativa ? ' ativa' : ''}`, dataset: { campo: zona.campo } },
      h(
        'button',
        { type: 'button', class: 'editor-zona-botao', 'aria-expanded': String(ativa), onClick: () => this.selecionar(ativa ? null : zona.id) },
        h('span', { class: 'editor-zona-cor', 'aria-hidden': 'true' }),
        h('span', { class: 'editor-zona-nome', text: zona.nome }),
        marca,
        valores
      )
    );
    if (ativa) item.append(this.renderDetalheZona(zona));
    return item;
  }

  renderDetalheZona(zona) {
    this.campos = {};
    const campos = CAMPOS_NUMERICOS.map(([chave, rotulo]) => {
      const entrada = h('input', {
        type: 'number',
        inputmode: 'numeric',
        step: 1,
        min: 0,
        value: zona.px[chave],
        onFocus: () => { this.antesDeDigitar = JSON.stringify(this.layouts); },
        onInput: () => this.digitarValores(false),
        onChange: () => this.digitarValores(true),
      });
      this.campos[chave] = entrada;
      return h('label', {}, rotulo, entrada);
    });
    this.botaoRestaurarZona = h('button', { type: 'button', class: 'btn btn-contorno btn-mini', onClick: () => this.restaurarZona(zona.id) }, 'Voltar ao padrão');
    return h('div', { class: 'editor-zona-detalhe' }, h('div', { class: 'editor-zona-campos' }, campos), this.botaoRestaurarZona);
  }

  textoValores({ x, y, w, h: altura }) {
    return `${x}, ${y} · ${w}×${altura}`;
  }

  atualizarRodape() {
    const pendente = this.temAlteracoes;
    this.status.classList.toggle('pendente', pendente);
    if (this.salvando) this.status.textContent = 'Salvando...';
    else if (pendente) this.status.textContent = 'Alterações não salvas.';
    else this.status.textContent = 'Tudo salvo. O jogo usa estas zonas ao recarregar.';
    this.botaoSalvar.disabled = !this.props.podeSalvar || !pendente || this.salvando;
    this.botaoDesfazer.disabled = this.historico.vazio;
  }

  /** Peças de exemplo nos encaixes, com as mesmas regras de posição do jogo */
  previa() {
    const base = retangulo(0, 0, this.tamanho.largura, this.tamanho.altura);
    const pecas = [];
    const areas = [];
    if (this.grupo === 'placas') this.previaDaPlaca(this.chave, this.layout, base, pecas, areas);
    else this.previaDoGabinete(base, pecas, areas);
    return { pecas: this.mostrarPecas ? pecas : [], areas: this.mostrarAreas ? areas : [] };
  }

  previaDaPlaca(chavePlaca, layout, base, pecas, areas) {
    const placa = PECAS.find((p) => p.categoria === 'placa_mae' && p.sprite === chavePlaca);
    const escala = base.width / SPRITES[chavePlaca].largura;
    const exemplos = {
      cpu: PECAS.find((p) => p.categoria === 'cpu' && p.socket === placa.socket).sprite,
      ram: PECAS.find((p) => p.categoria === 'ram' && p.tipoRam === placa.tipoRam).sprite,
      m2: peca('ssd-nvme-1tb').sprite,
      gpu: peca('gpu-media').sprite,
    };
    for (const zona of listarZonas(layout)) {
      const regra = PECA_DA_ZONA[zona.campo];
      if (!exemplos[regra]) continue;
      const r = daFracao(zona.ret, base);
      pecas.push({ url: this.props.arte[exemplos[regra]], px: this.paraCaixa(ARTE_NO_ENCAIXE[regra](exemplos[regra], r, escala)) });
      // No socket, a maior área é a do cooler (o processador usa o próprio socket)
      areas.push({ px: this.paraCaixa(AREA_DE_SOLTAR[regra === 'cpu' ? 'cooler' : regra](r)) });
    }
  }

  previaDoGabinete(base, pecas, areas) {
    const gabinete = PECAS.find((p) => p.categoria === 'gabinete' && p.sprite === this.chave);
    const placas = PECAS.filter((p) => p.categoria === 'placa_mae' && gabinete.formatos.includes(p.formato));
    const placa = placas.find((p) => p.formato === 'ATX') || placas[0];
    const discos = [peca('ssd-sata-1tb').sprite, peca('hd-2tb').sprite];
    for (const zona of listarZonas(this.layout)) {
      const r = daFracao(zona.ret, base);
      if (zona.campo === 'placa') {
        const areaPlaca = ARTE_NO_ENCAIXE.placa(placa.sprite, r);
        pecas.push({ url: this.props.arte[placa.sprite], px: this.paraCaixa(areaPlaca) });
        this.previaDaPlaca(placa.sprite, this.layouts.placas[placa.sprite], areaPlaca, pecas, []);
      } else if (zona.campo === 'fonte') {
        pecas.push({ url: this.props.arte.fonte, px: this.paraCaixa(ARTE_NO_ENCAIXE.fonte('fonte', r)) });
      } else if (zona.campo === 'sata') {
        const disco = discos[zona.indice] || discos[0];
        pecas.push({ url: this.props.arte[disco], px: this.paraCaixa(ARTE_NO_ENCAIXE.sata(disco, r)) });
      }
    }
    // Fonte e baias aceitam a peça exatamente na zona: não há área de soltar extra para mostrar
    areas.length = 0;
  }

  paraCaixa({ x, y, width, height }) {
    return { x, y, w: width, h: height };
  }

  // ---------------- Ações ----------------

  abrirImagem(grupo, chave) {
    if (chave === this.chave) return;
    this.grupo = grupo;
    this.chave = chave;
    this.selecionada = null;
    this.zoom = this.zoomInicial();
    this.atualizar();
  }

  definirZoom(zoom) {
    if (!zoom) return;
    this.zoom = zoom;
    this.atualizar();
  }

  selecionar(id) {
    if (this.selecionada === id) return;
    this.selecionada = id;
    this.quadro.selecionar(id);
    this.redesenharPaineis();
  }

  pixelsDaZona(id) {
    return paraPixels(lerZona(this.layout, id), this.tamanho);
  }

  /** Muda a zona a partir de pixels (arraste, teclado ou campos numéricos) */
  mudarZona(id, novo, { guardar = false, atualizarCampos = true } = {}) {
    if (guardar) this.historico.guardar(this.layouts);
    escreverZona(this.layout, id, paraFracao(novo, this.tamanho));
    this.quadro.posicionar(id, novo);
    this.quadro.mostrarPrevia(this.previa());
    this.valores.get(id).textContent = this.textoValores(novo);
    if (atualizarCampos && this.campos && id === this.selecionada) {
      for (const [chave] of CAMPOS_NUMERICOS) this.campos[chave].value = novo[chave];
    }
    this.atualizarIndicadores();
  }

  digitarValores(confirmar) {
    const id = this.selecionada;
    if (!id || !this.campos) return;
    const numeros = Object.fromEntries(CAMPOS_NUMERICOS.map(([chave]) => [chave, Number(this.campos[chave].value)]));
    if (!Object.values(numeros).every(Number.isFinite)) return;
    const novo = limitar(numeros, this.tamanho);
    if (confirmar && this.antesDeDigitar && this.antesDeDigitar !== JSON.stringify(this.layouts)) {
      this.historico.guardar(this.antesDeDigitar);
      this.antesDeDigitar = JSON.stringify(this.layouts);
    }
    this.mudarZona(id, novo, { atualizarCampos: confirmar });
  }

  aoTeclar(evento) {
    if (evento.target.closest('input, select, textarea')) return;
    const comando = evento.ctrlKey || evento.metaKey;
    if (comando && evento.key.toLowerCase() === 'z') {
      evento.preventDefault();
      this.desfazer();
    } else if (comando && evento.key.toLowerCase() === 's') {
      evento.preventDefault();
      this.salvar();
    } else if (evento.key === 'Escape') {
      this.selecionar(null);
    } else if (SETAS[evento.key] && this.selecionada) {
      evento.preventDefault();
      const passo = evento.shiftKey ? 10 : 1;
      const [dx, dy] = SETAS[evento.key].map((v) => v * passo);
      const atual = this.pixelsDaZona(this.selecionada);
      this.mudarZona(this.selecionada, arrastarRetangulo(atual, evento.altKey ? 'se' : 'mover', dx, dy, this.tamanho), { guardar: true });
    }
  }

  desfazer() {
    const anterior = this.historico.desfazer();
    if (!anterior) return;
    this.layouts = anterior;
    this.atualizar();
  }

  restaurarZona(id) {
    this.historico.guardar(this.layouts);
    escreverZona(this.layout, id, zonaPadrao(this.grupo, this.chave, id));
    this.atualizar();
  }

  restaurarImagem() {
    this.historico.guardar(this.layouts);
    this.layouts[this.grupo][this.chave] = zonasPadrao(this.grupo, this.chave);
    this.selecionada = null;
    this.atualizar();
  }

  carregarAntigas() {
    this.historico.guardar(this.layouts);
    for (const [grupo, imagens] of Object.entries(this.zonasAntigas)) {
      for (const [chave, campos] of Object.entries(imagens)) Object.assign(this.layouts[grupo][chave], structuredClone(campos));
    }
    this.antigasCarregadas = true;
    this.atualizar();
    Toast.mostrar('Zonas do editor antigo carregadas. Confira e clique em "Salvar zonas".');
  }

  descartarAntigas() {
    this.zonasAntigas = null;
    this.emitir('DescartarAntigas');
    this.atualizar();
  }

  async salvar() {
    if (!this.props.podeSalvar || !this.temAlteracoes || this.salvando) return;
    const zonas = diferencasDoPadrao(this.layouts);
    this.salvando = true;
    this.atualizarRodape();
    try {
      await api.put('/oficina/zonas', zonas);
      this.salvo = JSON.stringify(zonas);
      if (this.antigasCarregadas) this.descartarAntigas();
      Toast.sucesso('Zonas salvas em public/images/oficina/zonas.json. Recarregue a Oficina para ver no jogo.');
    } catch (erro) {
      Toast.erro(erro.message);
    } finally {
      this.salvando = false;
      this.redesenharPaineis();
    }
  }

  async copiarJson() {
    const texto = formatarZonas(diferencasDoPadrao(this.layouts));
    try {
      await navigator.clipboard.writeText(texto);
      Toast.sucesso('JSON copiado. Cole em public/images/oficina/zonas.json.');
    } catch {
      window.prompt('Copie o conteúdo abaixo para public/images/oficina/zonas.json:', texto);
    }
  }
}
