// Tela de uma fase: a horta (canvas), a fala do robô, os controles de
// execução e o editor do plano. Roda o plano animando um evento de cada vez.

import { h, substituirFilhos } from '../../../core/dom.js';
import { armazenamentoLocal } from '../../../core/SafeStorage.js';
import { executar } from '../regras/Interpretador.js';
import { CONDICOES, contarBlocos, copiarPlano, planoParaSalvar } from '../regras/blocos.js';
import { FASES, calcularEstrelas, montarHortas } from '../regras/fases.js';
import { CORES_PARTICULAS, Desenho } from './Desenho.js';
import { EditorDeBlocos } from './EditorDeBlocos.js';
import { sons } from './sons.js';

const VELOCIDADES = [
  { id: 'lento', icone: '🐢', rotulo: 'Devagar', ms: 560 },
  { id: 'normal', icone: '🐇', rotulo: 'Normal', ms: 300 },
  { id: 'rapido', icone: '🚀', rotulo: 'Rápido', ms: 90 },
];

const DESLOCAMENTO = { cima: [0, -1], direita: [1, 0], baixo: [0, 1], esquerda: [-1, 0] };

export class TelaFase {
  constructor({ alvo, indice, progresso, aoVoltar, aoAbrirFase }) {
    this.alvo = alvo;
    this.indice = indice;
    this.fase = FASES[indice];
    this.progresso = progresso;
    this.aoVoltar = aoVoltar;
    this.aoAbrirFase = aoAbrirFase;

    this.plano = copiarPlano(progresso.plano(this.fase.id), this.fase.blocos);
    this.hortas = montarHortas(this.fase);
    this.estadoHortas = this.hortas.map(() => null);
    this.indiceHorta = 0;
    this.modo = 'parado'; // 'rodando' | 'passo'
    this.token = 0;
    this.particulas = [];
    this.ocupadoAte = 0;
    this.ultimoDesenho = 0;
    const salva = armazenamentoLocal.ler('horta:velocidade', 'normal');
    this.velocidade = VELOCIDADES.find((v) => v.id === salva) || VELOCIDADES[1];
  }

  // ---------- montagem ----------

  montar() {
    const { fase } = this;
    this.canvas = h('canvas', { class: 'horta-canvas', 'aria-label': 'Horta com o robô' });
    this.falaTexto = h('p', { class: 'fala-texto' });
    this.abas = h('div', { class: 'hortas-abas' });
    this.objetivos = h('div', { class: 'objetivos' });
    this.contador = h('div', { class: 'plano-contador' });
    this.paleta = h('div', { class: 'paleta' });
    this.area = h('div', { class: 'plano-area' });
    this.resultado = h('div', { class: 'resultado', hidden: true });

    this.botaoRodar = h('button', { type: 'button', class: 'btn btn-rodar', onClick: () => this.alternarRodar() });
    this.botaoPasso = h('button', { type: 'button', class: 'btn btn-contorno', onClick: () => this.darPasso() }, '⏭ Passo a passo');
    this.botaoRecomecar = h('button', { type: 'button', class: 'btn btn-contorno', onClick: () => this.recomecar() }, '↺ Recomeçar');
    this.botoesVelocidade = VELOCIDADES.map((v) =>
      h('button', {
        type: 'button',
        class: 'velocidade-botao',
        title: v.rotulo,
        'aria-label': v.rotulo,
        text: v.icone,
        onClick: () => this.mudarVelocidade(v),
      })
    );
    this.botaoSom = h('button', { type: 'button', class: 'btn btn-suave btn-som', onClick: () => this.alternarSom() });

    const melhor = this.progresso.estrelas(fase.id);
    const tela = h(
      'div',
      { class: 'horta-fase' },
      h(
        'div',
        { class: 'fase-barra' },
        h('button', { type: 'button', class: 'btn btn-suave', onClick: () => this.aoVoltar() }, '← Fases'),
        h('div', { class: 'fase-titulo' }, h('span', { class: 'fase-numero', text: `Fase ${fase.id}` }), h('h2', { text: fase.titulo })),
        h('span', { class: 'fase-melhor', title: 'Seu melhor resultado', text: '★'.repeat(melhor) + '☆'.repeat(3 - melhor) }),
        this.botaoSom
      ),
      h(
        'div',
        { class: 'fase-grade' },
        h(
          'section',
          { class: 'fase-palco' },
          h('div', { class: 'fala' }, h('span', { class: 'fala-robo', 'aria-hidden': 'true', text: '🤖' }), this.falaTexto),
          this.abas,
          h('div', { class: 'palco-canvas' }, this.canvas),
          this.objetivos,
          h(
            'div',
            { class: 'controles' },
            this.botaoRodar,
            this.botaoPasso,
            this.botaoRecomecar,
            h('div', { class: 'velocidade', role: 'group', 'aria-label': 'Velocidade' }, this.botoesVelocidade)
          )
        ),
        h(
          'section',
          { class: 'fase-oficina' },
          h('div', { class: 'coluna-paleta' }, h('h3', { text: 'Blocos' }), this.paleta, h('p', { class: 'dica-paleta', text: 'Arraste um bloco para cá para jogar fora.' })),
          h(
            'div',
            { class: 'coluna-plano' },
            h('div', { class: 'plano-topo' }, h('h3', { text: 'Plano do robô' }), this.contador),
            this.area,
            h(
              'div',
              { class: 'plano-rodape' },
              h('button', { type: 'button', class: 'btn btn-suave btn-pequeno', onClick: () => this.limparPlano() }, '🗑 Limpar tudo')
            )
          )
        )
      ),
      this.resultado
    );
    substituirFilhos(this.alvo, tela);

    this.desenho = new Desenho(this.canvas);
    this.editor = new EditorDeBlocos({
      paleta: this.paleta,
      area: this.area,
      fase,
      plano: this.plano,
      aoMudar: () => this.planoMudou(),
    });
    this.aoRedimensionar = () => this.ajustarCanvas();
    window.addEventListener('resize', this.aoRedimensionar);

    this.falar(fase.fala);
    this.mostrarHorta(0);
    this.atualizarContador();
    this.atualizarControles();
    this.atualizarSom();
    this.laco = requestAnimationFrame((t) => this.quadro(t));
  }

  destruir() {
    this.destruida = true;
    this.token += 1;
    cancelAnimationFrame(this.laco);
    clearTimeout(this.salvarDepois);
    window.removeEventListener('resize', this.aoRedimensionar);
    if (this.editor) this.editor.destruir();
  }

  // ---------- desenho ----------

  quadro(agora) {
    if (this.destruida) return;
    const dt = Math.min(0.05, (agora - (this.ultimoQuadro || agora)) / 1000);
    this.ultimoQuadro = agora;
    if (this.particulas.length) {
      for (const p of this.particulas) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 9 * dt;
        p.vida -= dt;
      }
      this.particulas = this.particulas.filter((p) => p.vida > 0);
      this.visual.particulas = this.particulas;
    }
    // Parado, só redesenha de vez em quando (moedas girando): poupa PCs fracos
    const ocupado = agora < this.ocupadoAte || this.particulas.length > 0;
    if (ocupado || agora - this.ultimoDesenho > 150) {
      this.desenho.desenhar(this.horta, this.visual, agora);
      this.ultimoDesenho = agora;
    }
    this.laco = requestAnimationFrame((t) => this.quadro(t));
  }

  ajustarCanvas() {
    const largura = this.canvas.parentElement.clientWidth || 480;
    this.desenho.ajustar(this.horta, largura);
    this.ultimoDesenho = 0;
  }

  mostrarHorta(i) {
    this.indiceHorta = i;
    this.horta = this.hortas[i].clonar();
    const { robo } = this.horta;
    this.visual = { x: robo.x, y: robo.y, dir: robo.dir, pulo: 0, tremor: 0, balao: null, particulas: this.particulas };
    this.ajustarCanvas();
    this.atualizarAbas();
    this.atualizarObjetivos();
  }

  soltarParticulas(tipo, quantidade = 10) {
    const cores = CORES_PARTICULAS[tipo];
    for (let i = 0; i < quantidade; i++) {
      this.particulas.push({
        x: this.visual.x + 0.5,
        y: this.visual.y + 0.4,
        vx: (Math.random() - 0.5) * 4,
        vy: -1.5 - Math.random() * 3,
        cor: cores[i % cores.length],
        tamanho: Math.random() > 0.5 ? 2 : 1,
        vida: 0.5 + Math.random() * 0.4,
      });
    }
    this.visual.particulas = this.particulas;
  }

  /** Anima por `ms`: chama fn(t) com t de 0 a 1. Para sozinha se a execução for cancelada */
  animar(ms, fn = () => {}) {
    const token = this.token;
    this.ocupadoAte = Math.max(this.ocupadoAte, performance.now() + ms + 50);
    return new Promise((resolver) => {
      const inicio = performance.now();
      const passo = (agora) => {
        if (token !== this.token || this.destruida) return resolver();
        const t = Math.min(1, (agora - inicio) / ms);
        fn(t);
        if (t < 1) requestAnimationFrame(passo);
        else resolver();
      };
      requestAnimationFrame(passo);
    });
  }

  // ---------- textos e painéis ----------

  falar(texto, tipo = '') {
    this.falaTexto.textContent = texto;
    this.falaTexto.parentElement.className = `fala${tipo ? ` fala-${tipo}` : ''}`;
  }

  atualizarAbas() {
    if (this.hortas.length < 2) {
      this.abas.hidden = true;
      return;
    }
    this.abas.hidden = false;
    const livre = this.modo === 'parado';
    substituirFilhos(
      this.abas,
      h('span', { class: 'abas-rotulo', text: 'O mesmo plano precisa funcionar em:' }),
      this.hortas.map((_, i) => {
        const estado = this.estadoHortas[i];
        return h(
          'button',
          {
            type: 'button',
            class: `aba-horta${i === this.indiceHorta ? ' ativa' : ''}${estado ? ` ${estado}` : ''}`,
            disabled: !livre,
            onClick: () => {
              sons.tocar('clique');
              this.mostrarHorta(i);
            },
          },
          `${estado === 'ok' ? '✓ ' : estado === 'erro' ? '✗ ' : ''}Horta ${i + 1}`
        );
      }),
      h('button', {
        type: 'button',
        class: 'aba-sortear',
        title: 'Sortear outras hortas',
        'aria-label': 'Sortear outras hortas',
        text: '🎲',
        disabled: !livre,
        onClick: () => this.sortearHortas(),
      })
    );
  }

  atualizarObjetivos() {
    const { horta } = this;
    const p = horta.pendencias();
    const m = horta.metas;
    const chips = [];
    const chip = (texto, feito, extra = '') => h('span', { class: `objetivo${feito ? ' feito' : ''}${extra}`, text: texto });
    if (m.colher) chips.push(chip(`🍅 Colher ${m.colher - p.colher}/${m.colher}`, !p.colher));
    if (m.plantar) chips.push(chip(`🌱 Plantar ${m.plantar - p.plantar}/${m.plantar}`, !p.plantar));
    if (m.regar) chips.push(chip(`💧 Regar ${m.regar - p.regar}/${m.regar}`, !p.regar));
    if (horta.temCeleiro) chips.push(chip('🏠 Chegar no celeiro', !p.celeiro));
    if (m.moedas) chips.push(chip(`🪙 Moedas ${horta.moedasPegas}/${m.moedas}`, horta.moedasPegas >= m.moedas, ' bonus'));
    substituirFilhos(this.objetivos, chips);
  }

  atualizarContador() {
    const n = contarBlocos(this.plano);
    const { meta } = this.fase;
    substituirFilhos(
      this.contador,
      h('span', { text: `${n} ${n === 1 ? 'bloco' : 'blocos'}` }),
      h('span', {
        class: `meta${n > 0 && n <= meta ? ' ok' : ''}`,
        title: 'Use no máximo esse número de blocos para ganhar uma estrela',
        text: `★ meta: até ${meta}`,
      })
    );
  }

  atualizarControles() {
    const rodando = this.modo === 'rodando';
    this.botaoRodar.textContent = rodando ? '⏹ Parar' : '▶ Rodar';
    this.botaoRodar.classList.toggle('parar', rodando);
    this.botaoPasso.disabled = rodando;
    for (const [i, v] of VELOCIDADES.entries()) this.botoesVelocidade[i].classList.toggle('ativo', v === this.velocidade);
    this.editor.travar(this.modo !== 'parado');
    this.atualizarAbas();
  }

  atualizarSom() {
    this.botaoSom.textContent = sons.ligado ? '🔊' : '🔇';
    this.botaoSom.title = sons.ligado ? 'Desligar o som' : 'Ligar o som';
  }

  alternarSom() {
    sons.alternar();
    this.atualizarSom();
    sons.tocar('clique');
  }

  mudarVelocidade(v) {
    this.velocidade = v;
    armazenamentoLocal.salvar('horta:velocidade', v.id);
    sons.tocar('clique');
    this.atualizarControles();
  }

  planoMudou() {
    this.atualizarContador();
    clearTimeout(this.salvarDepois);
    this.salvarDepois = setTimeout(() => this.progresso.guardarPlano(this.fase.id, planoParaSalvar(this.plano)), 300);
  }

  limparPlano() {
    if (this.modo !== 'parado' || !this.plano.length) return;
    this.editor.limpar();
  }

  sortearHortas() {
    if (this.modo !== 'parado') return;
    sons.tocar('encaixar');
    this.hortas = montarHortas(this.fase);
    this.estadoHortas = this.hortas.map(() => null);
    this.editor.limparDestaques();
    this.mostrarHorta(0);
    this.falar('Sorteei hortas novas! Será que o seu plano funciona nelas?');
  }

  // ---------- execução ----------

  recomecar() {
    this.token += 1;
    this.modo = 'parado';
    this.execucao = null;
    this.particulas = [];
    this.editor.limparDestaques();
    this.fecharResultado();
    this.mostrarHorta(this.indiceHorta);
    this.atualizarControles();
    this.falar(this.fase.fala);
  }

  alternarRodar() {
    if (this.modo === 'rodando') {
      sons.tocar('clique');
      this.recomecar();
      return;
    }
    this.rodarTudo();
  }

  planoVazio() {
    if (this.plano.length) return false;
    sons.tocar('errar');
    this.falar('Meu plano está vazio! Clique nos blocos para me dar ordens.', 'erro');
    return true;
  }

  async rodarTudo() {
    if (this.planoVazio()) return;
    this.token += 1;
    const token = this.token;
    this.modo = 'rodando';
    this.fecharResultado();
    this.estadoHortas = this.hortas.map(() => null);
    this.editor.limparDestaques();
    this.atualizarControles();

    let moedasPegas = 0;
    let moedasTotal = 0;
    for (let i = 0; i < this.hortas.length; i++) {
      this.mostrarHorta(i);
      this.falar(this.hortas.length > 1 ? `Testando a horta ${i + 1} de ${this.hortas.length}...` : 'Lá vou eu!');
      await this.animar(200);
      if (token !== this.token) return;
      const resultado = await this.executarAnimado(token);
      if (!resultado || token !== this.token) return;
      if (!resultado.ok) {
        this.estadoHortas[i] = 'erro';
        this.terminar();
        this.mostrarFalha(resultado, i);
        return;
      }
      this.estadoHortas[i] = 'ok';
      this.atualizarAbas();
      moedasPegas += this.horta.moedasPegas;
      moedasTotal += this.horta.metas.moedas;
      sons.tocar('hortaOk');
      this.soltarParticulas('festa', 14);
      await this.animar(Math.max(350, this.velocidade.ms * 2), (t) => (this.visual.pulo = Math.abs(Math.sin(t * Math.PI * 2)) * 4));
      if (token !== this.token) return;
    }
    this.terminar();
    this.vitoria({ moedasPegas, moedasTotal });
  }

  terminar() {
    this.modo = 'parado';
    this.editor.destacar(null);
    this.atualizarControles();
  }

  async executarAnimado(token) {
    const execucao = executar(this.plano, this.horta);
    for (;;) {
      const passo = execucao.next();
      if (passo.done) return passo.value;
      await this.animarEvento(passo.value);
      if (token !== this.token) return null;
    }
  }

  async darPasso() {
    if (this.modo === 'rodando' || this.animandoPasso) return;
    if (this.modo !== 'passo') {
      if (this.planoVazio()) return;
      this.token += 1;
      this.fecharResultado();
      this.editor.limparDestaques();
      this.mostrarHorta(this.indiceHorta);
      this.execucao = executar(this.plano, this.horta);
      this.modo = 'passo';
      this.atualizarControles();
    }
    const token = this.token;
    const passo = this.execucao.next();
    if (passo.done) return this.fimDoPasso(passo.value);
    this.animandoPasso = true;
    await this.animarEvento(passo.value, true);
    this.animandoPasso = false;
    if (token !== this.token) return;
    const ev = passo.value;
    if (ev.tipo === 'acao' && !ev.resultado.ok) this.fimDoPasso(this.execucao.next().value);
  }

  fimDoPasso(resultado) {
    this.execucao = null;
    this.terminar();
    if (!resultado.ok) return this.mostrarFalha(resultado, this.indiceHorta);
    sons.tocar('hortaOk');
    this.soltarParticulas('festa', 14);
    this.falar(
      this.hortas.length > 1
        ? `A horta ${this.indiceHorta + 1} ficou pronta! Aperte ▶ Rodar para testar todas as hortas.`
        : 'A horta ficou pronta! Aperte ▶ Rodar para valer as estrelas.',
      'ok'
    );
  }

  mostrarFalha(resultado, i) {
    if (resultado.bloco) this.editor.destacar(resultado.bloco, 'com-erro');
    const onde = this.hortas.length > 1 ? ` (na horta ${i + 1})` : '';
    const dica = this.hortas.length > 1 && i > 0 ? ' Lembre: o mesmo plano precisa servir para todas as hortas.' : '';
    this.falar(`${resultado.motivo === 'incompleto' ? '🤔' : '😵'} ${resultado.mensagem}${onde}${dica}`, 'erro');
    if (resultado.motivo !== 'erro') sons.tocar('errar');
  }

  async animarEvento(ev, explicar = false) {
    const base = this.velocidade.ms;
    this.editor.destacar(ev.bloco);
    if (ev.tipo === 'volta') {
      if (explicar) this.falar(`🔁 Repita: volta ${ev.volta} de ${ev.total}.`);
      await this.animar(base * 0.3);
    } else if (ev.tipo === 'pergunta') {
      sons.tocar('pergunta');
      this.visual.balao = ev.valor;
      const texto = CONDICOES[ev.condicao].se;
      if (explicar) this.falar(`O robô olha: ${texto}? ${ev.valor ? 'Sim!' : 'Não.'}`);
      await this.animar(base * 0.9);
      sons.tocar(ev.valor ? 'sim' : 'nao');
      this.visual.balao = null;
    } else {
      if (explicar) this.falar(`${ev.resultado.ok ? '👉' : '😵'} ${this.descreverAcao(ev.acao)}`);
      await this.animarAcao(ev, base);
    }
    this.atualizarObjetivos();
  }

  descreverAcao(acao) {
    return { andar: 'Andar 1 casa', direita: 'Virar à direita', esquerda: 'Virar à esquerda', colher: 'Colher', plantar: 'Plantar', regar: 'Regar' }[acao];
  }

  async animarAcao(ev, base) {
    const { visual, horta } = this;
    const { resultado } = ev;
    if (ev.acao === 'andar') {
      if (resultado.ok) {
        const de = resultado.de;
        const para = { x: horta.robo.x, y: horta.robo.y };
        sons.tocar('andar');
        await this.animar(base, (t) => {
          visual.x = de.x + (para.x - de.x) * t;
          visual.y = de.y + (para.y - de.y) * t;
          visual.pulo = Math.sin(t * Math.PI) * 1.5;
        });
        if (resultado.efeito === 'moeda') {
          sons.tocar('moeda');
          this.soltarParticulas('moeda', 8);
        }
        return;
      }
      const [dx, dy] = DESLOCAMENTO[horta.robo.dir];
      await this.animar(base * 0.4, (t) => {
        visual.x = horta.robo.x + dx * 0.3 * t;
        visual.y = horta.robo.y + dy * 0.3 * t;
      });
      sons.tocar('bater');
      this.soltarParticulas('bater', 8);
      visual.tremor = 2;
      await this.animar(base * 0.4 + 250, (t) => {
        visual.x = horta.robo.x + dx * 0.3 * (1 - t);
        visual.y = horta.robo.y + dy * 0.3 * (1 - t);
      });
      visual.tremor = 0;
      return;
    }
    if (ev.acao === 'direita' || ev.acao === 'esquerda') {
      sons.tocar('virar');
      await this.animar(base * 0.25);
      visual.dir = horta.robo.dir;
      await this.animar(base * 0.35);
      return;
    }
    if (resultado.ok) {
      sons.tocar(ev.acao);
      this.soltarParticulas(ev.acao, 10);
      await this.animar(base * 0.8, (t) => (visual.pulo = Math.sin(t * Math.PI) * 4));
      return;
    }
    sons.tocar('errar');
    visual.tremor = 1.5;
    await this.animar(base + 250);
    visual.tremor = 0;
  }

  // ---------- resultado ----------

  vitoria({ moedasPegas, moedasTotal }) {
    const blocos = contarBlocos(this.plano);
    const estrelas = calcularEstrelas(this.fase, { blocos, moedasPegas, moedasTotal });
    this.progresso.registrar(this.fase.id, { estrelas, blocos });
    sons.tocar('sucesso');
    this.falar(this.hortas.length > 1 ? 'Deu certo em todas as hortas! 🎉' : 'Deu certo! 🎉', 'ok');

    const proxima = this.indice + 1 < FASES.length ? this.indice + 1 : null;
    const item = (ok, texto) => h('li', { class: ok ? 'ok' : '' }, h('span', { 'aria-hidden': 'true', text: ok ? '★' : '☆' }), texto);
    const estrelasEl = [0, 1, 2].map((i) => h('span', { class: `estrela${i < estrelas ? ' ganha' : ''}`, text: '★' }));
    substituirFilhos(
      this.resultado,
      h(
        'div',
        { class: 'resultado-caixa', role: 'dialog', 'aria-label': 'Fase concluída' },
        h('div', { class: 'resultado-estrelas' }, estrelasEl),
        h('h2', { text: estrelas === 3 ? 'Perfeito!' : 'Horta pronta!' }),
        h(
          'ul',
          { class: 'resultado-lista' },
          item(true, this.hortas.length > 1 ? 'Funcionou em todas as hortas' : 'Completou a horta'),
          item(blocos <= this.fase.meta, `Usou ${blocos} ${blocos === 1 ? 'bloco' : 'blocos'} (meta: até ${this.fase.meta})`),
          item(moedasPegas >= moedasTotal, `Pegou ${moedasPegas} de ${moedasTotal} moedas`)
        ),
        estrelas < 3 && h('p', { class: 'resultado-dica', text: 'Dá para melhorar o plano e ganhar mais estrelas!' }),
        h(
          'div',
          { class: 'resultado-botoes' },
          h('button', { type: 'button', class: 'btn btn-contorno', onClick: () => this.recomecar() }, 'Melhorar o plano'),
          proxima !== null
            ? h('button', { type: 'button', class: 'btn btn-primario', onClick: () => this.aoAbrirFase(proxima) }, 'Próxima fase →')
            : h('button', { type: 'button', class: 'btn btn-primario', onClick: () => this.aoVoltar() }, 'Ver todas as fases')
        ),
        proxima === null && h('p', { class: 'resultado-dica', text: 'Você terminou todas as fases! 🏆' })
      )
    );
    this.resultado.hidden = false;
    estrelasEl.forEach((el, i) => {
      if (i >= estrelas) return;
      setTimeout(() => {
        if (this.destruida) return;
        el.classList.add('aparecer');
        sons.tocar('estrela', { tom: i * 3 });
      }, 400 + i * 350);
    });
  }

  fecharResultado() {
    if (this.resultado) this.resultado.hidden = true;
  }
}
