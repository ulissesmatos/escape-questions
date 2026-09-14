import { h } from '../core/dom.js';
import { HashRouter } from '../core/HashRouter.js';
import { AdminSession } from './AdminSession.js';
import { LoginView } from './LoginView.js';
import { DashboardSection } from './sections/DashboardSection.js';
import { EscapeSection } from './sections/EscapeSection.js';
import { HardwareSection } from './sections/hardware/HardwareSection.js';
import { PcSection } from './sections/PcSection.js';

const SECOES = [DashboardSection, EscapeSection, HardwareSection, PcSection];

/** Painel do professor: login → menu lateral + seção atual (rota por hash). */
export class AdminApp {
  constructor(raiz) {
    this.raiz = raiz;
    this.sessao = new AdminSession({ aoExpirar: () => this.mostrarLogin('Sua sessão expirou. Entre novamente.') });
    this.router = new HashRouter({ padrao: '/painel/resumo', aoMudar: (partes) => this.navegar(partes) });
  }

  iniciar() {
    if (this.sessao.ativa) this.mostrarPainel();
    else this.mostrarLogin();
  }

  limpar() {
    this.router.parar();
    if (this.secao) this.secao.destruir();
    if (this.login) this.login.destruir();
    this.secao = null;
    this.login = null;
    this.raiz.replaceChildren();
  }

  mostrarLogin(aviso = '') {
    this.limpar();
    document.title = 'Entrar — Área do professor';
    this.login = new LoginView({ sessao: this.sessao, aviso, onEntrar: () => this.mostrarPainel() });
    this.login.montar(this.raiz);
  }

  mostrarPainel() {
    this.limpar();

    this.itensMenu = new Map();
    const menu = h(
      'nav',
      { class: 'menu-admin', 'aria-label': 'Seções' },
      SECOES.map((Secao) => {
        const contador = h('span', { class: 'menu-contador', hidden: true });
        const item = h(
          'a',
          { href: `#/${Secao.id}`, class: 'menu-item', onClick: () => this.fecharMenuMovel() },
          h('span', { class: 'menu-icone', 'aria-hidden': 'true', text: Secao.icone }),
          h('span', { class: 'menu-texto', text: Secao.titulo }),
          contador
        );
        this.itensMenu.set(Secao.id, { item, contador });
        return item;
      })
    );

    this.lateral = h(
      'aside',
      { class: 'lateral-admin' },
      h('div', { class: 'marca-admin' }, h('span', { class: 'site-nav-logo', 'aria-hidden': 'true', text: '🎓' }), h('div', {}, h('strong', { text: 'Área do professor' }), h('span', { text: 'Atividades da Turma' }))),
      menu,
      h(
        'div',
        { class: 'lateral-rodape' },
        h('a', { href: 'index.html', target: '_blank', rel: 'noopener', class: 'menu-item menu-item-suave' }, h('span', { class: 'menu-icone', text: '↗' }), 'Ver site dos alunos'),
        h('button', { type: 'button', class: 'menu-item menu-item-suave', onClick: () => this.sair() }, h('span', { class: 'menu-icone', text: '⎋' }), 'Sair')
      )
    );

    this.areaSecao = h('div', { class: 'principal-admin' });
    const topoMovel = h(
      'header',
      { class: 'topo-movel' },
      h('button', { type: 'button', class: 'btn-menu', 'aria-label': 'Abrir menu', text: '☰', onClick: () => this.alternarMenuMovel() }),
      h('strong', { text: 'Área do professor' })
    );
    this.fundoMenu = h('div', { class: 'fundo-menu', hidden: true, onClick: () => this.fecharMenuMovel() });

    this.raiz.append(h('div', { class: 'app-admin' }, topoMovel, this.lateral, this.fundoMenu, this.areaSecao));
    this.router.iniciar();
    this.atualizarContadores();
  }

  navegar([idSecao, idAba]) {
    const Secao = SECOES.find((S) => S.id === idSecao);
    if (!Secao) {
      this.router.ir('/painel/resumo', { substituir: true });
      return;
    }

    if (!this.secao || this.secao.constructor !== Secao) {
      if (this.secao) this.secao.destruir();
      this.secao = new Secao({ api: this.sessao.api, router: this.router });
      this.areaSecao.replaceChildren(this.secao.montar());
      window.scrollTo({ top: 0 });
    }
    this.secao.mostrarAba(idAba);
    document.title = `${Secao.titulo} — Área do professor`;

    for (const [id, { item }] of this.itensMenu) {
      item.classList.toggle('ativo', id === idSecao);
      item.toggleAttribute('aria-current', id === idSecao);
    }
  }

  async atualizarContadores() {
    try {
      const resumo = await this.sessao.api.get('/resumo');
      const { contador } = this.itensMenu.get('pc');
      contador.hidden = !resumo.pc.pendentes;
      contador.textContent = String(resumo.pc.pendentes);
      contador.title = 'Propostas aguardando revisão';
    } catch {
      // contador é só um extra
    }
  }

  alternarMenuMovel() {
    const aberto = this.lateral.classList.toggle('aberta');
    this.fundoMenu.hidden = !aberto;
  }

  fecharMenuMovel() {
    this.lateral.classList.remove('aberta');
    this.fundoMenu.hidden = true;
  }

  sair() {
    this.sessao.sair();
    history.replaceState(null, '', location.pathname);
    this.mostrarLogin();
  }
}
