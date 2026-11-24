import { PERFIL_ANZOL } from './perfil.js';
import { Mundo } from './regras/Mundo.js';
import { CAPITULOS, MISSOES, calcularEstrelas, missoesLiberadas, personalizar } from './regras/missoes.js';
import { CONCEITOS, conceito } from './regras/conceitos.js';

const ARQUIVOS_DO_TREINO = MISSOES[3].arquivos;

/**
 * Currículo da Operação Anzol (segurança na internet), no mesmo formato do
 * da Operação Word (word/app/curriculoWord.js): as telas, a Central, o
 * Mostre-me e o detector de "perdido" são os mesmos.
 */
export const CURRICULO_ANZOL = {
  id: 'seguranca',
  api: '/api/seguranca',
  armazenamento: 'anzol',
  nome: 'Operação Anzol',
  subtitulo: 'Defesa contra golpes na internet',
  logo: 'img:anzol',
  avatar: 'img:agente',
  manual: 'Guia de Defesa',
  entrada: {
    olho: 'CENTRAL DE DEFESA DIGITAL • ACESSO DE AGENTE',
    titulo: ['OPERAÇÃO', 'ANZOL'],
    texto: 'O Capitão Anzol e a sua quadrilha "pescam" senhas e dados com mensagens falsas. A Central precisa de agentes que não mordem a isca. Você topa?',
    aviso: 'Já tem um @ da Operação Word? É o mesmo: entre com ele.',
  },
  treino: {
    historia: 'Este computador é todo seu para explorar: abra o Email, o Edge (tem sites de mentira, alguns falsos!), o Celular e a Segurança do Windows. Nada aqui vale estrelas.',
    fala: 'Treino livre: explore à vontade. Que tal procurar as pistas dos golpes nos e-mails da Caixa de Entrada?',
    arquivos: ARQUIVOS_DO_TREINO,
  },
  perfil: PERFIL_ANZOL,
  eventosDeAcao: ['email', 'web', 'celular', 'seguranca'],
  CAPITULOS,
  MISSOES,
  CONCEITOS,
  conceito,
  calcularEstrelas,
  missoesLiberadas,
  personalizar,

  /** O mundo da missão (no treino livre: os e-mails e o celular da missão 4, para explorar) */
  criarMundo(missao, contexto) {
    const dados = (missao || MISSOES[3]).mundo?.(contexto) || {};
    return new Mundo(dados, contexto);
  },

  /** O que vai para o professor ver: os deslizes de segurança da última vez */
  entrega(tela) {
    return JSON.stringify({ deslizes: tela.deslizes });
  },

  /** Recados da Central para os deslizes, valem em todas as missões */
  diagnosticoGeral(ev) {
    if (ev.tipo === 'web' && ev.acao === 'senha-digitada') {
      return `PARE! Você digitou ${ev.oque === 'senha' ? 'uma senha' : 'seus dados'} num site FALSO (o nome do site é ${ev.dominio}). Na vida real, o golpista já teria tudo. Feche a guia e, se fosse de verdade, troque a senha na hora.`;
    }
    if (ev.tipo === 'email' && ev.acao === 'clicar-link' && ev.falso) {
      return 'Opa! Você clicou num link de golpe. Aqui é simulação, mas na vida real esse clique já pode instalar vírus ou te levar a um site falso. Não digite nada: feche a guia.';
    }
    if (ev.tipo === 'email' && ev.acao === 'responder' && ev.phishing) {
      return 'Nunca responda a um e-mail de golpe: responder avisa o golpista que o seu e-mail existe e que alguém lê. Denuncie com Relatar › Relatar phishing.';
    }
    if (ev.tipo === 'email' && ev.acao === 'denunciar' && !ev.phishing) {
      return 'Esse e-mail era verdadeiro! Para desfazer: abra o Lixo Eletrônico, clique nele e depois em "Não é lixo eletrônico".';
    }
    if ((ev.tipo === 'celular' || ev.tipo === 'web') && ev.acao === 'responder' && ev.alerta) return ev.alerta;
    if (ev.tipo === 'celular' && ev.acao === 'clicar-link' && ev.falso) {
      return 'Cuidado! Link de SMS de número desconhecido é a isca preferida dos golpistas. Não digite nada no site: feche a guia.';
    }
    if (ev.tipo === 'web' && ev.acao === 'clicar-anuncio') {
      return 'Caiu na armadilha do anúncio! O X grande fazia parte da imagem. Não digite nada no site que abriu: volte e feche pelo "Fechar anúncio" do cantinho.';
    }
    if (ev.tipo === 'seguranca' && ev.acao === 'executar') {
      return 'Você executou o programa disfarçado e o computador foi infectado! Na vida real, isso pode roubar senhas ou travar seus arquivos. Rode já a Verificação rápida na Segurança do Windows.';
    }
    if (ev.tipo === 'seguranca' && ev.acao === 'nao-executar') {
      return 'Boa! "Não executar" era a escolha certa. Esse arquivo é um programa disfarçado de PDF.';
    }
    if (ev.tipo === 'web' && ev.acao === 'pedido' && ev.deslize) {
      return 'Você aceitou alguém que não conhece de verdade. Em Amigos, clique em "Desfazer amizade" para corrigir.';
    }
    if (ev.tipo === 'web' && ev.acao === 'visitar' && ev.falso && ev.via === 'digitado') {
      return `Atenção: este site é falso (o nome é ${ev.dominio}). Confira o endereço oficial e não digite nada aqui.`;
    }
    return null;
  },
};
