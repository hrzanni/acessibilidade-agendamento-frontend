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
    return { loc: '', mes: mesAtual, dia: null, hora: '', mais: false, done: { loc: false, dia: false, hora: false }, fim: false };
  }
  var st = novoEstado();

  function $(s) { return document.querySelector(s); }
  var elLoc = $('#loc'), elStatus = $('#status'), elDemo = $('#demo-falha');
  var elForm = $('#formulario'), elRes = $('#resultado');

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function mesTxt(d) { return MESES[d.getMonth()] + ' ' + d.getFullYear(); }
  function longo(d) { return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function disponivel(d) { var w = d.getDay(); return d > hoje && w !== 0 && w !== 6; }
  function anunciar(t) { elStatus.textContent = ''; setTimeout(function () { elStatus.textContent = t; }, 30); }
  function focar(el) {
    if (!el) return;
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'start' });
  }

  /* ---------- indicador de etapas ---------- */
  function etapaAtual() {
    var feitas = [true, st.done.loc, st.done.dia, st.done.hora, st.fim];
    for (var i = 0; i < 5; i++) if (!feitas[i]) return { n: i + 1, feitas: feitas, todas: false };
    return { n: 5, feitas: feitas, todas: true };
  }
  function renderEtapas(soHtml) {
    var e = etapaAtual();
    var itens = STEPS.map(function (nome, i) {
      var n = i + 1, feita = e.feitas[i];
      var cls = (feita || n === e.n) ? 'on' : '';
      var atual = n === e.n && !e.todas;
      if (atual) cls += ' atual';
      var marca = feita ? ICON.check + '<span class="sr-only"> concluída</span> ' : '';
      return '<li class="' + cls + '"' + (atual ? ' aria-current="step"' : '') + '><span class="barra"></span><span class="nome">' + marca + esc(nome) + '</span></li>';
    }).join('');
    var txt = e.todas ? 'Etapa 5 de 5: concluída' : 'Etapa ' + e.n + ' de 5<span class="so-estreito">: ' + esc(STEPS[e.n - 1]) + '</span>';
    var html = '<p class="etapa-txt">' + txt + '</p><nav aria-label="Etapas do agendamento"><ol class="steps">' + itens + '</ol></nav>';
    if (soHtml) return html;
    $('#etapas').innerHTML = html;
    return e.todas ? 'Etapa 5 de 5: concluída' : 'Etapa ' + e.n + ' de 5: ' + STEPS[e.n - 1];
  }

  /* ---------- calendário ---------- */
  function renderCal(foco) {
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
    $('#calendario').innerHTML =
      '<div class="mes-nav">' +
      '<button type="button" class="btn" data-act="mes-ant"' + (antDes ? ' aria-disabled="true"' : '') + '>' + ICON.left + ' Mês anterior</button>' +
      '<h3 id="mes" aria-live="polite">' + mesTxt(st.mes) + '</h3>' +
      '<button type="button" class="btn" data-act="mes-prox"' + (proxDes ? ' aria-disabled="true"' : '') + '>Próximo mês ' + ICON.right + '</button></div>' +
      '<table class="cal" aria-labelledby="mes"><thead><tr>' + cab + '</tr></thead><tbody>' + linhas + '</tbody></table>' +
      '<p class="legenda">Legenda: ' + ICON.check + ' escolhido · número riscado e cinza = sem vaga</p>' +
      '<p class="escolha">' + (st.dia ? 'Dia escolhido: ' + esc(longo(st.dia)) : 'Nenhum dia escolhido ainda.') + '</p>';
    if (foco) { var alvo = $(foco); if (alvo) alvo.focus({ preventScroll: true }); }
  }

  /* ---------- horários ---------- */
  function grupo(nome, lista) {
    var h = lista.map(function (t) {
      return '<label class="hora"><input type="radio" name="hora" value="' + t + '"' + (st.hora === t ? ' checked' : '') + '><span>' + t + '</span></label>';
    }).join('');
    return '<fieldset><legend class="legend">' + nome + '</legend><div class="horas">' + h + '</div></fieldset>';
  }
  function renderHoras(foco) {
    if (!st.dia) {
      $('#horarios').innerHTML = '<p class="aviso">Escolha um dia no calendário para ver os horários da Clínica de exemplo A.</p>';
      return;
    }
    var tarde = st.mais ? TARDE.concat(TARDE_MAIS) : TARDE;
    $('#horarios').innerHTML =
      '<p class="lead">Clínica de exemplo A · ' + esc(longo(st.dia)) + '</p>' +
      grupo('Manhã', MANHA) + grupo('Tarde', tarde) +
      (st.mais ? '' : '<button type="button" class="btn btn-outline btn-wide btn-ver-mais" data-act="mais-horas">Ver mais horários da tarde</button>') +
      '<p class="aviso">Aviso: sábado e domingo não têm atendimento nesta clínica.</p>';
    if (foco) { var alvo = $(foco); if (alvo) alvo.focus({ preventScroll: true }); }
  }

  /* ---------- resumo ---------- */
  function renderResumo() {
    function linha(rot, val, vazio) {
      return '<div><dt>' + rot + '</dt><dd>' + (val ? esc(val) : '<span class="vazio">' + vazio + '</span>') + '</dd></div>';
    }
    $('#resumo').innerHTML =
      linha('Especialidade', ESPECIALIDADE) +
      linha('Local', st.loc.trim(), 'Ainda não informado') +
      linha('Dia', st.dia ? longo(st.dia) : '', 'Ainda não escolhido') +
      linha('Horário', st.hora, 'Ainda não escolhido') +
      linha('Clínica', st.hora ? CLINICA : '', 'Escolha um horário');
  }

  function atualizar(msg) {
    var tx = renderEtapas();
    if (msg) anunciar(msg + ' ' + tx);
    renderResumo();
  }

  /* ---------- erros ---------- */
  function msgErro(id, texto) {
    return '<p class="erro-msg" id="' + id + '" role="alert">' + ICON.warn + '<span>' + esc(texto) + '</span></p>';
  }
  function limparErros() {
    $('#erros').innerHTML = ''; $('#erro-dia').innerHTML = ''; $('#erro-hora').innerHTML = ''; $('#erro-loc').innerHTML = '';
    elLoc.removeAttribute('aria-invalid');
    elLoc.setAttribute('aria-describedby', 'dica-loc');
  }
  function erroLoc() {
    $('#erro-loc').innerHTML = msgErro('e-loc', 'Informe o bairro, o CEP ou o endereço para continuar.');
    elLoc.setAttribute('aria-invalid', 'true');
    elLoc.setAttribute('aria-describedby', 'e-loc dica-loc');
  }

  /* ---------- continuar em cada cartão ---------- */
  function contLocal() {
    limparErros();
    if (!st.loc.trim()) { erroLoc(); focar(elLoc); return; }
    st.done.loc = true; atualizar('Local confirmado.');
    focar($('#h-dia'));
  }
  function contDia() {
    limparErros();
    if (!st.dia) { $('#erro-dia').innerHTML = msgErro('e-dia', 'Escolha um dia disponível para continuar.'); focar($('#e-dia')); return; }
    st.done.dia = true; atualizar('Dia confirmado.');
    focar($('#h-hora'));
  }
  function contHora() {
    limparErros();
    if (!st.dia) { $('#erro-hora').innerHTML = msgErro('e-hora', 'Escolha um dia no calendário antes de escolher o horário.'); focar($('#e-hora')); return; }
    if (!st.hora) { $('#erro-hora').innerHTML = msgErro('e-hora', 'Escolha um horário para continuar.'); focar($('#e-hora')); return; }
    st.done.hora = true; atualizar('Horário confirmado.');
    focar($('#h-confirmar'));
  }

  /* ---------- confirmar e resultados ---------- */
  function resumoFinal() {
    return '<dl class="resumo">' +
      '<div><dt>Especialidade</dt><dd>' + esc(ESPECIALIDADE) + '</dd></div>' +
      '<div><dt>Local</dt><dd>' + esc(st.loc.trim()) + '</dd></div>' +
      '<div><dt>Dia</dt><dd>' + esc(longo(st.dia)) + '</dd></div>' +
      '<div><dt>Horário</dt><dd>' + esc(st.hora) + '</dd></div>' +
      '<div><dt>Clínica</dt><dd>' + esc(CLINICA) + '</dd></div></dl>';
  }
  function mostrarSucesso() {
    elForm.hidden = true;
    elRes.innerHTML = '<div class="card">' + renderEtapas(true) + '<span class="badge badge-ok" role="status">' + ICON.check + ' Consulta agendada com sucesso</span>' +
      '<h1 id="res-titulo" tabindex="-1">Tudo certo com a sua consulta</h1>' + resumoFinal() +
      '<button type="button" class="btn btn-primary btn-wide" data-act="novo">Agendar outra consulta</button></div>';
    document.title = 'Consulta agendada com sucesso | Agenda Saúde';
    anunciar('Consulta agendada com sucesso. Etapa 5 de 5: concluída.');
    focar($('#res-titulo'));
    window.scrollTo(0, 0);
  }
  function mostrarErroServico() {
    elForm.hidden = false;
    elRes.innerHTML = '<div class="card"><span class="badge badge-err">' + ICON.warn + ' Erro no agendamento</span>' +
      '<h2 id="res-titulo" tabindex="-1">Não conseguimos abrir os agendamentos</h2>' +
      '<p class="lead">O serviço de agendamento não respondeu. Isso não foi causado por você. Suas escolhas continuam salvas. Escolha o que prefere fazer agora.</p>' +
      '<button type="button" class="btn btn-primary btn-wide" data-act="confirmar">Tentar de novo</button>' +
      '<a class="btn btn-outline btn-wide" href="' + UBS_URL + '" target="_blank" rel="noopener">Pesquisar a UBS mais próxima<span class="sr-only"> (abre em nova aba)</span></a>' +
      '<p class="lead"><strong>Precisa de ajuda agora? Ligue <a href="tel:136">136</a> (Disque Saúde).</strong></p></div>';
    document.title = 'Erro no agendamento | Agenda Saúde';
    anunciar('Erro no agendamento. Suas escolhas continuam salvas.');
    focar($('#res-titulo'));
    window.scrollTo(0, 0);
  }

  function confirmar() {
    limparErros();
    var falta = [];
    if (!st.loc.trim()) falta.push({ txt: 'Informe o bairro, o CEP ou o endereço', alvo: '#loc' });
    if (!st.dia) falta.push({ txt: 'Escolha um dia no calendário', alvo: '#h-dia' });
    else if (!st.hora) falta.push({ txt: 'Escolha um horário', alvo: '#h-hora' });
    if (falta.length) {
      var itens = falta.map(function (f) { return '<li><a href="#" data-alvo="' + f.alvo + '">' + esc(f.txt) + '</a></li>'; }).join('');
      $('#erros').innerHTML = '<div class="erro-msg" role="alert">' + ICON.warn + '<div><p>Para confirmar, falta:</p><ul>' + itens + '</ul></div></div>';
      if (!st.loc.trim()) erroLoc();
      focar($('#erros'));
      return;
    }
    elRes.innerHTML = '';
    if (elDemo.checked) { elDemo.checked = false; mostrarErroServico(); return; }
    st.done = { loc: true, dia: true, hora: true }; st.fim = true;
    renderEtapas();
    mostrarSucesso();
  }

  function novo() {
    st = novoEstado();
    elLoc.value = '';
    limparErros();
    elRes.innerHTML = '';
    elForm.hidden = false;
    $('#telefone').hidden = true; $('#btn-ligar').setAttribute('aria-expanded', 'false');
    renderCal(); renderHoras(); atualizar();
    document.title = 'Agendar consulta | Agenda Saúde';
    anunciar('Novo agendamento. Etapa 2 de 5: Local.');
    focar($('#titulo'));
    window.scrollTo(0, 0);
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-alvo]');
    if (link) { e.preventDefault(); focar($(link.getAttribute('data-alvo'))); return; }
    var b = e.target.closest('button, [data-act]');
    if (!b) return;
    var id = b.id, a = b.getAttribute('data-act');
    if (id === 'btn-local') {
      st.loc = 'Centro, Rio de Janeiro'; elLoc.value = st.loc; st.done.loc = false; limparErros(); atualizar();
      elLoc.focus({ preventScroll: true });
      anunciar('Local preenchido com um exemplo: Centro, Rio de Janeiro.');
    } else if (id === 'cont-local') { contLocal(); }
    else if (id === 'cont-dia') { contDia(); }
    else if (id === 'cont-hora') { contHora(); }
    else if (id === 'btn-confirmar' || a === 'confirmar') { confirmar(); }
    else if (id === 'btn-ligar') {
      var t = $('#telefone'), abrir = t.hidden;
      t.hidden = !abrir; b.setAttribute('aria-expanded', String(abrir));
    }
    else if (id === 'btn-livre') { focar($('#h-hora')); }
    else if (a === 'mes-ant' || a === 'mes-prox') {
      if (b.getAttribute('aria-disabled') === 'true') return;
      st.mes = new Date(st.mes.getFullYear(), st.mes.getMonth() + (a === 'mes-ant' ? -1 : 1), 1);
      renderCal('[data-act="' + a + '"]');
      anunciar(mesTxt(st.mes));
    }
    else if (a === 'dia') {
      var d = fromIso(b.getAttribute('data-data'));
      st.dia = d; st.hora = ''; st.done.dia = false; st.done.hora = false;
      limparErros();
      renderCal('[data-data="' + iso(d) + '"]'); renderHoras(); atualizar();
      anunciar('Dia escolhido: ' + longo(d) + '. Horários da Clínica de exemplo A abaixo.');
    }
    else if (a === 'mais-horas') {
      st.mais = true; renderHoras('input[value="16:30"]');
      anunciar('Mais três horários da tarde: 16:30, 17:00 e 17:30.');
    }
    else if (a === 'novo') { novo(); }
  });

  document.addEventListener('change', function (e) {
    if (e.target.name === 'hora') { st.hora = e.target.value; st.done.hora = false; limparErros(); atualizar(); }
  });
  elLoc.addEventListener('input', function () {
    var mudou = st.loc !== elLoc.value; st.loc = elLoc.value;
    if (mudou && st.done.loc) { st.done.loc = false; renderEtapas(); }
    renderResumo();
  });

  /* ---------- início ---------- */
  renderCal(); renderHoras(); atualizar();
})();
