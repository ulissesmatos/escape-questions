import { Dialogo } from '../word/sistema/Dialogo.js';
import { Explorador } from '../word/sistema/apps/Explorador.js';
import { BlocoDeNotas } from '../word/sistema/apps/BlocoDeNotas.js';
import { Fotos } from '../word/sistema/apps/Fotos.js';
import { Email } from './apps/Email.js';
import { Navegador } from './apps/Navegador.js';
import { Celular } from './apps/Celular.js';
import { SegurancaWindows, abrirPrograma } from './apps/SegurancaWindows.js';

/**
 * O computador da Operação Anzol: o mesmo Windows da Operação Word, sem o
 * Word e com Email, Edge (com a internet de mentira), Celular e Segurança do
 * Windows. prefixos: os data-alvo de cada programa (o Mostre-me usa para
 * saber qual programa abrir antes de um passo).
 */
export const PERFIL_ANZOL = {
  apps: {
    email: { Classe: Email, nome: 'Email', icone: 'img:mail-48-color', prefixos: ['email.'] },
    edge: { Classe: Navegador, nome: 'Microsoft Edge', icone: 'img:logo-edge', prefixos: ['nav.', 'site.'] },
    celular: { Classe: Celular, nome: 'Celular', icone: 'img:phone-48-color', prefixos: ['cel.'] },
    seguranca: { Classe: SegurancaWindows, nome: 'Segurança do Windows', icone: 'img:shield-checkmark-48-color', prefixos: ['seg.'] },
    explorador: { Classe: Explorador, nome: 'Explorador de Arquivos', icone: 'img:pasta' },
    bloco: { Classe: BlocoDeNotas, nome: 'Bloco de Notas', icone: 'img:logo-bloco-de-notas' },
    fotos: { Classe: Fotos, nome: 'Fotos', icone: 'img:image-48-color' },
  },
  iniciar: [
    { id: 'email', nome: 'Email', icone: 'img:mail-48-color' },
    { id: 'edge', nome: 'Microsoft Edge', icone: 'img:logo-edge' },
    { id: 'celular', nome: 'Celular', icone: 'img:phone-48-color' },
    { id: 'seguranca', nome: 'Segurança do Windows', icone: 'img:shield-checkmark-48-color' },
    { id: 'explorador', nome: 'Explorador de Arquivos', icone: 'img:pasta' },
    { id: 'bloco', nome: 'Bloco de Notas', icone: 'img:logo-bloco-de-notas' },
    { id: 'fotos', nome: 'Fotos', icone: 'img:image-48-color' },
    { id: 'configuracoes', nome: 'Configurações', icone: 'img:settings-24-color' },
  ],
  barra: ['explorador', 'edge', 'email', 'celular'],
  abrirPorTipo: {
    txt: 'bloco',
    imagem: 'fotos',
    pdf: 'edge',
    exe: abrirPrograma,
    docx: (sim) => Dialogo.mensagem(sim, { titulo: 'Windows', texto: 'O Word não está instalado neste computador. (Ele é da Operação Word!)', nome: 'semWord' }),
  },
  semApp: 'Este aplicativo não faz parte do simulador. Use o Email, o Edge, o Celular, a Segurança do Windows ou o Explorador de Arquivos.',
};
