import { PERFIL_WORD } from '../sistema/Simulador.js';
import { CAPITULOS, MISSOES, calcularEstrelas, missoesLiberadas, personalizar } from '../regras/missoes.js';
import { CONCEITOS, conceito } from '../regras/conceitos.js';

/**
 * Currículo de uma atividade de missões no computador simulado: os textos
 * das telas, os capítulos e missões, os conceitos do manual, o perfil do
 * computador (programas) e a API onde fica o progresso.
 *
 * As telas (app/) e a ajuda (ajuda/) recebem o currículo, então outra
 * atividade (ex.: a Operação Anzol, de segurança na internet) reaproveita
 * tudo trocando só este objeto.
 */
export const CURRICULO_WORD = {
  id: 'word',
  api: '/api/word',
  armazenamento: '', // progresso no navegador sem prefixo (compatível com o que já estava salvo)
  nome: 'Operação Word',
  subtitulo: 'Central de treinamento',
  logo: 'img:logo-word',
  avatar: 'img:agente',
  manual: 'Manual do Agente',
  entrada: {
    olho: 'COMANDO CENTRAL • ACESSO DE AGENTE',
    titulo: ['OPERAÇÃO', 'WORD'],
    texto: 'O Dr. Kaos quer acabar com todos os documentos do mundo. A Central precisa de agentes que dominem o Word. Você topa?',
  },
  treino: {
    historia: 'Este computador é todo seu para treinar. Abra o Word pelo menu Iniciar e teste os botões, os menus e os atalhos. Nada aqui vale estrelas.',
    fala: 'Treino livre: aqui não tem objetivos. Que tal experimentar o =rand() no Word? Digite =rand() e aperte Enter.',
    arquivos: MISSOES[0].arquivos,
  },
  perfil: PERFIL_WORD,
  CAPITULOS,
  MISSOES,
  CONCEITOS,
  conceito,
  calcularEstrelas,
  missoesLiberadas,
  personalizar,
};
