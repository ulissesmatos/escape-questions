import { avaliarSenha } from './senha.js';

/**
 * O "mundo" de uma missão da Operação Anzol: tudo o que não é arquivo do
 * computador e que os programas novos mostram — os e-mails, o celular, a
 * conta de e-mail do aluno, a rede social e o que aconteceu na internet.
 *
 * Os programas mudam o mundo e chamam mudou(): quem está ouvindo (os
 * próprios programas) se redesenha. Os objetivos leem o mundo direto
 * (estado.mundo), sem precisar de eventos.
 *
 * Tudo é de mentira e fica só na memória: nenhuma senha digitada aqui vai
 * para o servidor.
 */
const CONTA_PADRAO = {
  senha: '123456',
  senhaTrocada: false,
  duasEtapas: false,
  codigo: null, // código de 6 números enviado ao celular para ativar as duas etapas
  sessoes: [{ id: 'este', dispositivo: 'Este computador (Windows)', local: 'São Paulo, Brasil', quando: 'Agora', atual: true }],
};

const CONECTA_PADRAO = {
  perfil: { nome: '', usuario: '', bio: '', foto: null },
  privacidade: { privado: false, localizacao: true, mensagensDeQualquerUm: true },
  amigos: [],
  pedidos: [],
  conversas: [],
  bloqueados: [],
  denunciados: [],
};

const clonar = (valor) => JSON.parse(JSON.stringify(valor ?? null));

export class Mundo {
  /**
   * dados: { conta, emails, celular: { conversas, contatos }, web, conecta, pixel }
   * contexto: { arroba, nome }
   */
  constructor(dados = {}, contexto = {}) {
    const d = clonar(dados) || {};
    this.contexto = contexto;
    this.conta = { email: `${contexto.arroba || 'agente'}@postal.com.br`, ...clonar(CONTA_PADRAO), ...d.conta };
    this.emails = (d.emails || []).map((e) => ({ pasta: 'entrada', lido: false, denunciado: false, bloqueado: false, anexos: [], ...e }));
    this.celular = {
      conversas: (d.celular?.conversas || []).map((c) => ({ bloqueado: false, denunciado: false, excluida: false, lida: false, respondidas: [], ...c })),
      contatos: d.celular?.contatos || [],
      ligacoes: [],
    };
    this.web = { historico: [], senhasEmSitesFalsos: [], anunciosDenunciados: [], favoritos: d.web?.favoritos || null, ...d.web };
    this.conecta = { ...clonar(CONECTA_PADRAO), ...d.conecta, privacidade: { ...CONECTA_PADRAO.privacidade, ...d.conecta?.privacidade } };
    this.pixel = { anuncio: true, ...d.pixel };
    this.infectado = false;
    this.ouvintes = new Set();
  }

  aoMudar(fn) {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }

  mudou() {
    for (const fn of this.ouvintes) fn();
  }

  // ---------------- e-mail ----------------

  email(id) {
    return this.emails.find((e) => e.id === id) || null;
  }

  emailsDaPasta(pasta) {
    return this.emails.filter((e) => e.pasta === pasta);
  }

  // ---------------- celular ----------------

  conversa(id) {
    return this.celular.conversas.find((c) => c.id === id) || null;
  }

  /** Nova mensagem chegando (a história da missão manda) */
  receberMensagem(idConversa, mensagem, dadosDaConversa = {}) {
    let conversa = this.conversa(idConversa);
    if (!conversa) {
      conversa = { id: idConversa, bloqueado: false, denunciado: false, excluida: false, lida: false, respondidas: [], mensagens: [], ...dadosDaConversa };
      this.celular.conversas.unshift(conversa);
    }
    conversa.mensagens.push({ de: 'ele', hora: horaAgora(), ...mensagem });
    conversa.lida = false;
    conversa.excluida = false;
    this.celular.conversas = [conversa, ...this.celular.conversas.filter((c) => c !== conversa)];
    this.mudou();
    return conversa;
  }

  // ---------------- conta de e-mail (Postal) ----------------

  /** Avalia uma senha com o nome e o @ do aluno */
  avaliar(senha) {
    return avaliarSenha(senha, this.contexto);
  }

  get senhaForte() {
    return this.avaliar(this.conta.senha).forte;
  }

  /** Gera o código das duas etapas e manda por SMS ao celular */
  enviarCodigo() {
    this.conta.codigo = String(100000 + Math.floor(Math.random() * 900000));
    this.receberMensagem(
      'postal-codigo',
      { texto: `Postal: seu código de verificação é ${this.conta.codigo}. Não compartilhe este código com ninguém, nem com quem diz ser da Postal.` },
      { nome: 'Postal', numero: '28 800', conhecido: true, oficial: true }
    );
    return this.conta.codigo;
  }

  // ---------------- rede social ----------------

  pedido(id) {
    return this.conecta.pedidos.find((p) => p.id === id) || null;
  }

  conversaConecta(id) {
    return this.conecta.conversas.find((c) => c.id === id) || null;
  }
}

export function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
