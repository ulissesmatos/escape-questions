/**
 * Robô da Operação Word: em cada missão, primeiro bagunça a tela como um aluno
 * que clica em tudo (troca de guia, abre o menu Arquivo e deixa aberto, abre o
 * Iniciar, minimiza o Word, abre o Explorador ou o Edge por cima, seleciona
 * palavras aleatórias) e depois faz SÓ o que o Mostre-me mostra, até concluir.
 * Se o guia travar num passo ou apontar para o nada, a missão falha e a foto
 * da tela fica na pasta temporária (robo-word/fotos).
 *
 *   npm start                         (em outro terminal)
 *   npm run robo:word                 → todas as missões, semente 7
 *   npm run robo:word -- cartaz 13    → só uma missão, outra semente
 *
 * Precisa do Chrome (ou Edge: CHROME="caminho do msedge.exe"). O endereço do
 * site vem de ROBO_URL (padrão http://localhost:3000).
 */
import { abrirChrome } from './cdp.mjs';
import fs from 'node:fs';

const filtro = process.argv[2] && process.argv[2] !== 'todas' ? process.argv[2].split(',') : null;
const semente = Number(process.argv[3] || 7);
const c = await abrirChrome({ porta: 9340 });
const ajudante = fs.readFileSync(new URL('./robo-pagina.js', import.meta.url), 'utf8');
const resultados = [];

async function seguirMissao(missao) {
  await c.avaliar(`R.app.jogar(window.__M.find(m => m.id === ${JSON.stringify(missao)})); true`);
  await c.esperar(900);
  const caos = await c.avaliar(`R.caos(6, ${semente + missao.length})`);
  await c.esperar(400);
  let repetidos = 0;
  let acoesNaPergunta = 0;
  let anterior = '';
  const caminho = [];
  for (let i = 0; i < 90; i++) {
    const p = await c.avaliar('R.passo()');
    if (p.fim) return { ok: true, passos: caminho.length, caos };
    if (p.erro) return { ok: false, motivo: p.erro, objetivo: p.objetivo, caos, caminho: caminho.slice(-6) };
    const chave = `${p.objetivo}|${p.indice}|${p.texto}`;
    repetidos = chave === anterior ? repetidos + 1 : 0;
    anterior = chave;
    caminho.push(`${p.indice}: ${p.texto}`);
    if (repetidos >= 4) return { ok: false, motivo: 'travou no mesmo passo', objetivo: p.objetivo, passo: p.texto, caos, caminho: caminho.slice(-6) };
    if (p.tipo === 'esperar') {
      await c.esperar(500);
      continue;
    }
    if (p.tipo === 'texto') {
      if (p.enter) await c.tecla('Enter');
    } else if (p.tipo === 'digitar') {
      await c.digitar(p.valor);
    } else if (p.tipo === 'campo') {
      await c.digitar(p.valor);
      if (p.confirmar === 'enter') await c.tecla('Enter');
      else await c.tecla('Tab');
    } else if (p.tipo === 'clicar') {
      if (p.acao === 'duplo') await c.clicar(p.ponto.x, p.ponto.y, { cliques: 2 });
      else if (p.acao === 'direito') await c.clicar(p.ponto.x, p.ponto.y, { botao: 'right' });
      else await c.clicar(p.ponto.x, p.ponto.y);
    }
    await c.esperar(p.tipo === 'clicar' ? 350 : 250);
    // pergunta da Central: depois de seguir o caminho uma vez, responde
    acoesNaPergunta = p.pergunta ? acoesNaPergunta + 1 : 0;
    if (p.pergunta && acoesNaPergunta >= 2) {
      const resposta = await c.avaliar(`R.respostaCerta(${JSON.stringify(p.pergunta)})`);
      await c.avaliar(`R.responder(${JSON.stringify(p.pergunta)}, ${JSON.stringify(resposta)})`);
      await c.esperar(300);
    }
    // o vírus da missão 3 ataca um pouco depois de colar
    if (missao === 'coordenadas') await c.esperar(300);
  }
  return { ok: false, motivo: 'passos demais', caminho: caminho.slice(-8), caos };
}

try {
  await c.ir(`${process.env.ROBO_URL || 'http://localhost:3000'}/word.html?teste&tudo`);
  await c.esperar(900);
  await c.avaliar(`(async () => { const s = window.operacaoWord.sessao; if (!s.conta) { try { await s.entrar('robo.caos'); } catch { await s.criar({ arroba: 'robo.caos', nome: 'Robo Caos', turma: 'Teste' }); } } return true; })()`);
  await c.avaliar(ajudante);
  await c.avaliar(`import('/js/pages/word/regras/missoes.js').then(m => { window.__M = m.MISSOES; return true; })`);
  const ids = await c.avaliar('window.__M.map(m => m.id)');
  for (const id of ids) {
    if (filtro && !filtro.includes(id)) continue;
    const errosAntes = c.erros.length;
    let r;
    try {
      r = await seguirMissao(id);
    } catch (e) {
      r = { ok: false, motivo: e.message };
    }
    if (!r.ok) await c.foto(`robo-${id}`);
    if (c.erros.length > errosAntes) r.errosConsole = c.erros.slice(errosAntes);
    resultados.push({ id, ...r });
    console.log(r.ok ? `ok   ${id} (${r.passos} passos)` : `FALHOU ${id}: ${JSON.stringify(r, null, 1)}`);
    await c.avaliar(`(() => { const t = R.tela; if (t) t.concluida = true; R.app.mostrarBase(); return true; })()`);
    await c.esperar(300);
  }
} catch (e) {
  console.error('FALHA GERAL', e.stack);
  await c.foto('robo-erro-geral');
} finally {
  c.fechar();
  if (resultados.some((r) => !r.ok)) process.exitCode = 1;
  console.log(`\n${resultados.filter((r) => r.ok).length}/${resultados.length} missões terminadas seguindo só o Mostre-me (semente ${semente})`);
}
