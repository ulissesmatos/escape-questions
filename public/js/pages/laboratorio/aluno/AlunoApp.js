import { h } from '../../../core/dom.js';
import { SafeStorage } from '../../../core/SafeStorage.js';
import { Toast } from '../../../components/ui.js';
import { Conexao, ErroPedido } from '../Conexao.js';
import { avisoConexao } from '../comum.js';
import { EntradaView } from './EntradaView.js';
import { PartidaView } from './PartidaView.js';

const armazenamento = new SafeStorage('local', 'laboratorio:');

/**
 * Tela do aluno: entrada (código + nome) e partida.
 *
 * Ao entrar, o servidor devolve um token que fica no localStorage. Se a
 * página recarregar ou a internet cair, o app usa esse token para voltar à
 * mesma sala, com os mesmos pontos, sem digitar nada de novo.
 */
export class AlunoApp {
  constructor(raiz) {
    this.raiz = raiz;
    this.area = h('div', { class: 'lab-area' });
  }

  iniciar() {
    this.conexao = new Conexao();
    this.conexao
      .on('connect', () => this.aoConectar())
      .on('estado', (estado) => this.receber(estado))
      .on('expulso', () => this.sair('O professor tirou você da sala. Se foi engano, entre de novo.'))
      .on('sala-fechada', () => this.sair('O professor encerrou a sala. Obrigado por participar! 🎉', 'sucesso'));

    this.raiz.append(avisoConexao(this.conexao), this.area);

    const sessao = armazenamento.ler('sessao');
    if (sessao) this.mostrarCarregando(`Voltando para a sala ${sessao.codigo}...`);
    else this.mostrarEntrada();
  }

  get sessao() {
    return armazenamento.ler('sessao');
  }

  /** A cada (re)conexão, volta para a sala com o token guardado */
  async aoConectar() {
    const sessao = this.sessao;
    if (!sessao) return;
    try {
      const resposta = await this.conexao.pedir('aluno:retomar', { codigo: sessao.codigo, token: sessao.token });
      this.receber(resposta.estado);
    } catch (erro) {
      if (erro instanceof ErroPedido) {
        armazenamento.remover('sessao');
        this.mostrarEntrada({ aviso: erro.message, codigo: sessao.codigo });
      }
      // sem resposta: o Socket.IO continua tentando e chama aoConectar de novo
    }
  }

  mostrarCarregando(texto) {
    this.limpar();
    this.area.replaceChildren(h('p', { class: 'carregando', role: 'status', text: texto }));
  }

  mostrarEntrada({ aviso = '', tipo = 'erro', codigo = '' } = {}) {
    this.limpar();
    const daUrl = new URLSearchParams(location.search).get('sala') || '';
    this.entrada = new EntradaView({
      aviso,
      tipo,
      codigo: codigo || daUrl,
      nome: armazenamento.ler('ultimoNome', ''),
      onEntrar: (dados) => this.entrar(dados),
    });
    this.entrada.montar(this.area);
  }

  async entrar({ codigo, nome }) {
    this.conexao.garantirConectado();
    const resposta = await this.conexao.pedir('aluno:entrar', { codigo, nome });
    armazenamento.salvar('sessao', { codigo: resposta.codigo, token: resposta.token });
    armazenamento.salvar('ultimoNome', nome);
    this.receber(resposta.estado);
  }

  receber(estado) {
    if (!this.sessao || !estado || !estado.eu) return;
    if (!this.partida) {
      this.limpar();
      this.partida = new PartidaView({
        conexao: this.conexao,
        codigo: estado.sala.codigo,
        alunoId: estado.eu.id,
        onErro: (mensagem) => Toast.erro(mensagem),
      });
      this.partida.montar(this.area);
    }
    this.partida.definir(estado);
  }

  sair(mensagem, tipo = 'erro') {
    armazenamento.remover('sessao');
    this.mostrarEntrada({ aviso: mensagem, tipo });
  }

  limpar() {
    if (this.partida) this.partida.destruir();
    if (this.entrada) this.entrada.destruir();
    this.partida = null;
    this.entrada = null;
    this.area.replaceChildren();
  }
}
