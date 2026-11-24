// Injetado na página: ajudantes do robô que segue o Mostre-me na Operação Anzol.
window.R = {
  get app() { return window.operacaoAnzol; },
  get tela() { return R.app.tela; },
  get sim() { return R.tela.sim; },
  SENHA: 'Gato-Verde-Pula-Nuvem7!',
  aleatorio: 1,
  sorte() { R.aleatorio = (R.aleatorio * 16807) % 2147483647; return R.aleatorio / 2147483647; },
  escolher(lista) { return lista[Math.floor(R.sorte() * lista.length)]; },

  /** Bagunça "de aluno" (sem cair em golpe nenhum): abre programas, troca de tela, minimiza */
  caos(n, semente) {
    R.aleatorio = semente;
    const feitos = [];
    const s = () => R.sim;
    const acoes = {
      iniciar: () => { document.querySelector('[data-alvo="barra.iniciar"]')?.click(); return 'abriu Iniciar'; },
      email: () => { s().abrirApp('email', { via: 'barra' }); return 'abriu Email'; },
      pastaLixo: () => { s().apps.email?.irPara?.('lixo'); return 'Email no Lixo Eletrônico'; },
      edge: () => { s().abrirApp('edge', { via: 'barra' }).navegar(R.escolher(['megaloja.com.br', 'conecta.com.br/privacidade', 'busca.com.br/?q=jogos', 'bancopatria.com.br']), { via: 'digitado' }); return 'navegou'; },
      celular: () => { const c = s().abrirApp('celular', { via: 'barra' }); c.ir(R.escolher(['inicio', 'contatos', 'conversas'])); return 'mexeu no Celular'; },
      explorador: () => { s().abrirApp('explorador', { via: 'barra' }).ir(R.escolher(['Documentos', 'Imagens'])); return 'abriu Explorador'; },
      minimizar: () => { const j = s().janelaAtiva; if (j) j.minimizar(); return 'minimizou'; },
    };
    const nomes = Object.keys(acoes);
    for (let i = 0; i < n; i++) feitos.push(acoes[R.escolher(nomes)]());
    return feitos;
  },

  /** O passo que o Mostre-me mostra agora (e o que o robô deve fazer nele) */
  passo() {
    const tela = R.tela;
    if (!tela || tela.concluida) return { fim: true };
    const obj = tela.objetivoAtual;
    if (!obj) return { fim: true };
    const r = tela.guia.resolver(obj);
    const base = { objetivo: obj.texto, pergunta: obj.pergunta?.id || null };
    if (!r) return obj.pergunta ? { ...base, tipo: 'pergunta' } : { ...base, erro: 'sem caminho' };
    Object.assign(base, { texto: r.texto, indice: r.indice });
    if (r.espera) return { ...base, tipo: 'esperar' };
    const rect = r.obterRetangulo?.();
    if (!rect) return obj.pergunta ? { ...base, tipo: 'pergunta' } : { ...base, erro: `Mostre-me sem lugar na tela: "${r.texto}"` };
    const ponto = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const p = r.passo;
    const mundo = tela.sim.mundo;
    let valor = p.valor;
    if (p.alvo === 'site.conta.senha.nova' || p.alvo === 'site.conta.senha.confirmar') valor = R.SENHA;
    if (p.alvo === 'site.conta.2fa.codigo') valor = mundo.conta.codigo;
    if (p.alvo === 'site.conecta.bio') valor = 'Amo desenhar e jogar vôlei';
    if (valor !== undefined && r.elemento && 'value' in r.elemento) {
      r.elemento.focus();
      r.elemento.select?.();
      return { ...base, tipo: 'campo', valor, ponto, confirmar: p.confirmar || null };
    }
    if (p.alvo === 'nav.endereco' && p.valor === undefined) return { ...base, tipo: 'enter', ponto };
    return { ...base, tipo: p.acao === 'passar' ? 'passar' : 'clicar', acao: p.acao || 'clique', ponto };
  },

  /** Pergunta da Central: depois de olhar onde o Mostre-me aponta, responde a certa */
  responder() {
    const obj = R.tela.objetivoAtual;
    const certa = obj.pergunta.opcoes.find((op) => obj.conferir(op, R.tela.estado()));
    R.tela.responder(obj, certa);
    return certa;
  },
};
true;
