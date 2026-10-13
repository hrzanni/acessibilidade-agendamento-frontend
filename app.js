(function () {
  'use strict';

  var MANHA = ['08:30', '09:30', '10:00'];
  var TARDE = ['15:15', '15:30', '16:00'];
  var TARDE_MAIS = ['16:30', '17:00', '17:30'];
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var ESPECIALIDADE = 'Clínica geral';
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

  var st = { loc: '', mes: mesAtual, dia: null, hora: '', mais: false };

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
  function focar(el, rolar) {
    if (!el) return;
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: rolar === false });
    if (rolar !== false && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
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
      '<p class="legenda">' + ICON.check + ' dia escolhido. Número riscado e cinza: sem vaga (fins de semana e dias passados).</p>' +
      '<p class="escolha">' + (st.dia ? 'Dia escolhido: ' + esc(longo(st.dia)) : 'Nenhum dia escolhido ainda.') + '</p>';
    if (foco) { var alvo = $(foco); if (alvo) alvo.focus({ preventScroll: true }); }
  }

  /* ---------- horários e clínicas ---------- */
  function grupo(nome, lista) {
    var h = lista.map(function (t) {
      return '<label class="hora"><input type="radio" name="hora" value="' + t + '"' + (st.hora === t ? ' checked' : '') + '><span>' + t + '</span></label>';
    }).join('');
    return '<fieldset><legend class="legend">' + nome + '</legend><div class="horas">' + h + '</div></fieldset>';
  }
  function renderHoras(foco) {
    var a;
    if (!st.dia) {
      a = '<p class="aviso">Escolha um dia no calendário para ver os horários da Clínica A.</p>';
    } else {
      var tarde = st.mais ? TARDE.concat(TARDE_MAIS) : TARDE;
      a = '<p class="muted">' + esc(longo(st.dia)) + '</p>' + grupo('Manhã', MANHA) + grupo('Tarde', tarde) +
        (st.mais ? '' : '<button type="button" class="btn btn-outline btn-wide" data-act="mais-horas">Ver mais horários da tarde</button>') +
        '<p class="aviso">Aviso: sábado e domingo não têm atendimento nesta clínica.</p>';
    }
    $('#horarios').innerHTML =
      '<div class="clinica"><h3 id="cl-a" tabindex="-1">Clínica de exemplo A</h3><p class="muted">Centro, Rio de Janeiro</p>' + a + '</div>' +
      '<div class="clinica"><h3 id="cl-b">Clínica de exemplo B</h3>' +
      '<span class="badge badge-warn">' + ICON.warn + ' Sem agendamento pelo site</span>' +
      '<p>Esta clínica não marca consulta pelo site. Para marcar, fale com a clínica. Telefone de exemplo: (00) 0000-0000.</p>' +
      '<button type="button" class="btn btn-outline btn-wide" data-act="ver-clinica-a">Ver clínicas com horário livre</button></div>';
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

  /* ---------- erros de preenchimento ---------- */
  function limparErros() {
    $('#erros').innerHTML = '';
    $('#erro-loc').innerHTML = '';
    elLoc.removeAttribute('aria-invalid');
    elLoc.setAttribute('aria-describedby', 'dica-loc');
  }
  function mostrarFaltas(falta) {
    var itens = falta.map(function (f) { return '<li><a href="#" data-alvo="' + f.alvo + '">' + esc(f.txt) + '</a></li>'; }).join('');
    $('#erros').innerHTML = '<div class="erro-msg" role="alert">' + ICON.warn + '<div><p>Para confirmar, falta:</p><ul>' + itens + '</ul></div></div>';
    if (!st.loc.trim()) {
      $('#erro-loc').innerHTML = '<p class="erro-msg" id="e-loc">' + ICON.warn + '<span>Informe o bairro, o CEP ou o endereço para continuar.</span></p>';
      elLoc.setAttribute('aria-invalid', 'true');
      elLoc.setAttribute('aria-describedby', 'e-loc dica-loc');
    }
    focar($('#erros'));
  }

  /* ---------- resultado ---------- */
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
    elRes.innerHTML = '<div class="card"><span class="badge badge-ok" role="status">' + ICON.check + ' Consulta agendada com sucesso</span>' +
      '<h2 id="res-titulo" tabindex="-1">Tudo certo com a sua consulta</h2>' + resumoFinal() +
      '<div class="actions"><button type="button" class="btn btn-primary" data-act="novo">Agendar outra consulta</button></div></div>';
    document.title = 'Consulta agendada com sucesso | Agenda Saúde';
    anunciar('Consulta agendada com sucesso');
    focar($('#res-titulo'));
    window.scrollTo(0, 0);
  }
  function mostrarErroServico() {
    elForm.hidden = false;
    elRes.innerHTML = '<div class="card"><span class="badge badge-err">' + ICON.warn + ' Erro no agendamento</span>' +
      '<h2 id="res-titulo" tabindex="-1">Não conseguimos confirmar o agendamento</h2>' +
      '<p class="lead">O serviço de agendamento não respondeu. Isso não foi causado por você. Suas escolhas continuam salvas. Escolha o que prefere fazer agora.</p>' +
      '<button type="button" class="btn btn-primary btn-wide" data-act="confirmar">Tentar de novo</button>' +
      '<button type="button" class="btn btn-outline btn-wide" data-act="outro-horario">Escolher outro horário</button>' +
      '<p><strong>Precisa de ajuda agora? Ligue <a href="tel:136">136</a> (Disque Saúde).</strong></p></div>';
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
    if (falta.length) { mostrarFaltas(falta); return; }
    elRes.innerHTML = '';
    if (elDemo.checked) { elDemo.checked = false; mostrarErroServico(); } else { mostrarSucesso(); }
  }

  function novo() {
    st = { loc: '', mes: mesAtual, dia: null, hora: '', mais: false };
    elLoc.value = '';
    limparErros();
    elRes.innerHTML = '';
    elForm.hidden = false;
    renderCal(); renderHoras(); renderResumo();
    document.title = 'Agendar consulta | Agenda Saúde';
    anunciar('Novo agendamento. Escolha o local, o dia e o horário.');
    focar($('#titulo'));
    window.scrollTo(0, 0);
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (e) {
    var alvoLink = e.target.closest('[data-alvo]');
    if (alvoLink) { e.preventDefault(); focar($(alvoLink.getAttribute('data-alvo'))); return; }
    var b = e.target.closest('[data-act], #btn-local, #btn-confirmar');
    if (!b) return;
    var a = b.getAttribute('data-act');
    if (b.id === 'btn-local') {
      st.loc = 'Centro, Rio de Janeiro'; elLoc.value = st.loc; limparErros(); renderResumo();
      elLoc.focus({ preventScroll: true });
      anunciar('Local preenchido com um exemplo: Centro, Rio de Janeiro.');
    } else if (b.id === 'btn-confirmar' || a === 'confirmar') {
      confirmar();
    } else if (a === 'mes-ant' || a === 'mes-prox') {
      if (b.getAttribute('aria-disabled') === 'true') return;
      st.mes = new Date(st.mes.getFullYear(), st.mes.getMonth() + (a === 'mes-ant' ? -1 : 1), 1);
      renderCal('[data-act="' + a + '"]');
      anunciar(mesTxt(st.mes));
    } else if (a === 'dia') {
      var d = fromIso(b.getAttribute('data-data'));
      st.dia = d; st.hora = '';
      limparErros();
      renderCal('[data-data="' + iso(d) + '"]'); renderHoras(); renderResumo();
      anunciar('Dia escolhido: ' + longo(d) + '. Horários da Clínica A disponíveis abaixo.');
    } else if (a === 'mais-horas') {
      st.mais = true; renderHoras('input[value="16:30"]');
      anunciar('Mais três horários da tarde: 16:30, 17:00 e 17:30.');
    } else if (a === 'ver-clinica-a') {
      focar(st.dia ? $('#cl-a') : $('#h-dia'));
      if (!st.dia) anunciar('Escolha um dia no calendário para ver os horários.');
    } else if (a === 'outro-horario') {
      elRes.innerHTML = '';
      document.title = 'Agendar consulta | Agenda Saúde';
      focar(st.dia ? $('#h-hora') : $('#h-dia'));
    } else if (a === 'novo') {
      novo();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.name === 'hora') { st.hora = e.target.value; limparErros(); renderResumo(); }
  });
  elLoc.addEventListener('input', function () { st.loc = elLoc.value; renderResumo(); });

  /* ---------- início ---------- */
  renderCal(); renderHoras(); renderResumo();
})();
