import { h } from '../../../core/dom.js';
import { icone } from '../../word/sistema/icones.js';

/**
 * Pedaços comuns dos sites de mentira.
 *
 * Os sites falsos copiam o visual dos verdadeiros (é assim que o golpe
 * funciona): a diferença está no endereço, no "Não seguro" e no que eles
 * pedem (senha, cartão, código).
 */

/** Campo com rótulo (data-alvo para o Mostre-me) */
export function campo(rotulo, { tipo = 'text', alvo = null, valor = '', placeholder = '', aoDigitar = null, maximo = null } = {}) {
  const entrada = h('input', { type: tipo, class: 'site-campo', 'data-alvo': alvo, value: valor, placeholder, autocomplete: 'off', spellcheck: false, maxlength: maximo });
  // o teclado do simulador não pode roubar as teclas digitadas na página
  entrada.addEventListener('keydown', (e) => e.stopPropagation());
  if (aoDigitar) entrada.addEventListener('input', () => aoDigitar(entrada.value, entrada));
  return { entrada, el: h('label', { class: 'site-rotulo' }, h('span', { text: rotulo }), entrada) };
}

/**
 * Formulário de golpe: pede dados e, ao enviar, "carrega" e dá erro (o
 * golpista já ficou com os dados). Para o simulador é um deslize: a Central
 * explica o que aconteceria.
 */
export function formularioFalso(ctx, { titulo, texto, campos, botao = 'Continuar', classe = '' }) {
  const entradas = campos.map((c, i) => campo(c.rotulo, { tipo: c.tipo || 'text', alvo: `site.falso.campo.${i}`, placeholder: c.placeholder || '' }));
  const aviso = h('p', { class: 'site-falso-erro', hidden: true });
  const enviar = h('button', { type: 'submit', class: 'site-botao site-botao-falso', 'data-alvo': 'site.falso.enviar', text: botao });
  const form = h('form', { class: `site-form ${classe}`.trim() }, titulo && h('h2', { text: titulo }), texto && h('p', { text: texto }), ...entradas.map((e) => e.el), enviar, aviso);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (entradas.every((x) => !x.entrada.value.trim())) {
      aviso.hidden = false;
      aviso.textContent = 'Preencha os campos para continuar.';
      return;
    }
    enviar.disabled = true;
    enviar.textContent = 'Verificando...';
    ctx.enviarDados(campos.some((c) => c.tipo === 'password') ? 'senha' : 'dados');
    setTimeout(() => {
      enviar.disabled = false;
      enviar.textContent = botao;
      aviso.hidden = false;
      aviso.textContent = 'Erro no servidor. Tente novamente mais tarde.';
      for (const x of entradas) x.entrada.value = '';
    }, 1200);
  });
  return form;
}

/** Faixa de aviso do próprio site (os sites verdadeiros avisam sobre golpes) */
export function avisoDoSite(texto, { alvo = null } = {}) {
  return h('p', { class: 'site-aviso', 'data-alvo': alvo }, icone('shield_checkmark', { tamanho: 18 }), h('span', { text: texto }));
}

/** Interruptor de liga/desliga (configurações das contas) */
export function interruptor(rotulo, ligado, { alvo, explicacao = '', aoMudar }) {
  const botao = h(
    'button',
    { type: 'button', role: 'switch', 'aria-checked': String(ligado), class: `site-interruptor${ligado ? ' ligado' : ''}`, 'data-alvo': alvo, onClick: () => aoMudar(!ligado) },
    h('span', { class: 'site-interruptor-bola' })
  );
  return h('div', { class: 'site-config' }, h('div', {}, h('strong', { text: rotulo }), explicacao && h('small', { text: explicacao })), botao);
}
