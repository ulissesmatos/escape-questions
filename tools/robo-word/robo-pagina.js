// Injetado na página: ajudantes do robô que segue o Mostre-me.
window.R = {
  get app() { return window.operacaoWord; },
  get tela() { return R.app.tela; },
  get sim() { return R.tela.sim; },
  get word() { return R.sim.apps.word; },
  aleatorio: 1,
  sorte() { R.aleatorio = (R.aleatorio * 16807) % 2147483647; return R.aleatorio / 2147483647; },
  escolher(lista) { return lista[Math.floor(R.sorte() * lista.length)]; },

  /** Bagunça "de aluno": coisas que não são o objetivo e deixam a tela diferente */
  caos(n, semente) {
    R.aleatorio = semente;
    const feitos = [];
    const acoes = {
      guia: () => { const g = R.escolher(['inserir', 'layout', 'exibir', 'revisao', 'design', 'referencias']); document.querySelector(`[data-alvo="word.guia.${g}"]`)?.click(); return `guia ${g}`; },
      arquivo: () => { document.querySelector('[data-alvo="word.guia.arquivo"]')?.click(); return 'abriu Arquivo'; },
      iniciar: () => { document.querySelector('[data-alvo="barra.iniciar"]')?.click(); return 'abriu Iniciar'; },
      minimizar: () => { const w = R.sim.apps.word; if (w && !w.janela.fechada) w.janela.minimizar(); return 'minimizou Word'; },
      explorador: () => { R.sim.abrirApp('explorador', { via: 'barra' }); return 'abriu Explorador'; },
      edge: () => { R.sim.abrirApp('edge', { via: 'barra' }); return 'abriu Edge'; },
      palavra: () => {
        const w = R.sim.apps.word;
        if (!w?.temDocumento) return 'nada';
        const palavras = w.inspetor.texto().split(/\s+/).filter((p) => p.length > 3);
        const p = R.escolher(palavras);
        const a = p && w.inspetor.achar(p);
        if (a) w.documento.selecionarIntervalo(a.mapa.intervalo(a.inicio, a.fim));
        return `selecionou ${p}`;
      },
      menuEsc: () => { document.querySelector('[data-alvo="word.faixa.inicio.entreLinhas"]')?.click(); document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 'abriu menu'; },
    };
    const nomes = Object.keys(acoes);
    for (let i = 0; i < n; i++) feitos.push(acoes[R.escolher(nomes)]());
    return feitos;
  },

  /** Descreve (e faz, quando é algo da página) o passo que o Mostre-me mostra agora */
  passo() {
    const tela = R.tela;
    if (!tela || tela.concluida) return { fim: true };
    const objetivo = tela.objetivoAtual;
    if (!objetivo) return { fim: true };
    const r = tela.guia.resolver(objetivo);
    if (!r) return { erro: 'sem caminho', objetivo: objetivo.texto };
    if (r.espera) return { objetivo: objetivo.texto, indice: -1, texto: r.texto, tipo: 'esperar' };
    const p = r.passo;
    const base = { objetivo: objetivo.texto, indice: r.indice, texto: r.texto, pergunta: objetivo.pergunta?.id || null };
    const rect = r.obterRetangulo?.();
    const centro = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
    const w = R.sim.apps.word;
    // passos de texto: o robô coloca o cursor/seleção como um aluno faria
    if (r.intervalo && (p.trecho !== undefined || p.inicioDoDocumento || p.tabelaLinha !== undefined)) {
      const iv = r.intervalo.cloneRange();
      if (p.inicio || p.inicioDoDocumento) {
        const bloco = (iv.startContainer.nodeType === 3 ? iv.startContainer.parentElement : iv.startContainer).closest('p, h1, h2, h3, li');
        iv.setStart(bloco, 0);
        iv.collapse(true);
      } else if (p.fim) iv.collapse(false);
      else if (p.dentro) {
        if (iv.startContainer.nodeType === 3) iv.setStart(iv.startContainer, Math.min(iv.startContainer.data.length, iv.startOffset + 1));
        iv.collapse(true);
      }
      w.documento.selecionarIntervalo(iv);
      w.aoSelecionar();
      if (p.acao === 'duplo' && w.pincel) w.aplicarPincel();
      return { ...base, tipo: 'texto', enter: Boolean(p.enter) };
    }
    if (p.escolher !== undefined) {
      const el = r.elemento;
      el.value = p.escolher;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ...base, tipo: 'escolheu' };
    }
    if (p.tabela && p.valor !== undefined) {
      const cel = r.elemento.querySelector('p') || r.elemento;
      const iv = document.createRange();
      iv.selectNodeContents(cel);
      iv.collapse(false);
      w.documento.selecionarIntervalo(iv);
      return { ...base, tipo: 'digitar', valor: p.valor };
    }
    if (p.digitar !== undefined) {
      if (p.alvo === 'word.folha') {
        w.documento.focar();
      } else {
        const el = r.elemento;
        el.focus();
        const iv = document.createRange();
        iv.selectNodeContents(el);
        iv.collapse(false);
        getSelection().removeAllRanges();
        getSelection().addRange(iv);
      }
      return { ...base, tipo: 'digitar', valor: p.digitar };
    }
    if (p.valor !== undefined && r.elemento && 'value' in r.elemento) {
      r.elemento.focus();
      r.elemento.select?.();
      return { ...base, tipo: 'campo', valor: p.valor, confirmar: p.confirmar || null, centro };
    }
    if (!centro) return { ...base, erro: `Mostre-me sem lugar na tela: "${r.texto}"` };
    let ponto = centro;
    if (p.alvo === 'explorador.lista') ponto = { x: rect.left + 30, y: rect.bottom - 12 };
    const acao = p.acao || (p.erro ? 'direito' : 'clique');
    return { ...base, tipo: 'clicar', acao, ponto };
  },

  respostaCerta(id) {
    const insp = R.sim.apps.word.inspetor;
    if (id === 'satelite') return String(insp.contarOcorrencias('satélite'));
    if (id === 'palavras') return String(insp.contarPalavras());
    return '';
  },

  responder(id, valor) {
    const obj = R.tela.objetivoAtual;
    R.tela.responder(obj, valor);
    return true;
  },
};
true;
