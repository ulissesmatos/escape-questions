// Pistas originais do Escape Room — usadas só para popular um banco vazio.
const PISTAS_INICIAIS = [
  {
    titulo: '🧭 O Animal Navegador',
    enunciado: 'O "Firefox" é um dos navegadores de internet mais conhecidos do mundo. Pesquise a logo dele. Qual animal aparece abraçando o globo terrestre?',
    pergunta: 'Escreva o nome desse animal em português. Quantas letras tem essa palavra?',
    respostaDigito: 6,
  },
  {
    titulo: '📶 O Rei Sem Fio',
    enunciado: 'A tecnologia que conecta nossos celulares aos fones de ouvido sem fio tem um nome curioso: Bluetooth. Pesquise a origem desse nome na internet. Ele foi inspirado em um antigo rei viking que tinha um dente de uma cor bem específica.',
    pergunta: 'Que cor era o dente do rei? Quantas letras tem o nome dessa cor?',
    respostaDigito: 4,
  },
  {
    titulo: '#️⃣ O Símbolo das Categorias',
    enunciado: 'Quando queremos agrupar um assunto no Instagram, TikTok ou YouTube, usamos o símbolo cerquilha ( # ) antes de uma palavra (ex: #futebol). Essa prática é chamada de Hashtag.',
    pergunta: 'Olhe para o teclado do computador. Qual tecla de número você precisa apertar (junto com o Shift) para fazer o símbolo #?',
    respostaDigito: 3,
  },
  {
    titulo: '🔓 A Pior Senha do Mundo',
    enunciado: 'Todo ano, as empresas de segurança na internet divulgam a lista das senhas mais usadas (e mais facilmente hackeadas) do planeta.',
    pergunta: 'Qual é a senha número 1 mais usada no mundo? (Dica: é uma sequência numérica muito óbvia de seis números). Qual é o último número dessa senha?',
    respostaDigito: 6,
  },
  {
    titulo: '🎬 O Primeiro Vídeo',
    enunciado: 'O primeiro vídeo postado na história do YouTube, em 2005, se chama "Me at the zoo" (Eu no zoológico). Pesquise sobre esse vídeo clássico.',
    pergunta: 'Em frente a qual animal enorme o rapaz do vídeo estava? Escreva o nome do animal e conte: quantas vogais tem o nome desse animal?',
    respostaDigito: 4,
  },
  {
    titulo: '🔍 O Buscador Gigante',
    enunciado: 'O Google é a página inicial da internet para a maioria das pessoas. O nome surgiu de um erro de matemática, inspirado no número "Googol".',
    pergunta: 'Olhe para a palavra GOOGLE. Se você contar apenas as vogais dessa palavra, qual é o total?',
    respostaDigito: 3,
  },
  {
    titulo: '📡 As Ondas de Conexão',
    enunciado: 'O ícone do Wi-Fi é universal. Em qualquer lugar do mundo que você for, ele indicará que há internet sem fio. O símbolo clássico é formado por um pontinho na base e algumas "ondas" curvadas acima dele.',
    pergunta: 'Olhe para o ícone do Wi-Fi no celular ou pesquise na internet. Quantas linhas curvadas existem acima do ponto no ícone clássico completo?',
    respostaDigito: 3,
  },
  {
    titulo: '☁️ Arquivos no Céu',
    enunciado: 'Hoje em dia, não precisamos salvar tudo no pen drive. Quando salvamos fotos e arquivos na internet (como no Google Drive), dizemos que eles estão armazenados em um lugar que normalmente fica no céu.',
    pergunta: 'Que lugar é esse? (Dica: "Armazenamento em..."). Quantas letras tem essa palavra?',
    respostaDigito: 5,
  },
  {
    titulo: '🐦 O Pássaro Extinto',
    enunciado: 'Uma das redes sociais mais famosas do mundo mudou de nome recentemente e agora se chama "X". Porém, antes dessa mudança, ela era famosa por ter um passarinho azul como logotipo.',
    pergunta: 'Qual era o antigo nome dessa rede social? Quantas letras "T" (apenas a letra T) existem nessa palavra?',
    respostaDigito: 3,
  },
  {
    titulo: '😀 As Carinhas do Japão',
    enunciado: 'As carinhas e símbolos que usamos nas mensagens de texto (😂, ❤️, 👍) para demonstrar emoções revolucionaram a comunicação na internet. O nome original dessas carinhas surgiu no Japão.',
    pergunta: 'Qual é o nome oficial dessas carinhas? Quantas letras tem essa palavra?',
    respostaDigito: 5,
  },
];

// Títulos corrigidos em bancos já semeados (só se o professor não editou)
const CORRECOES_DE_TITULO = [
  { antigo: '# O Símbolo das Categorias', novo: '#️⃣ O Símbolo das Categorias' },
  { antigo: '💾 Arquivos no Céu', novo: '☁️ Arquivos no Céu' },
];

async function semearEscapeRoom(db) {
  const { total } = await db.one('SELECT COUNT(*)::int AS total FROM questions');
  if (total === 0) {
    await db.transaction(async (tx) => {
      for (const [i, p] of PISTAS_INICIAIS.entries()) {
        await tx.query(
          `INSERT INTO questions (ordem, tipo, titulo, enunciado, pergunta, resposta_digito)
           VALUES ($1, 'digito', $2, $3, $4, $5)`,
          [i, p.titulo, p.enunciado, p.pergunta, p.respostaDigito]
        );
      }
    });
  }

  for (const { antigo, novo } of CORRECOES_DE_TITULO) {
    await db.query('UPDATE questions SET titulo = $1 WHERE titulo = $2', [novo, antigo]);
  }
}

module.exports = { semearEscapeRoom };
