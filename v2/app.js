(function () {
  'use strict';

  var STEPS = ['Especialidade', 'Local', 'Dia', 'Horário', 'Confirmar'];
  var SPECS = ['Clínica geral', 'Cardiologia', 'Endocrinologia', 'Ginecologia', 'Ortopedia'];
  var MANHA = ['08:30', '09:30', '10:00'];
  var TARDE = ['15:15', '15:30', '16:00'];
  var TARDE_MAIS = ['16:30', '17:00', '17:30'];
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var CLINICA = 'Clínica de exemplo A, Centro';

  var ICON = {
    check: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    left: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3l10 18H2L12 3z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>'
  };

  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  var mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  var mesMax = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 1);

  var st = { step: 1, view: 'flow', spec: '', loc: '', mes: mesAtual, dia: null, hora: '', mais: false, erro: null };

  var app = document.getElementById('app');
  var statusEl = document.getElementById('status');
  var demo = document.getElementById('demo-falha');

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fromIso(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function mesTxt(d) { return MESES[d.getMonth()] + ' ' + d.getFullYear(); }
  function longo(d) {
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function disponivel(d) {
    var w = d.getDay();
    return d > hoje && w !== 0 && w !== 6;
  }

  /* ---------- peças de tela ---------- */
  function etapas(atual, concluido) {
    var itens = STEPS.map(function (nome, i) {
      var n = i + 1;
      var feita = concluido || n < atual;
      var cls = (feita || n === atual) ? 'on' : '';
      if (n === atual && !concluido) cls += ' atual';
      var marca = feita ? ICON.check + '<span class="sr-only"> concluída</span> ' : '';
      return '<li class="' + cls + '"' + (n === atual && !concluido ? ' aria-current="step"' : '') + '>' +
        '<span class="barra"></span><span class="nome">' + marca + esc(nome) + '</span></li>';
    }).join('');
    var txt = concluido ? 'Etapa 5 de 5: concluída' : 'Etapa ' + atual + ' de 5<span class="so-estreito">: ' + esc(STEPS[atual - 1]) + '</span>';
    return '<div><p class="etapa-txt">' + txt + '</p><nav aria-label="Etapas do agendamento"><ol class="steps">' + itens + '</ol></nav></div>';
  }
  function erroMsg(id, msg) {
    if (!msg) return '';
    return '<p class="erro-msg" id="' + id + '" role="alert">' + ICON.warn + '<span>' + esc(msg) + '</span></p>';
  }
  function voltar() {
    return '<button type="button" class="btn" data-act="voltar">' + ICON.left + ' Voltar</button>';
  }

  /* ---------- etapas ---------- */
  function vEtapa1() {
    var opts = SPECS.map(function (s) {
      return '<label class="opt"><input type="radio" name="spec" value="' + esc(s) + '"' + (st.spec === s ? ' checked' : '') + '><span>' + esc(s) + '</span></label>';
    }).join('');
    return '<h1 id="titulo" tabindex="-1">Qual especialidade você procura?</h1>' +
      '<form data-form="spec" novalidate>' +
      '<fieldset' + (st.erro ? ' aria-describedby="e-spec"' : '') + '><legend class="legend">Especialidade</legend>' +
      erroMsg('e-spec', st.erro) + '<div class="opts">' + opts + '</div></fieldset>' +
      '<div class="actions" style="margin-top:1.5rem"><button type="submit" class="btn btn-primary">Continuar</button></div></form>';
  }

  function vEtapa2() {
    var inv = st.erro ? ' aria-invalid="true" aria-describedby="e-loc dica-loc"' : ' aria-describedby="dica-loc"';
    return '<h1 id="titulo" tabindex="-1">Onde você quer ser atendido?</h1>' +
      '<form data-form="loc" novalidate>' +
      '<div class="field"><label for="loc">Bairro, CEP ou endereço</label>' +
      '<p class="hint" id="dica-loc">Exemplo: Centro, Rio de Janeiro</p>' +
      erroMsg('e-loc', st.erro) +
      '<input class="input" type="text" id="loc" name="loc" value="' + esc(st.loc) + '"' + inv + '></div>' +
      '<div class="field" style="margin-top:1rem"><button type="button" class="btn btn-outline btn-wide" data-act="local-exemplo">Usar minha localização</button>' +
      '<p class="hint">Neste protótipo, o botão preenche um local de exemplo. Nenhuma localização é lida.</p></div>' +
      '<div class="actions" style="margin-top:1.5rem">' + voltar() + '<button type="submit" class="btn btn-primary">Continuar</button></div></form>';
  }

  function vCalendario() {
    var y = st.mes.getFullYear(), m = st.mes.getMonth();
    var offset = new Date(y, m, 1).getDay();
    var total = new Date(y, m + 1, 0).getDate();
    var cab = DIAS.map(function (d) { return '<th scope="col">' + d + '</th>'; }).join('');
    var linhas = '', dia = 1 - offset;
    while (dia <= total) {
      var cels = '';
      for (var c = 0; c < 7; c++, dia++) {
        if (dia < 1 || dia > total) { cels += '<td></td>'; continue; }
        var d = new Date(y, m, dia);
        var ok = disponivel(d);
        var sel = st.dia && iso(st.dia) === iso(d);
        var rot = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + (ok ? '' : ', sem vaga');
        cels += '<td><button type="button" class="dia" data-act="dia" data-data="' + iso(d) + '"' +
          (ok ? ' aria-pressed="' + (sel ? 'true' : 'false') + '"' : ' disabled') +
          ' aria-label="' + esc(rot) + '">' + (sel ? ICON.check : '') + dia + '</button></td>';
      }
      linhas += '<tr>' + cels + '</tr>';
    }
    var antDes = st.mes <= mesAtual, proxDes = st.mes >= mesMax;
    return '<h1 id="titulo" tabindex="-1">Escolha o dia da consulta</h1>' +
      '<form data-form="dia" novalidate>' +
      '<div class="mes-nav">' +
      '<button type="button" class="btn" data-act="mes-ant"' + (antDes ? ' aria-disabled="true"' : '') + '>' + ICON.left + ' Mês anterior</button>' +
      '<h2 id="mes" aria-live="polite">' + mesTxt(st.mes) + '</h2>' +
      '<button type="button" class="btn" data-act="mes-prox"' + (proxDes ? ' aria-disabled="true"' : '') + '>Próximo mês ' + ICON.right + '</button></div>' +
      '<table class="cal" aria-labelledby="mes"><thead><tr>' + cab + '</tr></thead><tbody>' + linhas + '</tbody></table>' +
      '<p class="legenda" style="margin-top:1rem">' + ICON.check + ' dia escolhido. Número riscado e cinza: sem vaga (fins de semana e dias passados).</p>' +
      erroMsg('e-dia', st.erro) +
      '<p class="escolha" id="dia-escolhido" style="margin-top:1rem">' + (st.dia ? 'Dia escolhido: ' + esc(longo(st.dia)) : 'Nenhum dia escolhido ainda.') + '</p>' +
      '<div class="actions" style="margin-top:1.5rem">' + voltar() + '<button type="submit" class="btn btn-primary">Continuar</button></div></form>';
  }

  function grupoHoras(nome, lista) {
    var h = lista.map(function (t) {
      return '<label class="hora"><input type="radio" name="hora" value="' + t + '"' + (st.hora === t ? ' checked' : '') + '><span>' + t + '</span></label>';
    }).join('');
    return '<fieldset><legend class="legend">' + nome + '</legend><div class="horas">' + h + '</div></fieldset>';
  }

  function vHorario() {
    var tarde = st.mais ? TARDE.concat(TARDE_MAIS) : TARDE;
    return '<h1 id="titulo" tabindex="-1">Escolha o horário</h1>' +
      '<p class="lead">' + esc(longo(st.dia)) + '</p>' +
      '<form data-form="hora" novalidate>' +
      '<section class="clinica" aria-labelledby="cl-a"><h2 id="cl-a">Clínica de exemplo A</h2><p class="muted">Centro, Rio de Janeiro</p>' +
      grupoHoras('Manhã', MANHA) + grupoHoras('Tarde', tarde) +
      (st.mais ? '' : '<button type="button" class="btn btn-outline btn-wide" data-act="mais-horas">Ver mais horários da tarde</button>') +
      '<p class="aviso">Aviso: sábado e domingo não têm atendimento nesta clínica.</p></section>' +
      '<section class="clinica" style="margin-top:1rem" aria-labelledby="cl-b"><h2 id="cl-b">Clínica de exemplo B</h2>' +
      '<span class="badge badge-warn">' + ICON.warn + ' Sem agendamento pelo site</span>' +
      '<p>Esta clínica não marca consulta pelo site. Para marcar, fale com a clínica. Telefone de exemplo: (00) 0000-0000.</p>' +
      '<button type="button" class="btn btn-outline btn-wide" data-act="ver-clinica-a">Ver clínicas com horário livre</button></section>' +
      erroMsg('e-hora', st.erro) +
      '<div class="actions" style="margin-top:1.5rem">' + voltar() + '<button type="submit" class="btn btn-primary">Continuar</button></div></form>';
  }

  function resumo(comAlterar) {
    function linha(rot, val, passo) {
      return '<div><dt>' + rot + '</dt><dd><span>' + esc(val) + '</span>' +
        (comAlterar ? '<button type="button" class="btn" data-act="alterar" data-passo="' + passo + '" aria-label="Alterar ' + rot.toLowerCase() + '">Alterar</button>' : '') + '</dd></div>';
    }
    return '<dl class="resumo">' +
      linha('Especialidade', st.spec, 1) + linha('Local', st.loc, 2) +
      linha('Dia', longo(st.dia), 3) + linha('Horário', st.hora, 4) +
      '<div><dt>Clínica</dt><dd>' + esc(CLINICA) + '</dd></div></dl>';
  }

  function vConfirmar() {
    return '<h1 id="titulo" tabindex="-1">Confira e confirme</h1>' +
      '<p class="lead">Revise os dados. Você pode alterar qualquer um antes de confirmar.</p>' + resumo(true) +
      '<div class="actions">' + voltar() + '<button type="button" class="btn btn-primary" data-act="confirmar">Confirmar agendamento</button></div>';
  }

  function vErro() {
    return '<span class="badge badge-err">' + ICON.warn + ' Erro no agendamento</span>' +
      '<h1 id="titulo" tabindex="-1">Não conseguimos confirmar o agendamento</h1>' +
      '<p class="lead">O serviço de agendamento não respondeu. Isso não foi causado por você. Suas escolhas continuam salvas. Escolha o que prefere fazer agora.</p>' +
      '<button type="button" class="btn btn-primary btn-wide" data-act="confirmar">Tentar de novo</button>' +
      '<button type="button" class="btn btn-outline btn-wide" data-act="alterar" data-passo="4">Escolher outro horário</button>' +
      '<p><strong>Precisa de ajuda agora? Ligue <a href="tel:136">136</a> (Disque Saúde).</strong></p>';
  }

  function vSucesso() {
    return '<span class="badge badge-ok" role="status">' + ICON.check + ' Consulta agendada com sucesso</span>' +
      '<h1 id="titulo" tabindex="-1">Tudo certo com a sua consulta</h1>' + resumo(false) +
      '<div class="actions"><button type="button" class="btn btn-primary" data-act="novo">Agendar outra consulta</button></div>';
  }

  /* ---------- renderização ---------- */
  function render(opt) {
    opt = opt || {};
    var html, titulo, concluido = false, passo = st.step;
    if (st.view === 'ok') { html = vSucesso(); concluido = true; passo = 5; titulo = 'Consulta agendada com sucesso'; }
    else if (st.view === 'erro') { html = vErro(); passo = 5; titulo = 'Erro no agendamento'; }
    else {
      html = [vEtapa1, vEtapa2, vCalendario, vHorario, vConfirmar][st.step - 1]();
      titulo = 'Etapa ' + st.step + ' de 5: ' + STEPS[st.step - 1];
    }
    app.innerHTML = '<div class="card">' + etapas(passo, concluido) + html + '</div>';
    document.title = titulo + ' | Agenda Saúde';
    if (opt.anuncio !== false) statusEl.textContent = titulo;
    var alvo = opt.foco ? app.querySelector(opt.foco) : (opt.semFoco ? null : app.querySelector('#titulo'));
    if (alvo) alvo.focus({ preventScroll: !!opt.semRolagem });
  }

  /* ---------- navegação ---------- */
  function maxPasso() {
    if (!st.spec) return 1;
    if (!st.loc.trim()) return 2;
    if (!st.dia) return 3;
    if (!st.hora) return 4;
    return 5;
  }
  function hashDe() {
    if (st.view === 'ok') return '#confirmado';
    if (st.view === 'erro') return '#erro';
    return '#etapa-' + st.step;
  }
  function ir(passo, empilhar) {
    st.view = 'flow';
    st.step = Math.min(Math.max(passo, 1), maxPasso());
    st.erro = null;
    if (empilhar !== false) history.pushState(null, '', hashDe());
    render();
    window.scrollTo(0, 0);
  }
  function lerHash() {
    var h = location.hash;
    var m = /^#etapa-([1-5])$/.exec(h);
    if (m) { st.view = 'flow'; st.step = Math.min(+m[1], maxPasso()); }
    else if (h === '#confirmado' && st.hora) { st.view = 'ok'; }
    else if (h === '#erro' && st.hora) { st.view = 'erro'; }
    else { st.view = 'flow'; st.step = 1; }
    st.erro = null;
    render({ anuncio: true });
  }
  window.addEventListener('popstate', lerHash);

  /* ---------- eventos ---------- */
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'voltar') { ir(st.step - 1); }
    else if (a === 'alterar') { ir(+b.getAttribute('data-passo')); }
    else if (a === 'local-exemplo') {
      st.loc = 'Centro, Rio de Janeiro';
      st.erro = null;
      render({ foco: '#loc', anuncio: false });
      statusEl.textContent = 'Local preenchido com um exemplo: Centro, Rio de Janeiro.';
    }
    else if (a === 'mes-ant') {
      if (b.getAttribute('aria-disabled') === 'true') return;
      st.mes = new Date(st.mes.getFullYear(), st.mes.getMonth() - 1, 1);
      render({ foco: '[data-act="mes-ant"]', semRolagem: true, anuncio: false });
      statusEl.textContent = mesTxt(st.mes);
    }
    else if (a === 'mes-prox') {
      if (b.getAttribute('aria-disabled') === 'true') return;
      st.mes = new Date(st.mes.getFullYear(), st.mes.getMonth() + 1, 1);
      render({ foco: '[data-act="mes-prox"]', semRolagem: true, anuncio: false });
      statusEl.textContent = mesTxt(st.mes);
    }
    else if (a === 'dia') {
      var d = fromIso(b.getAttribute('data-data'));
      st.dia = d; st.hora = ''; st.erro = null;
      render({ foco: '[data-data="' + iso(d) + '"]', semRolagem: true, anuncio: false });
      statusEl.textContent = 'Dia escolhido: ' + longo(d);
    }
    else if (a === 'mais-horas') {
      st.mais = true;
      render({ foco: 'input[value="16:30"]', semRolagem: true, anuncio: false });
      statusEl.textContent = 'Mais três horários da tarde: 16:30, 17:00 e 17:30.';
    }
    else if (a === 'ver-clinica-a') {
      var alvo = app.querySelector('#cl-a');
      if (alvo) { alvo.setAttribute('tabindex', '-1'); alvo.focus(); }
    }
    else if (a === 'confirmar') {
      if (demo.checked) {
        demo.checked = false;
        st.view = 'erro';
      } else {
        st.view = 'ok';
      }
      history.pushState(null, '', hashDe());
      render();
      window.scrollTo(0, 0);
    }
    else if (a === 'novo') {
      st = { step: 1, view: 'flow', spec: '', loc: '', mes: mesAtual, dia: null, hora: '', mais: false, erro: null };
      history.pushState(null, '', hashDe());
      render();
      window.scrollTo(0, 0);
    }
  });

  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'spec') { st.spec = t.value; }
    else if (t.name === 'hora') { st.hora = t.value; }
  });
  app.addEventListener('input', function (e) {
    if (e.target.id === 'loc') { st.loc = e.target.value; }
  });

  app.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target.getAttribute('data-form');
    if (f === 'spec') {
      if (!st.spec) { st.erro = 'Escolha uma especialidade para continuar.'; render({ foco: 'input[name="spec"]' }); statusEl.textContent = st.erro; return; }
      ir(2);
    } else if (f === 'loc') {
      var v = (app.querySelector('#loc').value || '').trim();
      st.loc = v;
      if (!v) { st.erro = 'Informe o bairro, o CEP ou o endereço para continuar.'; render({ foco: '#loc' }); statusEl.textContent = st.erro; return; }
      ir(3);
    } else if (f === 'dia') {
      if (!st.dia) { st.erro = 'Escolha um dia disponível para continuar.'; render({ foco: '#e-dia' }); app.querySelector('#e-dia').setAttribute('tabindex', '-1'); app.querySelector('#e-dia').focus(); return; }
      ir(4);
    } else if (f === 'hora') {
      if (!st.hora) { st.erro = 'Escolha um horário para continuar.'; render({ semFoco: true }); var el = app.querySelector('#e-hora'); el.setAttribute('tabindex', '-1'); el.focus(); return; }
      ir(5);
    }
  });

  /* ---------- início ---------- */
  history.replaceState(null, '', '#etapa-1');
  render({ semFoco: true });
})();
