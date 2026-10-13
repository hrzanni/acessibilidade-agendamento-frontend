(function () {
  'use strict';

  var STEPS = ['Especialidade', 'Local', 'Dia', 'Horário', 'Confirmar'];
  var MANHA = ['08:30', '09:30', '10:00'];
  var TARDE = ['15:15', '15:30', '16:00'];
  var TARDE_MAIS = ['16:30', '17:00', '17:30'];
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var ESPECIALIDADE = 'Clínica geral';
  var CLINICA = 'Clínica de exemplo A, Centro';
  var UBS_URL = 'https://www.google.com/maps/search/?api=1&query=UBS%20mais%20pr%C3%B3xima';

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

  function novoEstado() {
    return { step: 2, view: 'flow', loc: '', mes: mesAtual, dia: null, hora: '', mais: false, tel: false, erro: null };
  }
  var st = novoEstado();

  var app = document.getElementById('app');
  var statusEl = document.getElementById('status');
  var demo = document.getElementById('demo-falha');

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function mesTxt(d) { return MESES[d.getMonth()] + ' ' + d.getFullYear(); }
  function longo(d) { return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function disponivel(d) { var w = d.getDay(); return d > hoje && w !== 0 && w !== 6; }
  function anunciar(t) { statusEl.textContent = ''; setTimeout(function () { statusEl.textContent = t; }, 30); }

  /* ---------- peças ---------- */
  function etapas(atual, concluido) {
    var itens = STEPS.map(function (nome, i) {
      var n = i + 1;
      var feita = concluido || n < atual;
      var cls = (feita || n === atual) ? 'on' : '';
      var ehAtual = n === atual && !concluido;
      if (ehAtual) cls += ' atual';
      var marca = feita ? ICON.check + '<span class="sr-only"> concluída</span> ' : '';
      return '<li class="' + cls + '"' + (ehAtual ? ' aria-current="step"' : '') + '><span class="barra"></span><span class="nome">' + marca + esc(nome) + '</span></li>';
    }).join('');
    var txt = concluido ? 'Etapa 5 de 5: concluída' : 'Etapa ' + atual + ' de 5<span class="so-estreito">: ' + esc(STEPS[atual - 1]) + '</span>';
    return '<div><p class="etapa-txt">' + txt + '</p><nav aria-label="Etapas do agendamento"><ol class="steps">' + itens + '</ol></nav></div>';
  }
  function erroMsg(id, msg) {
    if (!msg) return '';
    return '<p class="erro-msg" id="' + id + '" role="alert">' + ICON.warn + '<span>' + esc(msg) + '</span></p>';
  }
  function voltar() { return '<button type="button" class="btn" data-act="voltar">' + ICON.left + ' Voltar</button>'; }

  /* ---------- etapa 2: local ---------- */
  function vLocal() {
    var inv = st.erro ? ' aria-invalid="true" aria-describedby="e-loc"' : '';
    return '<h1 id="titulo" tabindex="-1">Onde você quer ser atendido?</h1>' +
      '<form data-form="loc" novalidate>' +
      '<div class="field"><label for="loc">Bairro, CEP ou endereço</label>' + erroMsg('e-loc', st.erro) +
      '<input class="input" type="text" id="loc" name="loc" placeholder="Exemplo: Centro, Rio de Janeiro" value="' + esc(st.loc) + '" autocomplete="off"' + inv + '></div>' +
      '<div class="field"><button type="button" class="btn btn-outline btn-wide" data-act="local-exemplo">Usar minha localização</button>' +
      '<p class="hint">Neste protótipo, o botão preenche um local de exemplo. Nenhuma localização é lida.</p></div>' +
      '<button type="submit" class="btn btn-primary btn-wide">Continuar</button>' +
      '<p class="nota">Se faltar algum dado, o botão continua ativo e a tela avisa o que preencher.</p></form>';
  }

  /* ---------- etapa 3: dia ---------- */
  function vDia() {
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
      '<h2 id="mes" class="mes-titulo" aria-live="polite">' + mesTxt(st.mes) + '</h2>' +
      '<button type="button" class="btn" data-act="mes-prox"' + (proxDes ? ' aria-disabled="true"' : '') + '>Próximo mês ' + ICON.right + '</button></div>' +
      '<table class="cal" aria-labelledby="mes"><thead><tr>' + cab + '</tr></thead><tbody>' + linhas + '</tbody></table>' +
      '<p class="legenda">Legenda: ' + ICON.check + ' escolhido · número riscado e cinza = sem vaga</p>' +
      erroMsg('e-dia', st.erro) +
      '<p class="escolha" id="dia-escolhido">' + (st.dia ? 'Dia escolhido: ' + esc(longo(st.dia)) : 'Nenhum dia escolhido ainda.') + '</p>' +
      '<div class="actions">' + voltar() + '<button type="submit" class="btn btn-primary">Continuar</button></div></form>';
  }

  /* ---------- etapa 4: horário ---------- */
  function grupo(nome, lista) {
    var h = lista.map(function (t) {
      return '<label class="hora"><input type="radio" name="hora" value="' + t + '"' + (st.hora === t ? ' checked' : '') + '><span>' + t + '</span></label>';
    }).join('');
    return '<fieldset><legend class="legend">' + nome + '</legend><div class="horas">' + h + '</div></fieldset>';
  }
  function vHorario() {
    var tarde = st.mais ? TARDE.concat(TARDE_MAIS) : TARDE;
    return '<h1 id="titulo" tabindex="-1">Escolha o horário</h1>' +
      '<form data-form="hora" novalidate>' +
      '<p class="lead" id="cl-a" tabindex="-1">Clínica de exemplo A · ' + esc(longo(st.dia)) + '</p>' +
      grupo('Manhã', MANHA) + grupo('Tarde', tarde) +
      (st.mais ? '' : '<button type="button" class="btn btn-outline btn-wide btn-ver-mais" data-act="mais-horas">Ver mais horários da tarde</button>') +
      '<p class="aviso">Aviso: sábado e domingo não têm atendimento nesta clínica.</p>' +
      '<section class="clinica" aria-labelledby="cl-b">' +
      '<span class="badge badge-warn">' + ICON.warn + ' Sem agendamento pelo site</span>' +
      '<h2 id="cl-b" class="sub">Esta clínica não marca consulta pelo site</h2>' +
      '<p>Para marcar, fale com a clínica. Você também pode ver outras clínicas que têm horário livre.</p>' +
      '<button type="button" class="btn btn-outline btn-wide" data-act="ligar" aria-expanded="' + st.tel + '" aria-controls="telefone">Ligar para a clínica</button>' +
      '<p id="telefone"' + (st.tel ? '' : ' hidden') + '>Telefone de exemplo: (00) 0000-0000</p>' +
      '<button type="button" class="btn btn-outline btn-wide" data-act="ver-clinica-a">Ver clínicas com horário livre</button></section>' +
      erroMsg('e-hora', st.erro) +
      '<div class="actions">' + voltar() + '<button type="submit" class="btn btn-primary">Continuar</button></div></form>';
  }

  /* ---------- etapa 5: confirmar ---------- */
  function resumo(comAlterar) {
    function linha(rot, val, passo) {
      return '<div><dt>' + rot + '</dt><dd><span>' + esc(val) + '</span>' +
        (comAlterar && passo ? '<button type="button" class="btn" data-act="alterar" data-passo="' + passo + '" aria-label="Alterar ' + rot.toLowerCase() + '">Alterar</button>' : '') + '</dd></div>';
    }
    return '<dl class="resumo">' + linha('Especialidade', ESPECIALIDADE, 0) + linha('Local', st.loc.trim(), 2) +
      linha('Dia', longo(st.dia), 3) + linha('Horário', st.hora, 4) + linha('Clínica', CLINICA, 0) + '</dl>';
  }
  function vConfirmar() {
    return '<h1 id="titulo" tabindex="-1">Confira e confirme</h1>' +
      '<p class="lead">Revise os dados. Você pode alterar qualquer um antes de confirmar.</p>' + resumo(true) +
      '<div class="actions">' + voltar() + '<button type="button" class="btn btn-primary" data-act="confirmar">Confirmar agendamento</button></div>';
  }
  function vErro() {
    return '<span class="badge badge-err">' + ICON.warn + ' Erro no agendamento</span>' +
      '<h1 id="titulo" tabindex="-1">Não conseguimos abrir os agendamentos</h1>' +
      '<p class="lead">O serviço de agendamento não respondeu. Isso não foi causado por você. Suas escolhas continuam salvas. Escolha o que prefere fazer agora.</p>' +
      '<button type="button" class="btn btn-primary btn-wide" data-act="confirmar">Tentar de novo</button>' +
      '<a class="btn btn-outline btn-wide" href="' + UBS_URL + '" target="_blank" rel="noopener">Pesquisar a UBS mais próxima<span class="sr-only"> (abre em nova aba)</span></a>' +
      '<p class="lead"><strong>Precisa de ajuda agora? Ligue <a href="tel:136">136</a> (Disque Saúde).</strong></p>';
  }
  function vSucesso() {
    return '<span class="badge badge-ok" role="status">' + ICON.check + ' Consulta agendada com sucesso</span>' +
      '<h1 id="titulo" tabindex="-1">Tudo certo com a sua consulta</h1>' + resumo(false) +
      '<button type="button" class="btn btn-primary btn-wide" data-act="novo">Agendar outra consulta</button>';
  }

  /* ---------- renderização ---------- */
  function render(opt) {
    opt = opt || {};
    var html, titulo, concluido = false, passo = st.step;
    if (st.view === 'ok') { html = vSucesso(); concluido = true; passo = 5; titulo = 'Consulta agendada com sucesso'; }
    else if (st.view === 'erro') { html = vErro(); passo = 5; titulo = 'Erro no agendamento'; }
    else {
      html = { 2: vLocal, 3: vDia, 4: vHorario, 5: vConfirmar }[st.step]();
      titulo = 'Etapa ' + st.step + ' de 5: ' + STEPS[st.step - 1];
    }
    app.innerHTML = '<div class="card">' + etapas(passo, concluido) + html + '</div>';
    document.title = titulo + ' | Agenda Saúde';
    if (opt.anuncio !== false) anunciar(titulo);
    var alvo = opt.foco ? app.querySelector(opt.foco) : (opt.semFoco ? null : app.querySelector('#titulo'));
    if (alvo) alvo.focus({ preventScroll: !!opt.semRolagem });
  }

  /* ---------- navegação ---------- */
  function maxPasso() {
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
    st.step = Math.min(Math.max(passo, 2), maxPasso());
    st.erro = null;
    if (empilhar !== false) history.pushState(null, '', hashDe());
    render();
    window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', function () {
    var h = location.hash, m = /^#etapa-([2-5])$/.exec(h);
    if (m) { st.view = 'flow'; st.step = Math.min(+m[1], maxPasso()); }
    else if (h === '#confirmado' && st.hora) { st.view = 'ok'; }
    else if (h === '#erro' && st.hora) { st.view = 'erro'; }
    else { st.view = 'flow'; st.step = 2; }
    st.erro = null;
    render();
  });

  /* ---------- eventos ---------- */
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'voltar') { ir(st.step - 1); }
    else if (a === 'alterar') { ir(+b.getAttribute('data-passo')); }
    else if (a === 'local-exemplo') {
      st.loc = 'Centro, Rio de Janeiro'; st.erro = null;
      render({ foco: '#loc', anuncio: false, semRolagem: true });
      anunciar('Local preenchido com um exemplo: Centro, Rio de Janeiro.');
    }
    else if (a === 'mes-ant' || a === 'mes-prox') {
      if (b.getAttribute('aria-disabled') === 'true') return;
      st.mes = new Date(st.mes.getFullYear(), st.mes.getMonth() + (a === 'mes-ant' ? -1 : 1), 1);
      render({ foco: '[data-act="' + a + '"]', semRolagem: true, anuncio: false });
      anunciar(mesTxt(st.mes));
    }
    else if (a === 'dia') {
      var d = fromIso(b.getAttribute('data-data'));
      st.dia = d; st.hora = ''; st.erro = null;
      render({ foco: '[data-data="' + iso(d) + '"]', semRolagem: true, anuncio: false });
      anunciar('Dia escolhido: ' + longo(d));
    }
    else if (a === 'mais-horas') {
      st.mais = true;
      render({ foco: 'input[value="16:30"]', semRolagem: true, anuncio: false });
      anunciar('Mais três horários da tarde: 16:30, 17:00 e 17:30.');
    }
    else if (a === 'ligar') {
      st.tel = !st.tel;
      render({ foco: '[data-act="ligar"]', semRolagem: true, anuncio: false });
    }
    else if (a === 'ver-clinica-a') { var c = app.querySelector('#cl-a'); if (c) { c.focus(); c.scrollIntoView({ block: 'center' }); } }
    else if (a === 'confirmar') {
      if (demo.checked) { demo.checked = false; st.view = 'erro'; } else { st.view = 'ok'; }
      history.pushState(null, '', hashDe());
      render();
      window.scrollTo(0, 0);
    }
    else if (a === 'novo') {
      st = novoEstado();
      history.pushState(null, '', hashDe());
      render();
      window.scrollTo(0, 0);
    }
  });

  app.addEventListener('change', function (e) { if (e.target.name === 'hora') { st.hora = e.target.value; } });
  app.addEventListener('input', function (e) { if (e.target.id === 'loc') { st.loc = e.target.value; } });

  app.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target.getAttribute('data-form');
    if (f === 'loc') {
      var v = (app.querySelector('#loc').value || '').trim();
      st.loc = v;
      if (!v) { st.erro = 'Informe o bairro, o CEP ou o endereço para continuar.'; render({ foco: '#loc', anuncio: false }); anunciar(st.erro); return; }
      ir(3);
    } else if (f === 'dia') {
      if (!st.dia) { st.erro = 'Escolha um dia disponível para continuar.'; render({ semFoco: true, anuncio: false }); var ed = app.querySelector('#e-dia'); ed.setAttribute('tabindex', '-1'); ed.focus(); return; }
      ir(4);
    } else if (f === 'hora') {
      if (!st.hora) { st.erro = 'Escolha um horário para continuar.'; render({ semFoco: true, anuncio: false }); var eh = app.querySelector('#e-hora'); eh.setAttribute('tabindex', '-1'); eh.focus(); return; }
      ir(5);
    }
  });

  /* ---------- início ---------- */
  history.replaceState(null, '', '#etapa-2');
  render({ semFoco: true });
})();
