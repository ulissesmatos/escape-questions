import { h } from '../../../core/dom.js';
import { Janela } from '../../word/sistema/Janela.js';
import { icone } from '../../word/sistema/icones.js';
import { MenuDeContexto } from '../../word/sistema/MenuDeContexto.js';
import { caminhoDe, dominioDe, hostDe, normalizarUrl, pareceEndereco } from '../regras/enderecos.js';
import { SITES, siteDoHost, FAVORITOS_PADRAO } from '../sites/index.js';

/**
 * Microsoft Edge com uma internet de mentira (sites em ../sites). O que o
 * aluno aprende aqui:
 * - a barra de endereços mostra onde você está de verdade: o nome do site é
 *   o que vem logo antes do .com / .com.br;
 * - o cadeado (ou o "Não seguro") ao lado do endereço: clicando aparecem os
 *   detalhes da conexão;
 * - parar o mouse num link mostra o destino no cantinho de baixo;
 * - digitar o endereço você mesmo (ou usar os Favoritos) em vez de confiar
 *   no link que alguém mandou.
 *
 * Eventos (tipo 'web'): visitar (via digitado/link/favorito/pagina), cadeado,
 * senha-digitada (em site falso: deslize), e o que cada site emitir.
 */
export class Navegador {
  constructor(sim) {
    this.sim = sim;
    this.mundo = sim.mundo;
    this.url = '';
    this.voltarPara = [];
    this.avancarPara = [];
    this.janela = new Janela(sim, { app: 'edge', titulo: 'Nova guia - Microsoft Edge', icone: 'img:logo-edge', largura: 980, altura: 600, minLargura: 560, classe: 'janela-edge janela-navegador' });

    this.abaIcone = h('span', { class: 'nav-aba-icone' });
    this.abaTexto = h('span', { class: 'nav-aba-texto', text: 'Nova guia' });
    this.campo = h('input', { type: 'text', class: 'nav-endereco-campo', spellcheck: false, autocomplete: 'off', placeholder: 'Pesquisar ou inserir endereço Web', 'data-alvo': 'nav.endereco', 'aria-label': 'Barra de endereços' });
    this.campo.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        this.navegar(this.campo.value, { via: 'digitado' });
        this.campo.blur();
      } else if (e.key === 'Escape') {
        this.campo.value = this.url;
        this.campo.blur();
      }
    });
    this.campo.addEventListener('focus', () => setTimeout(() => this.campo.select(), 0));
    this.cadeado = h('button', { type: 'button', class: 'nav-cadeado', 'data-alvo': 'nav.cadeado', onClick: (e) => this.mostrarConexao(e.currentTarget) });
    this.botaoVoltar = this.botaoBarra('arrow_left', 'Voltar', 'nav.voltar', () => this.voltar());
    this.botaoAvancar = this.botaoBarra('arrow_right', 'Avançar', 'nav.avancar', () => this.avancar());
    this.favoritos = h('div', { class: 'nav-favoritos' });
    this.pagina = h('div', { class: 'nav-pagina' });
    this.status = h('div', { class: 'nav-status', hidden: true });

    this.janela.conteudo.append(
      h(
        'div',
        { class: 'nav-abas' },
        h('div', { class: 'nav-aba' }, this.abaIcone, this.abaTexto, h('button', { type: 'button', class: 'nav-aba-fechar', 'data-alvo': 'nav.fecharAba', title: 'Fechar guia', onClick: () => this.fecharAba() }, icone('dismiss', { tamanho: 12 }))),
        h('button', { type: 'button', class: 'nav-nova-aba', title: 'Nova guia', 'data-alvo': 'nav.novaAba', onClick: () => this.fecharAba() }, icone('add', { tamanho: 14 }))
      ),
      h(
        'div',
        { class: 'nav-barra' },
        this.botaoVoltar,
        this.botaoAvancar,
        this.botaoBarra('arrow_clockwise', 'Atualizar', 'nav.atualizar', () => this.desenharPagina()),
        h('div', { class: 'nav-endereco' }, this.cadeado, this.campo),
        this.botaoBarra('star', 'Favoritos', 'nav.estrela', () => {}),
        this.botaoBarra('more_horizontal', 'Configurações e mais', 'nav.mais', () => {})
      ),
      this.favoritos,
      h('div', { class: 'nav-pagina-caixa' }, this.pagina, this.status)
    );
    this.pararDeOuvir = this.mundo.aoMudar(() => this.aoMudarMundo());
    this.janela.aoFechar = () => this.pararDeOuvir();
    this.desenharFavoritos();
    this.irPara('', { registrar: false });
  }

  botaoBarra(nome, rotulo, alvo, acao) {
    return h('button', { type: 'button', class: 'nav-botao', title: rotulo, 'aria-label': rotulo, 'data-alvo': alvo, onClick: acao }, icone(nome, { tamanho: 16 }));
  }

  get host() {
    return hostDe(this.url);
  }

  get site() {
    return siteDoHost(this.host);
  }

  emitir(evento) {
    this.sim.emitir({ tipo: 'web', app: 'edge', host: this.host, dominio: dominioDe(this.url), falso: Boolean(this.site?.falso), ...evento });
  }

  // ================= navegação =================

  /** O aluno digitou na barra, clicou num link ou num favorito. via: digitado | link | favorito | pagina */
  navegar(texto, { via = 'pagina' } = {}) {
    const bruto = String(texto ?? '').trim();
    if (!bruto) return;
    const url = pareceEndereco(bruto) ? normalizarUrl(bruto) : `busca.com.br/?q=${encodeURIComponent(bruto)}`;
    if (this.url) this.voltarPara.push(this.url);
    this.avancarPara = [];
    this.irPara(url, { via });
  }

  irPara(url, { via = 'pagina', registrar = true } = {}) {
    this.url = url;
    this.campo.value = url;
    this.status.hidden = true;
    MenuDeContexto.fechar();
    this.desenharPagina();
    if (!registrar || !url) return;
    const host = hostDe(url);
    this.mundo.web.historico.push({ url, via });
    const site = siteDoHost(host);
    this.emitir({
      acao: 'visitar',
      url,
      via,
      existe: Boolean(site),
      marcos: [`web:visitar:${host}`, `web:${via}:${host}`, site ? `web:site:${site.id}` : 'web:erro'],
    });
  }

  voltar() {
    if (!this.voltarPara.length) return;
    this.avancarPara.push(this.url);
    this.irPara(this.voltarPara.pop(), { via: 'voltar' });
  }

  avancar() {
    if (!this.avancarPara.length) return;
    this.voltarPara.push(this.url);
    this.irPara(this.avancarPara.pop(), { via: 'voltar' });
  }

  /** Fechar a guia: no simulador só há uma, então ela volta a ser uma Nova guia */
  fecharAba() {
    const host = this.host;
    const falso = Boolean(this.site?.falso);
    this.voltarPara = [];
    this.avancarPara = [];
    this.irPara('', { registrar: false });
    this.emitir({ acao: 'fechar-aba', host, falso, marcos: host ? [`web:fechou:${host}`] : [] });
  }

  // ================= desenho =================

  desenharFavoritos() {
    const lista = this.mundo.web.favoritos || FAVORITOS_PADRAO;
    this.favoritos.replaceChildren(
      ...lista.map((f) =>
        h(
          'button',
          { type: 'button', class: 'nav-favorito', 'data-alvo': `nav.fav.${f.id}`, title: f.url, onClick: () => this.navegar(f.url, { via: 'favorito' }) },
          faviconDe(siteDoHost(hostDe(f.url))),
          h('span', { text: f.nome })
        )
      )
    );
  }

  desenharPagina() {
    const host = this.host;
    const site = this.site;
    let titulo = 'Nova guia';
    let conteudo;
    if (!this.url) {
      conteudo = SITES.novaGuia.render(this.contexto(SITES.novaGuia));
    } else if (!site) {
      titulo = host;
      conteudo = h(
        'div',
        { class: 'nav-erro' },
        icone('globe', { tamanho: 56 }),
        h('h2', { text: 'Hmmm... não é possível acessar esta página' }),
        h('p', {}, 'Verifique se há um erro de digitação em ', h('strong', { text: host }), '.'),
        h('p', { class: 'nav-erro-dica', text: 'No simulador só existem alguns sites. Confira o endereço que a missão pediu, letra por letra.' })
      );
    } else {
      titulo = site.titulo;
      conteudo = site.render(this.contexto(site));
    }
    this.abaTexto.textContent = titulo;
    this.abaIcone.replaceChildren(this.url ? faviconDe(site) : icone('img:logo-edge', { tamanho: 14 }));
    this.janela.definirTitulo(`${titulo} - Microsoft Edge`);
    this.desenharCadeado(site);
    this.botaoVoltar.disabled = !this.voltarPara.length;
    this.botaoAvancar.disabled = !this.avancarPara.length;
    this.pagina.className = `nav-pagina${site ? ` site-${site.id}` : ''}`;
    this.pagina.replaceChildren(conteudo);
    this.pagina.scrollTop = 0;
  }

  /** Quando o mundo muda (ex.: perfil salvo), redesenha a página sem perder o que está sendo digitado */
  aoMudarMundo() {
    if (this.pagina.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
    if (this.site?.redesenharAoMudar === false) return;
    const rolagem = this.pagina.scrollTop;
    this.desenharPagina();
    this.pagina.scrollTop = rolagem;
  }

  desenharCadeado(site) {
    if (!this.url) {
      this.cadeado.hidden = true;
      return;
    }
    this.cadeado.hidden = false;
    const seguro = site ? site.seguro !== false : true;
    this.cadeado.className = `nav-cadeado${seguro ? '' : ' inseguro'}`;
    this.cadeado.replaceChildren(icone(seguro ? 'lock_closed' : 'warning', { tamanho: 14 }), seguro ? '' : h('span', { text: 'Não seguro' }));
    this.cadeado.title = seguro ? 'Exibir informações do site' : 'Sua conexão com este site não é segura';
  }

  /** Clique no cadeado / "Não seguro": os detalhes da conexão */
  mostrarConexao(botao) {
    const site = this.site;
    const seguro = site ? site.seguro !== false : true;
    const host = this.host;
    document.querySelector('.nav-conexao')?.remove();
    const fechar = () => painel.remove();
    const painel = h(
      'div',
      { class: `nav-conexao${seguro ? '' : ' inseguro'}`, role: 'dialog', 'data-alvo': 'nav.conexao' },
      h('header', {}, h('strong', { text: host }), h('button', { type: 'button', class: 'nav-conexao-fechar', 'aria-label': 'Fechar', onClick: fechar }, icone('dismiss', { tamanho: 14 }))),
      h(
        'p',
        { class: 'nav-conexao-estado' },
        icone(seguro ? 'lock_closed' : 'warning', { tamanho: 18 }),
        seguro ? 'A conexão é segura' : 'Sua conexão com este site não é segura'
      ),
      h(
        'p',
        { class: 'nav-conexao-texto', text: seguro
          ? 'As informações que você enviar (como senhas) vão protegidas até este site. Mas atenção: o cadeado não garante que o site é quem diz ser. Confira sempre o nome do site no endereço.'
          : 'Não digite informações confidenciais neste site (como senhas ou cartões de crédito), porque elas podem ser roubadas por invasores.' }
      ),
      h('p', { class: 'nav-conexao-dominio' }, 'Nome do site (domínio): ', h('strong', { text: dominioDe(host) })),
      site?.falso && site.alerta ? h('p', { class: 'nav-conexao-alerta', text: site.alerta }) : null
    );
    painel.addEventListener('pointerdown', (e) => e.stopPropagation());
    const sair = (e) => {
      if (!painel.contains(e.target) && e.target !== botao) {
        painel.remove();
        document.removeEventListener('pointerdown', sair, true);
      }
    };
    document.addEventListener('pointerdown', sair, true);
    this.janela.conteudo.append(painel);
    this.emitir({ acao: 'cadeado', seguro, marcos: [`web:cadeado:${host}`, ...(site ? [`web:cadeado:${site.id}`] : [])] });
  }

  // ================= o que os sites usam =================

  contexto(site) {
    const nav = this;
    return {
      nav,
      site,
      mundo: this.mundo,
      sim: this.sim,
      url: this.url,
      host: this.host,
      caminho: caminhoDe(this.url),
      ir: (url, via = 'pagina') => this.navegar(url, { via }),
      emitir: (evento) => this.emitir({ site: site.id, ...evento }),
      redesenhar: () => this.desenharPagina(),
      /** Link de página: mostra o destino embaixo ao passar o mouse e navega ao clicar */
      link: (texto, url, { classe = '', alvo = null } = {}) => {
        const a = h('a', { href: '#', class: `site-link ${classe}`.trim(), 'data-alvo': alvo, text: texto });
        a.addEventListener('pointerenter', () => nav.mostrarStatus(url));
        a.addEventListener('pointerleave', () => (nav.status.hidden = true));
        a.addEventListener('click', (e) => {
          e.preventDefault();
          nav.navegar(url, { via: 'pagina' });
        });
        return a;
      },
      /** O aluno enviou senha/dados num formulário. Num site falso, é um deslize. */
      enviarDados: (oque = 'senha') => {
        if (site.falso) {
          this.mundo.web.senhasEmSitesFalsos.push(this.host);
          this.emitir({ acao: 'senha-digitada', oque, deslize: true, marco: `web:enviou-dados:${site.id}` });
        } else {
          this.emitir({ acao: 'dados-enviados', oque, marco: `web:dados:${site.id}` });
        }
      },
    };
  }

  mostrarStatus(url) {
    this.status.textContent = `https://${normalizarUrl(url)}`;
    this.status.hidden = false;
  }

  abrirArquivo(item) {
    this.navegar(`arquivo/${item.nome}`, { via: 'arquivo' });
  }

  // ================= missão =================

  estado() {
    return { url: this.url, host: this.host, dominio: dominioDe(this.url), site: this.site?.id || null };
  }

  /** O passo pede outro site (passo.site)? Então o elemento visível aqui não serve */
  noLugarDoPasso(passo) {
    return !passo.site || this.host === passo.site;
  }

  /**
   * Mostre-me: o passo é de um site (passo.site = host) e o navegador está
   * em outro? Mostra como chegar: pelo favorito (passo.favorito) ou
   * digitando na barra de endereços.
   */
  prerequisito(passo, guia) {
    const alvo = passo.alvo || '';
    if (passo.site && this.host !== passo.site) {
      if (passo.favorito) return guia.apontar(`nav.fav.${passo.favorito}`, `Clique em "${(this.mundo.web.favoritos || FAVORITOS_PADRAO).find((f) => f.id === passo.favorito)?.nome}" na barra de Favoritos.`);
      return { ...guia.apontar('nav.endereco', `Clique na barra de endereços, digite ${passo.site} e aperte Enter.`), passo: { alvo: 'nav.endereco', valor: passo.site, confirmar: 'enter' } };
    }
    if (alvo.startsWith('site.')) return this.site?.prerequisito?.(passo, guia, this.contexto(this.site)) || null;
    return null;
  }
}

/** Ícone do site na guia e nos favoritos (uma letra colorida, como os sites de verdade) */
export function faviconDe(site) {
  if (!site) return icone('globe', { tamanho: 14 });
  return h('span', { class: 'nav-favicon', style: { background: site.cor || '#5f6b7a' }, text: site.letra || site.titulo[0] });
}
