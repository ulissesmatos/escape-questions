import { SiteHeader } from '../../components/SiteHeader.js';
import { FASES } from './regras/fases.js';
import { Progresso } from './jogo/Progresso.js';
import { TelaFase } from './jogo/TelaFase.js';
import { TelaMapa } from './jogo/TelaMapa.js';

SiteHeader.montarNaPagina();

/**
 * Troca entre o mapa de fases e a tela de uma fase pelo endereço
 * (#fase-2-3), assim o botão Voltar do navegador também funciona.
 * ?tudo libera todas as fases (para o professor conhecer o jogo).
 */
class JogoHorta {
  constructor(alvo) {
    this.alvo = alvo;
    const parametros = new URLSearchParams(location.search);
    this.progresso = new Progresso({ liberarTudo: parametros.has('tudo') });
    this.tela = null;
    window.addEventListener('hashchange', () => this.abrir());
    if (!location.hash && this.progresso.total() === 0) history.replaceState(null, '', `#fase-${FASES[0].id}`);
    this.abrir();
  }

  abrir() {
    if (this.tela) this.tela.destruir();
    const id = location.hash.startsWith('#fase-') ? location.hash.slice(6) : null;
    const indice = FASES.findIndex((f) => f.id === id);
    if (indice >= 0 && this.progresso.liberada(indice)) {
      this.tela = new TelaFase({
        alvo: this.alvo,
        indice,
        progresso: this.progresso,
        aoVoltar: () => (location.hash = 'fases'),
        aoAbrirFase: (i) => (location.hash = `fase-${FASES[i].id}`),
      });
    } else {
      this.tela = new TelaMapa({
        alvo: this.alvo,
        progresso: this.progresso,
        aoAbrirFase: (i) => (location.hash = `fase-${FASES[i].id}`),
      });
    }
    this.tela.montar();
    window.scrollTo(0, 0);
  }
}

const jogo = new JogoHorta(document.getElementById('horta'));
// ?teste expõe o jogo para testes automatizados de navegador
if (new URLSearchParams(location.search).has('teste')) window.jogoHorta = jogo;
