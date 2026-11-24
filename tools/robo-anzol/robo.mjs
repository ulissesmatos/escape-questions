/**
 * Robô da Operação Anzol: em cada missão, primeiro bagunça a tela como um
 * aluno que clica em tudo (abre o Iniciar, o Email, o Celular, navega para
 * outro site, minimiza janelas) e depois faz SÓ o que o Mostre-me mostra, até
 * concluir. As perguntas da Central ele responde depois de olhar o lugar que
 * o Mostre-me aponta. Se o guia travar num passo ou apontar para o nada, a
 * missão falha e a foto da tela fica na pasta temporária (robo-word/fotos).
 *
 *   npm start                          (em outro terminal)
 *   npm run robo:anzol                 → todas as missões, semente 7
 *   npm run robo:anzol -- sms-falso 13 → só uma missão, outra semente
 *
 * Usa o mesmo Chrome do robô da Operação Word (CHROME, ROBO_URL).
 */
import { abrirChrome } from '../robo-word/cdp.mjs';
import fs from 'node:fs';

const filtro = process.argv[2] && process.argv[2] !== 'todas' ? process.argv[2].split(',') : null;
const semente = Number(process.argv[3] || 7);
const c = await abrirChrome({ porta: 9341 });
const ajudante = fs.readFileSync(new URL('./robo-pagina.js', import.meta.url), 'utf8');
const resultados = [];

async function seguirMissao(missao) {
  await c.avaliar(`R.app.jogar(window.__M.find(m => m.id === ${JSON.stringify(missao)})); true`);
  await c.esperar(900);
  const caos = await c.avaliar(`R.caos(5, ${semente + missao.length})`);
  await c.esperar(400);
  await c.avaliar('(() => { const t = R.tela; if (!t.guia.ativo) t.ligarMostreMe(); return true; })()');
  let repetidos = 0;
  let anterior = '';
  let olhouPergunta = 0;
  const caminho = [];
  for (let i = 0; i < 120; i++) {
    // o Mostre-me desliga sozinho quando um objetivo termina (fora da missão guiada)
    await c.avaliar('(() => { const t = R.tela; if (t && !t.concluida && t.objetivoAtual && !t.guia.ativo) t.ligarMostreMe(); return true; })()');
    const p = await c.avaliar('R.passo()');
    if (p.fim) return { ok: true, passos: caminho.length, caos };
    if (p.erro) return { ok: false, motivo: p.erro, objetivo: p.objetivo, caos, caminho: caminho.slice(-6) };
    const chave = `${p.objetivo}|${p.indice}|${p.texto}`;
    repetidos = chave === anterior ? repetidos + 1 : 0;
    anterior = chave;
    caminho.push(`${p.indice}: ${p.texto || p.tipo}`);
    const limite = p.tipo === 'esperar' ? 20 : 4;
    if (repetidos >= limite && !p.pergunta) return { ok: false, motivo: 'travou no mesmo passo', objetivo: p.objetivo, passo: p.texto, caos, caminho: caminho.slice(-6) };
    // pergunta: segue o caminho do Mostre-me (onde a resposta aparece) e então responde
    if (p.pergunta) {
      olhouPergunta += 1;
      if (p.tipo === 'pergunta' || olhouPergunta >= 2 || repetidos >= 1) {
        await c.avaliar('R.responder()');
        await c.esperar(400);
        olhouPergunta = 0;
        continue;
      }
    }
    if (p.tipo === 'esperar') await c.esperar(600);
    else if (p.tipo === 'passar') await c.mover(p.ponto.x, p.ponto.y);
    else if (p.tipo === 'campo') {
      await c.digitar(String(p.valor));
      if (p.confirmar === 'enter') await c.tecla('Enter');
    }
    else if (p.tipo === 'enter') {
      await c.clicar(p.ponto.x, p.ponto.y);
      await c.tecla('End');
      await c.tecla('Enter');
    } else if (p.tipo === 'clicar') {
      if (p.acao === 'duplo') await c.clicar(p.ponto.x, p.ponto.y, { cliques: 2 });
      else await c.clicar(p.ponto.x, p.ponto.y);
    }
    await c.esperar(400);
  }
  return { ok: false, motivo: 'passos demais', caminho: caminho.slice(-8), caos };
}

try {
  await c.ir(`${process.env.ROBO_URL || 'http://localhost:3000'}/seguranca.html?teste&tudo`);
  await c.esperar(900);
  await c.avaliar(`(async () => { const s = window.operacaoAnzol.sessao; if (!s.conta) { try { await s.entrar('robo.caos'); } catch { await s.criar({ arroba: 'robo.caos', nome: 'Robo Caos', turma: 'Teste' }); } } return true; })()`);
  await c.avaliar(ajudante);
  await c.avaliar('(() => { window.__M = window.operacaoAnzol.curriculo.MISSOES; return true; })()');
  const ids = await c.avaliar('window.__M.map(m => m.id)');
  for (const id of ids) {
    if (filtro && !filtro.includes(id)) continue;
    const errosAntes = c.erros.length;
    let r;
    try {
      r = await seguirMissao(id);
      if (r.ok) {
        const d = await c.avaliar('R.tela.deslizes.length');
        if (d) r = { ok: false, motivo: `o caminho do Mostre-me causou ${d} deslize(s)` };
      }
    } catch (e) {
      r = { ok: false, motivo: e.message };
    }
    if (!r.ok) await c.foto(`robo-anzol-${id}`);
    if (c.erros.length > errosAntes) r.errosConsole = c.erros.slice(errosAntes);
    resultados.push({ id, ...r });
    console.log(r.ok ? `ok   ${id} (${r.passos} passos)` : `FALHOU ${id}: ${JSON.stringify(r, null, 1)}`);
    await c.avaliar(`(() => { const t = R.tela; if (t) t.concluida = true; R.app.mostrarBase(); return true; })()`);
    await c.esperar(300);
  }
} catch (e) {
  console.error('FALHA GERAL', e.stack);
  await c.foto('robo-anzol-erro-geral');
} finally {
  c.fechar();
  if (resultados.some((r) => !r.ok)) process.exitCode = 1;
  console.log(`\n${resultados.filter((r) => r.ok).length}/${resultados.length} missões terminadas seguindo só o Mostre-me (semente ${semente})`);
}
