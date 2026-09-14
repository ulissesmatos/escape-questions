export class ApiError extends Error {
  constructor(status, mensagem, dados = {}) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }

  get semConexao() {
    return this.status === 0;
  }
}

/**
 * Cliente HTTP para a API JSON. Centraliza cabeçalhos, token de sessão e
 * mensagens de erro amigáveis.
 */
export class ApiClient {
  constructor({ base = '/api', obterToken = () => null, aoNaoAutorizado = null } = {}) {
    this.base = base;
    this.obterToken = obterToken;
    this.aoNaoAutorizado = aoNaoAutorizado;
  }

  async requisitar(metodo, caminho, corpo) {
    const token = this.obterToken();
    let resposta;
    try {
      resposta = await fetch(this.base + caminho, {
        method: metodo,
        headers: {
          ...(corpo !== undefined && { 'Content-Type': 'application/json' }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      });
    } catch {
      throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet e tente de novo.');
    }

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      if (resposta.status === 401 && this.aoNaoAutorizado) this.aoNaoAutorizado(dados);
      throw new ApiError(resposta.status, dados.erro || 'Algo deu errado. Tente de novo.', dados);
    }
    return dados;
  }

  get(caminho, parametros) {
    const query = parametros ? `?${new URLSearchParams(Object.entries(parametros).filter(([, v]) => v !== '' && v != null))}` : '';
    return this.requisitar('GET', caminho + (query === '?' ? '' : query));
  }

  post(caminho, corpo = {}) {
    return this.requisitar('POST', caminho, corpo);
  }

  put(caminho, corpo = {}) {
    return this.requisitar('PUT', caminho, corpo);
  }

  patch(caminho, corpo = {}) {
    return this.requisitar('PATCH', caminho, corpo);
  }

  delete(caminho) {
    return this.requisitar('DELETE', caminho);
  }
}

export const api = new ApiClient();
