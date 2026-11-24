/**
 * O que o aluno aprende na Operação Anzol. Aparece no briefing de cada
 * missão, no botão "Como faz" da Central e no Guia de Defesa (o manual).
 *
 * icone: nome de um ícone Fluent (word/sistema/iconesFluent.js) ou
 * "img:arquivo" (public/images/word/icones/arquivo.svg).
 */
export const CONCEITOS = {
  // ---------- contas e senhas ----------
  remetente: {
    titulo: 'Quem mandou de verdade',
    icone: 'mail',
    onde: 'No e-mail, clique no nome de quem enviou',
    texto: 'O nome que aparece qualquer um pode escrever. O que vale é o endereço: confira letra por letra o que vem depois do @.',
  },
  'senha-forte': {
    titulo: 'Senha forte',
    icone: 'key',
    onde: 'Minha Conta › Senha',
    texto: 'Pelo menos 12 caracteres, misturando letras maiúsculas, minúsculas, números e símbolos. Nada de nome, data de aniversário ou 123456. Uma senha diferente para cada site.',
  },
  'frase-senha': {
    titulo: 'Frase-senha',
    icone: 'text_quote',
    onde: 'Ao criar uma senha',
    texto: 'Junte 3 ou 4 palavras que não têm nada a ver uma com a outra (Gato-Azul-Pula-Nuvem7). É longa, difícil de adivinhar e fácil de lembrar.',
  },
  'duas-etapas': {
    titulo: 'Verificação em duas etapas',
    icone: 'phone',
    onde: 'Minha Conta › Verificação em duas etapas',
    texto: 'Além da senha, o site pede um código que chega no seu celular. Mesmo que roubem sua senha, sem o código ninguém entra.',
  },
  'codigo-secreto': {
    titulo: 'Código é segredo',
    icone: 'lock_closed',
    onde: 'SMS com código de verificação',
    texto: 'Nenhuma empresa pede o código que chegou no seu celular. Quem pede o código está tentando entrar na sua conta: não passe para ninguém.',
  },
  // ---------- phishing ----------
  phishing: {
    titulo: 'Phishing (pescaria)',
    icone: 'img:warning-48-color',
    onde: 'E-mails, mensagens e sites',
    texto: 'Golpe que "pesca" senhas e dados com uma isca: prêmio, ameaça de bloqueio ou urgência. Phishing vem de fishing, pescar em inglês.',
  },
  'denunciar-phishing': {
    titulo: 'Denunciar phishing',
    icone: 'flag',
    onde: 'Email › Relatar › Relatar phishing',
    texto: 'Tira o golpe da sua Caixa de Entrada e avisa o serviço de e-mail, que passa a bloquear o golpista para todo mundo. Se errar, o Lixo Eletrônico tem "Não é lixo eletrônico".',
  },
  'link-disfarcado': {
    titulo: 'Link disfarçado',
    icone: 'link',
    onde: 'Pare o mouse em cima do link, sem clicar',
    texto: 'O texto azul do link pode mentir. Parando o mouse em cima, aparece embaixo o endereço para onde ele leva de verdade.',
  },
  'digitar-endereco': {
    titulo: 'Vá você mesmo ao site',
    icone: 'globe',
    onde: 'Barra de endereços do navegador ou Favoritos',
    texto: 'Recebeu uma mensagem sobre a sua conta, um prêmio ou uma cobrança? Não clique no link: digite o endereço oficial você mesmo, ou use os Favoritos.',
  },
  dominio: {
    titulo: 'O nome verdadeiro do site',
    icone: 'globe',
    onde: 'Barra de endereços',
    texto: 'O nome verdadeiro é o que vem logo antes do .com ou .com.br. Em "banco.atualiza-cadastro.com", o site é atualiza-cadastro.com: "banco" no começo é só disfarce.',
  },
  cadeado: {
    titulo: 'Cadeado e "Não seguro"',
    icone: 'lock_closed',
    onde: 'Ao lado do endereço, no navegador',
    texto: '"Não seguro" quer dizer que o que você digitar pode ser roubado no caminho: nunca digite senha. Mas o cadeado sozinho não prova que o site é verdadeiro: confira também o nome.',
  },
  'anexo-perigoso': {
    titulo: 'Anexo perigoso',
    icone: 'attach',
    onde: 'Explorador › coluna Tipo',
    texto: 'Golpistas disfarçam programas de PDF ou foto ("boleto.pdf" com ícone de PDF). Se o Tipo for "Aplicativo", não abra: é um programa que pode instalar vírus.',
  },
  antivirus: {
    titulo: 'Antivírus',
    icone: 'shield_checkmark',
    onde: 'Iniciar › Segurança do Windows › Proteção contra vírus e ameaças',
    texto: 'A Verificação rápida procura programas perigosos; "Iniciar ações" remove o que encontrar. O SmartScreen avisa antes de abrir um programa desconhecido: escolha "Não executar".',
  },
  // ---------- celular ----------
  smishing: {
    titulo: 'Golpe por SMS',
    icone: 'chat_warning',
    onde: 'Celular › Mensagens',
    texto: 'Mensagem de número desconhecido com link e pressa ("pague hoje", "sua encomenda foi retida") é golpe. Confira no site oficial, digitando o endereço.',
  },
  'bloquear-denunciar': {
    titulo: 'Bloquear e denunciar',
    icone: 'prohibited',
    onde: 'Na conversa › ⋮ › Bloquear e denunciar',
    texto: 'Bloquear impede que o golpista mande mais mensagens. Denunciar ajuda a derrubar o número para todo mundo.',
  },
  'confirmar-pessoa': {
    titulo: 'Confirme por outro caminho',
    icone: 'call',
    onde: 'Celular › Contatos',
    texto: 'Alguém diz que "trocou de número" e pede dinheiro? Ligue para o número antigo, que já está nos seus Contatos, ou pergunte algo que só a pessoa saberia.',
  },
  'premio-falso': {
    titulo: 'Prêmio bom demais',
    icone: 'img:gift-24-color',
    onde: 'Anúncios e pop-ups',
    texto: 'Gemas, moedas ou skins de graça em troca da sua senha é golpe para roubar a conta. O jogo de verdade nunca pede a senha fora da tela de login oficial.',
  },
  'anuncio-enganoso': {
    titulo: 'Anúncio enganoso',
    icone: 'warning',
    onde: 'O ⓘ ou "Fechar anúncio", no cantinho do anúncio',
    texto: 'O X grande no meio do anúncio pode ser parte da imagem e abrir o golpe. Feche pelo "Fechar anúncio" pequeno do canto e use o ⓘ para denunciar.',
  },
  // ---------- redes sociais ----------
  'dados-pessoais': {
    titulo: 'Dados pessoais',
    icone: 'person',
    onde: 'Rede social › Editar perfil',
    texto: 'Endereço, telefone, escola e turma ajudam um estranho a saber onde você está. Fale do que você gosta, não de onde você está.',
  },
  'conta-privada': {
    titulo: 'Conta privada',
    icone: 'lock_closed',
    onde: 'Rede social › Privacidade',
    texto: 'Só quem você aceitou vê suas fotos e publicações. E desligue a localização: ela mostra onde você mora e estuda.',
  },
  'pedido-de-amizade': {
    titulo: 'Pedidos de amizade',
    icone: 'person_add',
    onde: 'Rede social › Amigos',
    texto: 'Aceite só quem você conhece pessoalmente. Desconfie de perfil novo, sem amigos em comum ou que copia o nome de alguém que já é seu amigo.',
  },
  'adulto-de-confianca': {
    titulo: 'Conte para um adulto',
    icone: 'people',
    onde: 'Sempre que algo te deixar desconfortável',
    texto: 'Se um estranho pedir fotos, endereço, escola ou segredo, bloqueie e conte para um adulto de confiança (família, professor). Você não fez nada de errado.',
  },
  // ---------- conta invadida ----------
  'aparelhos-conectados': {
    titulo: 'Aparelhos conectados',
    icone: 'desktop',
    onde: 'Minha Conta › Aparelhos conectados',
    texto: 'Mostra onde a sua conta está aberta. Aparelho que você não reconhece? Clique em Sair dele, troque a senha e ative as duas etapas.',
  },
};

export function conceito(id) {
  const c = CONCEITOS[id];
  if (!c) throw new Error(`Conceito desconhecido: ${id}`);
  return { id, atalho: '', ...c };
}
