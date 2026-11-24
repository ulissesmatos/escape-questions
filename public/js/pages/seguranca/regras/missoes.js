/**
 * As missões da Operação Anzol (segurança na internet), em 5 capítulos.
 *
 * A história: o Capitão Anzol e a sua quadrilha "pescam" senhas e dados
 * com iscas (phishing vem de fishing, pescar). A Central treina o aluno
 * para reconhecer as iscas e se proteger, sempre fazendo na mão: abrir o
 * e-mail, conferir o endereço, denunciar, trocar a senha, bloquear.
 *
 * Cada missão define, além do que a Operação Word já usa (ver
 * word/regras/missoes.js):
 * - mundo(contexto): os e-mails, as conversas do celular, a conta e os
 *   sites daquela missão (regras/Mundo.js);
 * - roteiro: acontecimentos da história; passo.executar(tela) roda quando o
 *   objetivo passo.quando.objetivo é cumprido.
 *
 * Todos os nomes de empresas, sites e pessoas são inventados.
 * O id guarda o progresso no servidor: não mude o id de uma missão publicada.
 */
import * as o from './objetivos.js';
import { notificar } from '../apps/notificacao.js';

const img = (arquivo) => `/images/word/arquivos/${arquivo}`;

// Arquivos de todo computador da missão (o Explorador não fica vazio)
const ARQUIVOS_BASE = [
  { pasta: 'Imagens', nome: 'Satélite', tipo: 'imagem', conteudo: { src: img('satelite.svg'), larguraPx: 640, alturaPx: 420 } },
  { pasta: 'Imagens', nome: 'Base secreta', tipo: 'imagem', conteudo: { src: img('base.svg'), larguraPx: 640, alturaPx: 400 } },
  { pasta: 'Documentos', nome: 'Lista de compras', tipo: 'txt', conteudo: { texto: 'Pão\nLeite\nPilhas para a lanterna' } },
];

// ---------------- e-mails que aparecem em várias missões ----------------

const CENTRAL = { nome: 'Central', endereco: 'central@postal.com.br' };

const EMAIL_ESCOLA = {
  id: 'escola',
  de: { nome: 'Escola Horizonte', endereco: 'secretaria@horizonte.edu.br' },
  assunto: 'Reunião de pais na sexta-feira',
  data: 'Ontem',
  lido: true,
  corpo: ['Olá, família!', 'Lembramos que a reunião de pais será na sexta-feira, às 19h, na quadra da escola.', 'Atenciosamente, Secretaria da Escola Horizonte.'],
};

const EMAIL_TIA = {
  id: 'tia',
  de: { nome: 'Tia Cida', endereco: 'cida.souza@postal.com.br' },
  assunto: 'Fotos do aniversário 🎂',
  data: 'Seg',
  lido: true,
  corpo: ['Oi, querido(a)! Que festa linda! Depois te mostro as fotos pessoalmente.', 'Beijos da tia Cida.'],
};

const CONTATOS = [
  { id: 'mae', nome: 'Mãe', numero: '(11) 99876-1010', cor: '#c239b3', aoLigar: ['Oi, filho(a)! Tudo bem? Estou no trabalho, depois a gente conversa.'] },
  { id: 'tia-cida', nome: 'Tia Cida', numero: '(11) 98123-4567', cor: '#ca5010', aoLigar: ['Alô? Oi, meu amor!', 'Trocar de número? Eu não troquei nada, esse aqui é o meu número de sempre!', 'E eu não pedi Pix nenhum! Isso é golpe. Bloqueia esse número e avisa a família, tá?'] },
  { id: 'lucas', nome: 'Lucas (7º B)', numero: '(11) 97777-2222', cor: '#0f6cbd', aoLigar: ['E aí! Bora jogar mais tarde?'] },
];

export const CAPITULOS = [
  { numero: 1, titulo: 'Conta blindada', descricao: 'Endereço de quem envia, senha forte e duas etapas', icone: 'img:lock-shield-48-color' },
  { numero: 2, titulo: 'Caça ao phishing', descricao: 'E-mails falsos, links disfarçados, sites e anexos perigosos', icone: 'img:mail-alert-32-color' },
  { numero: 3, titulo: 'Golpes no celular', descricao: 'SMS falso, parente que "trocou de número" e prêmios', icone: 'img:phone-48-color' },
  { numero: 4, titulo: 'Privacidade', descricao: 'Perfil seguro e pedidos de amizade na rede social', icone: 'img:people-community-48-color' },
  { numero: 5, titulo: 'Missão final', descricao: 'Conta invadida: recupere tudo sozinho', icone: 'img:trofeu' },
];

export const MISSOES = [
  // ======================= Capítulo 1: Conta blindada =======================
  {
    id: 'primeiro-acesso',
    capitulo: 1,
    titulo: 'Primeiro acesso',
    tutorial: true,
    historia: 'Bem-vindo à Central, agente @{arroba}! O Capitão Anzol e a sua quadrilha "pescam" senhas e dados das pessoas com mensagens falsas. A primeira habilidade de um agente é descobrir quem mandou uma mensagem DE VERDADE. Siga a luz!',
    conceitos: ['remetente', 'phishing'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      emails: [
        {
          id: 'boas-vindas',
          de: CENTRAL,
          assunto: 'Bem-vindo à Central, agente!',
          data: '09:41',
          corpo: [
            'Olá, agente!',
            'A partir de hoje você vai treinar para proteger pessoas dos golpes da internet.',
            'Regra número 1: o nome que aparece no e-mail qualquer um pode escrever. Clique no nome de quem enviou e confira o endereço de verdade, letra por letra.',
            'Boa sorte! — Central',
          ],
        },
        EMAIL_ESCOLA,
      ],
    }),
    objetivos: () => [
      o.abrirPrograma('email', { nome: 'Email', viaIniciar: true, texto: 'Abra o Email pelo menu Iniciar' }),
      o.abrirEmail('boas-vindas', 'Bem-vindo à Central, agente!'),
      o.verRemetente('boas-vindas', 'Bem-vindo à Central, agente!'),
      o.escolher('endereco-central', 'Qual é o endereço de quem enviou?', ['central@postal.com.br', 'centra1@postal.com.br', 'central@posta1.com'], 'central@postal.com.br', {
        conceito: 'remetente',
        dica: 'O endereço apareceu entre < > quando você clicou no nome. Compare letra por letra: golpistas trocam l por 1 e o por 0.',
        caminho: [o.passo('email.remetente', 'O endereço está aqui, entre < >. Compare com as opções da Central.', { email: 'boas-vindas' })],
        explicacao: 'Isso! Golpistas usam endereços quase iguais, trocando "l" por "1" ou "o" por "0". Por isso se confere letra por letra.',
        errou: () => 'Olhe de novo, letra por letra: tem opção com o número 1 no lugar da letra l. Essa é a pegadinha dos golpistas!',
      }),
    ],
    conclusao: 'Primeira lição aprendida: o nome de quem envia pode ser qualquer coisa. O endereço de verdade aparece quando você clica no nome, e precisa ser conferido letra por letra.',
  },
  {
    id: 'senha-forte',
    capitulo: 1,
    titulo: 'Senha forte',
    historia: 'Alerta! A senha da sua conta de e-mail é 123456, a senha mais usada do mundo. É a primeira que o Capitão Anzol tenta. Troque já por uma senha forte (invente uma só para o jogo: nunca use uma senha de verdade aqui).',
    conceitos: ['senha-forte', 'frase-senha'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      emails: [
        {
          id: 'troque-senha',
          de: CENTRAL,
          assunto: 'URGENTE: troque sua senha 123456',
          data: '10:02',
          corpo: [
            'Agente, sua senha atual é 123456. Ela aparece em todas as listas de senhas vazadas.',
            'Entre em [[conta]] (é o site oficial da Postal) e troque por uma senha forte.',
            'Dica: 3 ou 4 palavras sem relação, com um número e um símbolo, viram uma senha forte e fácil de lembrar.',
          ],
          links: { conta: { texto: 'conta.postal.com.br', url: 'conta.postal.com.br' } },
        },
        EMAIL_ESCOLA,
        EMAIL_TIA,
      ],
    }),
    objetivos: () => [
      o.visitarSite('conta.postal.com.br', 'conta', 'Minha Conta', { texto: 'Abra a página Minha Conta da Postal (link no e-mail da Central ou Favoritos do Edge)', conceito: 'digitar-endereco' }),
      o.escolher('senha-mais-forte', 'Qual destas senhas é a mais forte?', ['Maria2012', 'futebol123', 'Gato-Azul-Pula-Nuvem7'], 'Gato-Azul-Pula-Nuvem7', {
        conceito: 'frase-senha',
        dica: 'Senha forte é longa e mistura tipos de caractere. Nome + ano e palavra + 123 são as primeiras que um golpista tenta.',
        explicacao: 'Isso! Uma frase-senha (palavras sem relação + número + símbolo) é longa, difícil de adivinhar e fácil de lembrar.',
        errou: (v) => (v === 'Maria2012' ? 'Nome e ano de nascimento são fáceis de descobrir nas redes sociais. Tente outra.' : 'Palavra + 123 é das primeiras que os programas de roubar senha testam. Tente outra.'),
      }),
      o.trocarSenha(),
    ],
    conclusao: 'Senha trocada! Uma senha forte tem 12 ou mais caracteres e mistura letras, números e símbolos. E nunca use a mesma senha em sites diferentes: se um vazar, os outros continuam protegidos.',
  },
  {
    id: 'duas-etapas',
    capitulo: 1,
    titulo: 'Duas etapas',
    historia: 'Mesmo uma senha forte pode vazar. Ative a verificação em duas etapas: assim, para entrar na sua conta, também é preciso um código que chega só no SEU celular. Fique atento: a quadrilha adora pedir esse código...',
    conceitos: ['duas-etapas', 'codigo-secreto'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      conta: { senha: 'Gato-Azul-Pula-Nuvem7', senhaTrocada: true },
      emails: [EMAIL_ESCOLA, EMAIL_TIA],
      celular: {
        contatos: CONTATOS,
        conversas: [{ id: 'mae', nome: 'Mãe', numero: '(11) 99876-1010', conhecido: true, cor: '#c239b3', lida: true, mensagens: [{ de: 'ele', texto: 'Não esquece de levar o casaco!', hora: '07:12' }] }],
      },
    }),
    objetivos: () => [
      o.visitarSite('conta.postal.com.br', 'conta', 'Minha Conta', { texto: 'Abra a página Minha Conta (Favoritos do Edge)' }),
      o.ativarDuasEtapas(),
      o.responderConversa('suporte-falso', '"Suporte Postal"', 'recusar', 'Não passo código para ninguém.', {
        texto: 'Alguém pediu o seu código no Celular: responda que não passa',
        conceito: 'codigo-secreto',
      }),
      o.bloquearConversa('suporte-falso', 'o número que pediu o código'),
    ],
    roteiro: [
      {
        quando: { objetivo: 1 },
        executar: (tela) => {
          tela.sim.mundo.receberMensagem(
            'suporte-falso',
            { texto: 'Olá! Aqui é do suporte da Postal. Enviamos um código para você por engano. Pode me mandar ele aqui para eu cancelar? É urgente!' },
            {
              nome: 'Suporte Postal',
              numero: '(21) 96543-0001',
              conhecido: false,
              golpe: true,
              respostas: [
                { id: 'enviar', texto: 'Claro, o código é...', perigosa: true, alerta: 'NÃO! Quem tem o código entra na sua conta. A Postal nunca pede o código: quem pede é golpista.', reacao: 'Obrigado!! 😈' },
                { id: 'recusar', texto: 'Não passo código para ninguém.' },
              ],
            }
          );
          notificar(tela.sim, { app: 'celular', titulo: '(21) 96543-0001', texto: 'Olá! Aqui é do suporte da Postal...' });
          tela.central.falar('Chegou uma mensagem no Celular de um número desconhecido. Vá ver, mas com cuidado!', { tipo: 'alerta' });
        },
      },
    ],
    conclusao: 'Conta blindada! Com as duas etapas, a senha sozinha não basta para entrar. E lembre: nenhuma empresa pede o código que chega no seu celular. Quem pede está tentando roubar sua conta.',
  },

  // ======================= Capítulo 2: Caça ao phishing =======================
  {
    id: 'remetente-falso',
    capitulo: 2,
    titulo: 'Remetente falso',
    historia: 'A quadrilha mandou e-mails falsos para a sua Caixa de Entrada, misturados com os verdadeiros. Confira o endereço de cada um e denuncie só os golpes.',
    conceitos: ['phishing', 'remetente', 'denunciar-phishing'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      emails: [
        {
          id: 'flixy',
          phishing: true,
          de: { nome: 'Flixy', endereco: 'cobranca@flixy-pagamento.com' },
          assunto: 'Sua assinatura foi SUSPENSA',
          data: '10:15',
          corpo: ['Prezado cliente,', 'Não conseguimos cobrar a sua assinatura. Atualize os dados do cartão em até 24 horas ou sua conta será CANCELADA.', '[[pagar]]', 'Equipe Flixy'],
          links: { pagar: { texto: 'ATUALIZAR PAGAMENTO', url: 'flixy-pagamento.com/cartao', botao: true } },
        },
        {
          id: 'postal-dica',
          de: { nome: 'Equipe Postal', endereco: 'seguranca@postal.com.br' },
          assunto: 'Dica de segurança da semana',
          data: '09:30',
          corpo: ['Olá!', 'A Postal nunca pede sua senha por e-mail. Na dúvida, entre em conta.postal.com.br digitando o endereço.', 'Equipe Postal'],
        },
        {
          id: 'banco-aviso',
          phishing: true,
          de: { nome: 'Banco Pátria', endereco: 'atendimento@banco-patria-seguro.com' },
          assunto: 'Detectamos uma compra de R$ 2.499,00',
          data: '08:47',
          corpo: ['Uma compra de R$ 2.499,00 foi feita no seu cartão.', 'Se não foi você, cancele AGORA clicando abaixo:', '[[cancelar]]', 'Banco Pátria'],
          links: { cancelar: { texto: 'NÃO RECONHEÇO ESTA COMPRA', url: 'banco-patria-seguro.com/cancelar', botao: true } },
        },
        EMAIL_ESCOLA,
        EMAIL_TIA,
      ],
    }),
    objetivos: () => [
      o.verRemetente('flixy', 'Sua assinatura foi SUSPENSA', { texto: 'Abra o e-mail da Flixy e confira o endereço de quem enviou' }),
      o.denunciarEmail('flixy', 'Sua assinatura foi SUSPENSA', { texto: 'Denuncie o e-mail falso da Flixy como phishing' }),
      o.cacarPhishing(['banco-aviso'], { texto: 'Encontre e denuncie o outro e-mail falso da Caixa de Entrada', assuntos: { 'banco-aviso': 'Detectamos uma compra de R$ 2.499,00' } }),
      o.manterVerdadeiros(['postal-dica', 'escola', 'tia']),
    ],
    conclusao: 'Caixa limpa! Os golpes tinham endereços que não eram dos sites oficiais (flixy-pagamento.com, banco-patria-seguro.com) e usavam pressa e medo ("24 horas", "compra de R$ 2.499"). Essa é a isca do Capitão Anzol.',
  },
  {
    id: 'link-disfarcado',
    capitulo: 2,
    titulo: 'Link disfarçado',
    historia: 'Um e-mail promete um vale-presente de R$ 1.000 da Mega Loja. O link parece ser do site da loja... mas será que é? Descubra para onde ele leva sem clicar.',
    conceitos: ['link-disfarcado', 'digitar-endereco'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      emails: [
        {
          id: 'premio',
          phishing: true,
          de: { nome: 'Mega Loja', endereco: 'premios@megaloja-premios.xyz' },
          assunto: '🎁 Você ganhou um vale-presente de R$ 1.000!',
          data: '11:20',
          corpo: ['PARABÉNS! Você foi sorteado(a) e ganhou um vale-presente de R$ 1.000,00 da Mega Loja!', 'Resgate agora no nosso site oficial: [[premio]]', 'Corra: o prêmio expira em 1 hora.'],
          links: { premio: { texto: 'www.megaloja.com.br/premio', url: 'megaloja-premios.xyz/resgate' } },
        },
        EMAIL_ESCOLA,
      ],
    }),
    objetivos: () => [
      o.abrirEmail('premio', '🎁 Você ganhou um vale-presente de R$ 1.000!'),
      o.verLink('premio', '🎁 Você ganhou um vale-presente de R$ 1.000!', 'premio'),
      o.escolher('destino-link', 'Para onde o link leva de verdade?', ['megaloja.com.br', 'megaloja-premios.xyz', 'premio.com.br'], 'megaloja-premios.xyz', {
        conceito: 'link-disfarcado',
        dica: 'Pare o mouse em cima do link e leia o endereço que aparece no cantinho de baixo da mensagem.',
        caminho: [o.passo('email.link.premio', 'Pare o mouse em cima do link e leia o endereço que aparece embaixo.', { email: 'premio', acao: 'passar' })],
        explicacao: 'Exato! O texto azul dizia megaloja.com.br, mas o link leva para megaloja-premios.xyz. O texto do link pode mentir.',
        errou: () => 'Esse é o texto que aparece no link, mas o texto pode mentir. Pare o mouse em cima e leia o endereço do cantinho de baixo.',
      }),
      o.visitarDigitando('megaloja.com.br', { texto: 'Confira no site oficial: digite megaloja.com.br na barra de endereços do Edge' }),
      o.denunciarEmail('premio', '🎁 Você ganhou um vale-presente de R$ 1.000!'),
    ],
    conclusao: 'Isca desarmada! O site oficial avisa que a loja não sorteia prêmios por e-mail. Quando receber uma mensagem dessas, não clique: vá você mesmo ao site oficial, digitando o endereço.',
  },
  {
    id: 'site-falso',
    capitulo: 2,
    titulo: 'Site falso',
    historia: 'A Central encontrou um site que copia o Banco Pátria para roubar senhas. Abra ele no computador de testes (aqui é seguro) e descubra as pistas que entregam o golpe. Só não digite nada nele!',
    conceitos: ['cadeado', 'dominio', 'digitar-endereco'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      emails: [
        {
          id: 'analise',
          de: CENTRAL,
          assunto: 'Missão: analise este site suspeito',
          data: '13:05',
          corpo: ['Agente, recebemos várias denúncias deste site: [[suspeito]]', 'Abra o link (só desta vez, no computador de testes da Central), procure as pistas e compare com o site verdadeiro do banco.', 'NÃO digite nada nele. — Central'],
          links: { suspeito: { texto: 'bancopatria.atualiza-cadastro.com/login', url: 'bancopatria.atualiza-cadastro.com/login' } },
        },
        EMAIL_ESCOLA,
      ],
    }),
    objetivos: () => [
      o.abrirLinkDoEmail('analise', 'Missão: analise este site suspeito', 'suspeito', 'banco-falso', { texto: 'Abra o site suspeito pelo link do e-mail da Central' }),
      o.verCadeado('bancopatria.atualiza-cadastro.com', { texto: 'Clique no aviso "Não seguro", ao lado do endereço' }),
      o.escolher('dominio-falso', 'Qual é o nome verdadeiro (domínio) desse site?', ['bancopatria.com.br', 'atualiza-cadastro.com', 'login.com'], 'atualiza-cadastro.com', {
        conceito: 'dominio',
        dica: 'O nome verdadeiro é o que vem logo antes do .com (ou .com.br). O que vem antes dele, separado por ponto, pode ser qualquer disfarce.',
        caminho: [{ alvo: 'nav.endereco', texto: 'Leia o endereço: o nome verdadeiro é o que vem logo antes do .com.', site: 'bancopatria.atualiza-cadastro.com' }],
        explicacao: 'Isso! "bancopatria" no começo é só disfarce: quem manda no site é atualiza-cadastro.com. O site verdadeiro termina em bancopatria.com.br.',
        errou: (v) => (v === 'bancopatria.com.br' ? 'Esse é o site verdadeiro do banco, mas não é onde você está. Leia o endereço até o fim: o que vem logo antes do .com?' : 'Quase. Olhe o que vem logo antes do .com no endereço.'),
      }),
      o.visitarDigitando('bancopatria.com.br', { texto: 'Agora abra o site verdadeiro: digite bancopatria.com.br na barra de endereços' }),
      o.verCadeado('bancopatria.com.br', { texto: 'Confira o cadeado do site verdadeiro' }),
    ],
    conclusao: 'Golpe desmascarado! O site falso tinha "Não seguro", um nome que não era do banco e muita pressa ("será bloqueada hoje"). O verdadeiro tem cadeado e termina em bancopatria.com.br. E lembre: o cadeado sozinho não basta, confira sempre o nome.',
  },
  {
    id: 'anexo-perigoso',
    capitulo: 2,
    titulo: 'Anexo perigoso',
    historia: 'Alguém nesta casa baixou o "boleto atrasado" que chegou por e-mail. O ícone é de PDF... mas a Central desconfia que é um vírus disfarçado. Investigue sem abrir o arquivo!',
    conceitos: ['anexo-perigoso', 'antivirus', 'denunciar-phishing'],
    arquivos: [
      ...ARQUIVOS_BASE,
      { pasta: 'Downloads', nome: 'Boleto atrasado.pdf', tipo: 'exe', conteudo: { ameaca: 'Trojan:Win32/Anzol.B', icone: 'img:document-48-color', selo: 'PDF' } },
      { pasta: 'Downloads', nome: 'Trabalho de ciências', tipo: 'pdf', conteudo: { html: '<p>Trabalho de ciências: o ciclo da água.</p>' } },
    ],
    mundo: () => ({
      emails: [
        {
          id: 'boleto',
          phishing: true,
          de: { nome: 'Financeiro', endereco: 'financeiro@cobranca-rapida.net' },
          assunto: 'Boleto atrasado - pague hoje para evitar multa',
          data: '07:58',
          corpo: ['Seu boleto venceu e a multa aumenta todo dia.', 'Abra o anexo e pague hoje.'],
          anexos: [{ nome: 'Boleto atrasado.pdf', tipo: 'exe', icone: 'img:document-48-color', tamanho: '412 KB', conteudo: { ameaca: 'Trojan:Win32/Anzol.B' } }],
        },
        EMAIL_ESCOLA,
      ],
    }),
    objetivos: () => [
      o.abrirPasta('Downloads', { texto: 'Abra a pasta Downloads no Explorador de Arquivos', conceito: 'anexo-perigoso' }),
      o.escolher('tipo-boleto', 'No Explorador, olhe a coluna Tipo: que tipo de arquivo é o "Boleto atrasado.pdf"?', ['Documento PDF', 'Aplicativo', 'Imagem'], 'Aplicativo', {
        conceito: 'anexo-perigoso',
        dica: 'Na pasta Downloads, olhe a coluna "Tipo", na mesma linha do Boleto atrasado. O ícone engana, a coluna Tipo não.',
        caminho: [o.passo('explorador.item.Boleto atrasado.pdf', 'Olhe a coluna Tipo nesta linha.')],
        explicacao: 'Isso! O nome termina em ".pdf" e o ícone é de PDF, mas o Tipo é "Aplicativo": é um programa disfarçado (o nome completo é Boleto atrasado.pdf.exe). Abrir instalaria um vírus.',
        errou: () => 'O ícone e o nome dizem PDF, mas olhe a coluna Tipo, na mesma linha do arquivo.',
      }),
      o.verificarAntivirus(),
      o.removerAmeacas(),
      o.denunciarEmail('boleto', 'Boleto atrasado - pague hoje para evitar multa', { texto: 'Denuncie o e-mail que trouxe o anexo' }),
    ],
    conclusao: 'Vírus eliminado antes de agir! Golpistas disfarçam programas com nome e ícone de PDF. A coluna Tipo do Explorador mostra a verdade, e a Segurança do Windows remove a ameaça. Se o Windows avisar "O Windows protegeu o computador", escolha Não executar.',
  },

  // ======================= Capítulo 3: Golpes no celular =======================
  {
    id: 'sms-falso',
    capitulo: 3,
    titulo: 'SMS falso',
    historia: 'Seu celular recebeu uma mensagem dizendo que a sua encomenda está retida e que é preciso pagar uma taxa. Você está mesmo esperando uma encomenda da EnviaJá... Confira antes de pagar qualquer coisa!',
    conceitos: ['smishing', 'digitar-endereco', 'bloquear-denunciar'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      web: { rastreio: 'EJ482915736BR' },
      emails: [EMAIL_ESCOLA],
      celular: {
        contatos: CONTATOS,
        conversas: [
          {
            id: 'encomenda',
            nome: '',
            numero: '+55 11 94002-8922',
            conhecido: false,
            golpe: true,
            mensagens: [{ de: 'ele', texto: 'ENVIAJA: Sua encomenda EJ482915736BR foi RETIDA. Pague a taxa de R$ 9,90 em 24h ou ela será devolvida: [[enviaja-taxa.site/pagar]]', hora: '08:03' }],
          },
          { id: 'mae', nome: 'Mãe', numero: '(11) 99876-1010', conhecido: true, cor: '#c239b3', lida: true, mensagens: [{ de: 'ele', texto: 'Chegou a encomenda? Era para chegar essa semana.', hora: 'Ontem' }] },
        ],
      },
    }),
    objetivos: () => [
      o.abrirConversa('encomenda', '+55 11 94002-8922', { texto: 'Abra o Celular e leia a mensagem da encomenda', conceito: 'smishing' }),
      o.escolher('sms-oficial', 'A mensagem manda pagar em enviaja-taxa.site. Esse é o site oficial da EnviaJá?', ['Sim, tem "enviaja" no nome', 'Não, o oficial é enviaja.com.br'], 'Não, o oficial é enviaja.com.br', {
        conceito: 'dominio',
        dica: 'Ter o nome da empresa no endereço não quer dizer nada. O site oficial da EnviaJá termina em enviaja.com.br.',
        explicacao: 'Isso! Golpistas criam sites com o nome da empresa no meio. E empresa de entrega não cobra taxa por SMS.',
        errou: () => 'Qualquer um pode criar um site com "enviaja" no nome. Olhe o final: .site não é o endereço oficial.',
      }),
      {
        ...o.visitarDigitando('enviaja.com.br', { texto: 'Rastreie a encomenda no site oficial: digite enviaja.com.br no Edge e use o código da mensagem' }),
        verificar: (e) => e.marcos.has('web:rastreio'),
        caminho: [
          { alvo: 'nav.endereco', texto: 'Clique na barra de endereços e digite: enviaja.com.br', valor: 'enviaja.com.br', feito: (c) => c.app('edge')?.host === 'enviaja.com.br' || String(c.valorDoCampo('nav.endereco') || '').trim().toLowerCase() === 'enviaja.com.br' },
          { alvo: 'nav.endereco', texto: 'Agora aperte Enter.', feito: (c) => c.app('edge')?.host === 'enviaja.com.br' },
          { alvo: 'site.enviaja.codigo', valor: 'EJ482915736BR', texto: 'Digite o código de rastreio que está na mensagem: EJ482915736BR', site: 'enviaja.com.br' },
          o.passo('site.enviaja.rastrear', 'Clique em Rastrear.', { site: 'enviaja.com.br' }),
        ],
      },
      o.bloquearConversa('encomenda', '+55 11 94002-8922', { texto: 'Bloqueie e denuncie o número do SMS falso' }),
      o.excluirConversa('encomenda', '+55 11 94002-8922'),
    ],
    conclusao: 'Golpe evitado! A encomenda estava a caminho, sem taxa nenhuma. Mensagem de número desconhecido, com pressa e link para pagar, é golpe. Confira sempre no site oficial, digitando o endereço.',
  },
  {
    id: 'parente-falso',
    capitulo: 3,
    titulo: 'Parente falso',
    historia: 'Um número desconhecido diz ser a sua tia Cida, que "trocou de número", e pede um Pix urgente. Esse é um dos golpes mais comuns do Brasil. Não mande nada: confirme pelo número antigo!',
    conceitos: ['confirmar-pessoa', 'bloquear-denunciar'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      emails: [EMAIL_TIA],
      celular: {
        contatos: CONTATOS,
        conversas: [
          {
            id: 'tia-falsa',
            nome: '',
            numero: '(11) 91234-0000',
            conhecido: false,
            golpe: true,
            mensagens: [
              { de: 'ele', texto: 'Oi, meu amor! É a tia Cida. Troquei de número, salva esse aí 😘', hora: '14:02' },
              { de: 'ele', texto: 'Tô com um problema no banco... você consegue me fazer um Pix de R$ 500? Amanhã eu devolvo. Mas é URGENTE e não conta pra ninguém, tá?', hora: '14:03' },
            ],
            respostas: [
              { id: 'pix', texto: 'Tá bom, vou fazer o Pix', perigosa: true, alerta: 'Cuidado! Nunca mande dinheiro antes de confirmar quem é, ligando para o número antigo. "Urgente" e "não conta pra ninguém" são sinais de golpe.', reacao: 'Manda logo, por favor!!' },
              { id: 'confirmar', texto: 'Vou ligar no seu número antigo para confirmar.', reacao: 'Não precisa ligar! Meu celular antigo quebrou...' },
            ],
          },
          { id: 'mae', nome: 'Mãe', numero: '(11) 99876-1010', conhecido: true, cor: '#c239b3', lida: true, mensagens: [{ de: 'ele', texto: 'Já almoçou?', hora: '12:30' }] },
        ],
      },
    }),
    objetivos: () => [
      o.abrirConversa('tia-falsa', '(11) 91234-0000', { texto: 'Abra o Celular e leia a mensagem do número desconhecido' }),
      o.ligarPara('tia-cida', 'Tia Cida', { texto: 'Ligue para a Tia Cida no número que já está nos seus Contatos' }),
      o.bloquearConversa('tia-falsa', 'o número falso', { texto: 'Bloqueie e denuncie o número que fingiu ser a tia' }),
      o.escolher('parente-pix', 'Alguém diz que trocou de número e pede dinheiro com urgência. O que fazer?', ['Mandar o Pix rapidinho', 'Ligar para o número antigo e confirmar', 'Pedir uma foto da pessoa'], 'Ligar para o número antigo e confirmar', {
        conceito: 'confirmar-pessoa',
        dica: 'Pense no que você acabou de fazer na missão.',
        explicacao: 'Isso! Confirme por outro caminho (o número antigo, ou pessoalmente). Foto não serve: o golpista pega a foto do perfil da pessoa.',
        errou: (v) => (v === 'Pedir uma foto da pessoa' ? 'Foto não prova nada: o golpista copia a foto do perfil da pessoa. Qual é o jeito seguro?' : 'Nunca mande dinheiro sem confirmar! Qual é o jeito seguro?'),
      }),
    ],
    conclusao: 'A tia de verdade agradeceu! O golpe do "troquei de número" usa a foto e o nome de alguém da família, pressa e segredo. Antes de qualquer Pix, confirme ligando para o número antigo. E conte para a família.',
  },
  {
    id: 'premio-gratis',
    capitulo: 3,
    titulo: 'Gemas grátis',
    historia: 'Você entrou no site do seu jogo favorito e... PARABÉNS, 10.000 gemas grátis?! O anúncio é bom demais para ser verdade. A Central quer que você se livre dele sem cair na armadilha.',
    conceitos: ['premio-falso', 'anuncio-enganoso'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({ emails: [EMAIL_ESCOLA] }),
    objetivos: () => [
      o.visitarSite('pixelarena.com.br', 'pixel', 'Pixel Arena', { texto: 'Abra o site Pixel Arena (está nos Favoritos do Edge)' }),
      o.escolher('gemas-golpe', 'O anúncio promete 10.000 gemas grátis. O que ele quer de verdade?', ['Me dar um presente', 'Roubar minha conta do jogo', 'Testar o meu computador'], 'Roubar minha conta do jogo', {
        conceito: 'premio-falso',
        dica: 'Ninguém dá prêmio enorme de graça para um visitante qualquer. O que o golpista ganha?',
        explicacao: 'Isso! Prêmio bom demais é a isca: o site pede seu usuário e senha e o golpista fica com a sua conta (e com tudo o que você já conquistou).',
        errou: () => 'Desconfie: prêmio enorme, de graça e com pressa é sempre isca. O que eles querem?',
      }),
      o.denunciarAnuncio(),
      o.fecharAnuncio(),
    ],
    conclusao: 'Armadilha desarmada! O X grande era parte da imagem e levava ao golpe. Feche anúncios pelo "Fechar anúncio" do cantinho, denuncie pelo ⓘ e nunca digite a senha do jogo fora do login oficial.',
  },

  // ======================= Capítulo 4: Privacidade =======================
  {
    id: 'perfil-seguro',
    capitulo: 4,
    titulo: 'Perfil seguro',
    historia: 'O Capitão Anzol não pesca só senhas: ele junta informações. Seu perfil na Conecta (a rede social) está aberto para o mundo inteiro, com endereço, telefone e escola. Arrume isso!',
    conceitos: ['dados-pessoais', 'conta-privada'],
    arquivos: ARQUIVOS_BASE,
    mundo: ({ nome, arroba }) => ({
      emails: [EMAIL_ESCOLA],
      conecta: {
        perfil: { nome: nome || arroba, usuario: arroba, bio: 'Moro na Rua das Flores, 123 🏠 | 7º B da Escola Horizonte 📚 | Zap (11) 98765-4321 | Amo desenhar e jogar vôlei 🏐' },
        amigos: [
          { id: 'lucas', nome: 'Lucas Andrade', cor: '#0f6cbd', info: '7º B' },
          { id: 'ana', nome: 'Ana Júlia', cor: '#c239b3', info: '7º B' },
        ],
        publicacoes: [
          { texto: 'Treino de vôlei hoje! 🏐', local: 'Escola Horizonte, quadra', quando: 'Ontem', matiz: '30deg' },
          { texto: 'Meu cantinho de desenhar ✏️', local: 'Rua das Flores, 123', quando: 'Há 3 dias', matiz: '200deg' },
        ],
      },
    }),
    objetivos: () => [
      o.visitarSite('conecta.com.br', 'conecta', 'Conecta', { texto: 'Abra o seu perfil na Conecta (está nos Favoritos do Edge)' }),
      o.limparBio(),
      o.configurarPrivacidade('privado', true, { texto: 'Deixe a sua conta privada' }),
      o.configurarPrivacidade('localizacao', false, { texto: 'Desligue a localização nas publicações' }),
      o.escolher('quem-ve', 'Com a conta privada, quem vê as suas fotos?', ['Qualquer pessoa na internet', 'Só quem eu aceitei como amigo', 'Ninguém, nem eu'], 'Só quem eu aceitei como amigo', {
        conceito: 'conta-privada',
        dica: 'Leia a explicação ao lado do interruptor "Conta privada".',
        explicacao: 'Isso! Por isso é tão importante aceitar só quem você conhece de verdade.',
      }),
    ],
    conclusao: 'Perfil seguro! Agora só seus amigos veem suas fotos, e um estranho não descobre onde você mora, estuda ou o seu telefone. Fale do que você gosta, não de onde você está.',
  },
  {
    id: 'pedidos-de-amizade',
    capitulo: 4,
    titulo: 'Pedidos de amizade',
    historia: 'Chegaram vários pedidos de amizade na Conecta, e também uma mensagem estranha. Aceite só quem você conhece de verdade e proteja-se do resto.',
    conceitos: ['pedido-de-amizade', 'adulto-de-confianca'],
    arquivos: ARQUIVOS_BASE,
    mundo: ({ nome, arroba }) => ({
      emails: [EMAIL_ESCOLA],
      conecta: {
        perfil: { nome: nome || arroba, usuario: arroba, bio: 'Amo desenhar e jogar vôlei 🏐' },
        privacidade: { privado: true, localizacao: false },
        amigos: [
          { id: 'lucas', nome: 'Lucas Andrade', cor: '#0f6cbd', info: '7º B · 14 amigos em comum' },
          { id: 'ana', nome: 'Ana Júlia', cor: '#c239b3', info: '7º B · 18 amigos em comum' },
        ],
        pedidos: [
          { id: 'bia', nome: 'Bia Santos', cor: '#038387', info: 'Sua colega do vôlei · conta de 2022', amigosEmComum: 9, estado: 'pendente' },
          { id: 'gamer', nome: 'Gamer_Pro_99', cor: '#5c2e91', info: 'Conta criada há 2 dias · sem publicações', amigosEmComum: 0, estado: 'pendente', estranho: true },
          { id: 'ana-falsa', nome: 'Ana Júlia', cor: '#c239b3', info: 'Conta criada ontem · mesma foto da Ana Júlia', amigosEmComum: 0, estado: 'pendente', falso: true },
          { id: 'pedro', nome: 'Pedro Lima', cor: '#ca5010', info: '7º B · conta de 2021', amigosEmComum: 12, estado: 'pendente' },
        ],
        conversas: [
          {
            id: 'estranho',
            nome: 'Gamer_Pro_99',
            cor: '#5c2e91',
            info: 'Não é seu amigo',
            mensagens: [
              { de: 'ele', texto: 'oi! vi que vc joga vôlei, eu tb 😄' },
              { de: 'ele', texto: 'qual a sua escola? me manda uma foto sua? fica só entre a gente, tá?' },
            ],
          },
        ],
      },
    }),
    objetivos: () => [
      {
        ...o.responderPedido('bia', 'Bia Santos', 'aceito'),
        texto: 'Aceite os pedidos de quem você conhece: Bia (do vôlei) e Pedro (da sua turma)',
        verificar: (e) => e.mundo.pedido('bia')?.estado === 'aceito' && e.mundo.pedido('pedro')?.estado === 'aceito',
        dica: 'Em Amigos, aceite a Bia e o Pedro: vocês têm amigos em comum e se conhecem de verdade.',
        caminho: [
          { alvo: 'site.conecta.pedido.bia.aceitar', texto: 'Clique em Aceitar no pedido da Bia.', site: 'conecta.com.br', favorito: 'conecta', feito: (c) => c.mundo().pedido('bia')?.estado === 'aceito' },
          { alvo: 'site.conecta.pedido.pedro.aceitar', texto: 'Clique em Aceitar no pedido do Pedro.', site: 'conecta.com.br', favorito: 'conecta' },
        ],
      },
      o.responderPedido('gamer', 'Gamer_Pro_99', 'recusado', { texto: 'Recuse o pedido de Gamer_Pro_99 (vocês não se conhecem)' }),
      o.denunciarPerfil('ana-falsa', 'Ana Júlia', { texto: 'Denuncie o perfil falso que copiou a Ana Júlia (a verdadeira já é sua amiga)' }),
      o.bloquearNaConecta('estranho', 'Gamer_Pro_99', { texto: 'Bloqueie quem pediu sua foto e sua escola por mensagem' }),
      o.escolher('estranho-foto', 'Um desconhecido pede sua foto e onde você estuda, "só entre a gente". O que fazer?', ['Mandar, ele parece legal', 'Bloquear e contar para um adulto de confiança', 'Responder só a escola'], 'Bloquear e contar para um adulto de confiança', {
        conceito: 'adulto-de-confianca',
        dica: 'Pedido de segredo + foto + onde você está é um sinal de perigo.',
        explicacao: 'Isso! Quem pede segredo, fotos ou onde você está quer te enganar. Bloqueie e conte para um adulto de confiança: você não fez nada de errado.',
        errou: () => 'Não! Nenhuma informação para um estranho, nem a escola. Qual é a atitude segura?',
      }),
    ],
    conclusao: 'Rede protegida! Aceite só quem você conhece pessoalmente, desconfie de conta nova e sem amigos em comum, e denuncie quem copia o perfil de um amigo. Se alguém pedir fotos ou segredo, bloqueie e conte para um adulto.',
  },

  // ======================= Capítulo 5: Missão final =======================
  {
    id: 'conta-invadida',
    capitulo: 5,
    titulo: 'Conta invadida',
    historia: 'O Capitão Anzol conseguiu entrar na sua conta de e-mail (sua senha era cachorro2010, fácil de adivinhar!). A Postal avisou de um acesso estranho. Use tudo o que você aprendeu para expulsar o invasor, agente @{arroba}. E cuidado: ele mandou mais iscas.',
    conceitos: ['aparelhos-conectados', 'senha-forte', 'duas-etapas', 'digitar-endereco', 'denunciar-phishing'],
    arquivos: ARQUIVOS_BASE,
    mundo: () => ({
      conta: {
        senha: 'cachorro2010',
        sessoes: [
          { id: 'este', dispositivo: 'Este computador (Windows)', local: 'São Paulo, Brasil', quando: 'Agora', atual: true },
          { id: 'celular', dispositivo: 'Seu celular (Android)', local: 'São Paulo, Brasil', quando: 'Hoje, 07:40' },
          { id: 'invasor', dispositivo: 'Computador desconhecido (Linux)', local: 'Cidade desconhecida, outro país', quando: 'Hoje, 03:12', suspeita: true },
        ],
      },
      emails: [
        {
          id: 'alerta-postal',
          de: { nome: 'Postal', endereco: 'seguranca@postal.com.br' },
          assunto: 'Novo acesso à sua conta',
          data: '03:15',
          corpo: ['Detectamos um acesso à sua conta num computador desconhecido (Linux), hoje às 03:12, em outro país.', 'Se foi você, ignore. Se não foi, entre em Minha Conta pelo endereço conta.postal.com.br (digite no navegador), desconecte o aparelho e troque sua senha.', 'Equipe Postal'],
        },
        {
          id: 'isca-final',
          phishing: true,
          de: { nome: 'Postal Suporte', endereco: 'suporte@postal-verificacao.net' },
          assunto: 'Sua conta será EXCLUÍDA em 24h',
          data: '03:20',
          corpo: ['Sua conta foi usada de forma suspeita e será EXCLUÍDA em 24 horas.', 'Para manter a conta, confirme sua senha aqui: [[manter]]'],
          links: { manter: { texto: 'conta.postal.com.br/manter', url: 'postal-verificacao.net/manter' } },
        },
        EMAIL_ESCOLA,
        EMAIL_TIA,
      ],
      celular: { contatos: CONTATOS, conversas: [] },
    }),
    objetivos: () => [
      o.visitarDigitando('conta.postal.com.br', { texto: 'Abra Minha Conta digitando conta.postal.com.br no Edge (não use links de e-mail)', aceitaFavorito: true }),
      o.encerrarSessao('invasor', 'computador Linux, outro país'),
      o.trocarSenha({ texto: 'Troque a senha por uma senha forte', atual: 'cachorro2010' }),
      o.ativarDuasEtapas(),
      o.denunciarEmail('isca-final', 'Sua conta será EXCLUÍDA em 24h', { texto: 'Denuncie a nova isca que o Capitão Anzol mandou por e-mail' }),
    ],
    conclusao: 'INVASOR EXPULSO! Você desconectou o aparelho estranho, trocou a senha, ativou as duas etapas e ainda denunciou a última isca. A Central tem orgulho de você, agente: o Capitão Anzol não pesca mais ninguém por aqui!',
  },
];

export function missaoPorId(id) {
  return MISSOES.find((m) => m.id === id) || null;
}

/** Troca {arroba} nos textos da missão */
export function personalizar(texto, { arroba = 'agente' } = {}) {
  return String(texto ?? '').replace(/\{arroba\}/g, arroba);
}

/** A primeira sempre; as outras quando a anterior foi concluída (ou todas, se o professor liberou) */
export function missoesLiberadas(concluidas, { liberarTudo = false } = {}) {
  const feitas = new Set(concluidas);
  const liberadas = new Set();
  MISSOES.forEach((m, i) => {
    if (liberarTudo || i === 0 || feitas.has(MISSOES[i - 1].id) || feitas.has(m.id)) liberadas.add(m.id);
  });
  return liberadas;
}

/**
 * Estrelas: como na Operação Word (3 sem ajuda ou com uma dica, 2 com pouca,
 * 1 com muita), e cada deslize de segurança (clicar no golpe, digitar senha
 * em site falso, executar o vírus, mandar o código) pesa como uma dica.
 */
export function calcularEstrelas({ dicas = 0, mostreMe = 0, deslizes = 0, tutorial = false }) {
  if (tutorial) return 3;
  const ajuda = dicas + mostreMe * 2 + deslizes * 2;
  if (ajuda <= 1) return 3;
  if (ajuda <= 4) return 2;
  return 1;
}
