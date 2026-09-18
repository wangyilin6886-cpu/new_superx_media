/* ============================================================
   SuperX · 登录页交互
   外观演示：不校验真实凭据，任何合法邮箱 + 8 位以上密码即可进入。
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  // 已登录直接放行，回到来处
  var next = new URLSearchParams(location.search).get('next') || 'studio.html';
  if (/^https?:|^\/\//i.test(next)) next = 'studio.html';   // 只允许站内相对地址

  var mode = 'in';   // in = 登录，up = 注册

  /* ---------- 视图切换 ---------- */
  function showView(id) {
    $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === id); });
  }

  $$('#segTabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-view');
      $$('#segTabs button').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-selected', String(on));
      });
      $('#authTitle').textContent = mode === 'in' ? '欢迎回来' : '创建账号';
      $('#authLead').textContent = mode === 'in' ? '登录后继续你的创作。' : '新账号赠 20 条免费额度，无需信用卡。';
      $('#submitBtn').textContent = mode === 'in' ? '登录' : '创建账号';
      $('#fName').hidden = mode === 'in';
      $('#rowIn').hidden = mode !== 'in';
      $('#rowUp').hidden = mode === 'in';
      $('#password').setAttribute('autocomplete', mode === 'in' ? 'current-password' : 'new-password');
      $('#password').placeholder = mode === 'in' ? '至少 8 位' : '设置一个至少 8 位的密码';
      clearErrors();
    });
  });

  $('#toForgot').addEventListener('click', function (e) { e.preventDefault(); showView('viewForgot'); });
  $('#backToLogin').addEventListener('click', function (e) { e.preventDefault(); showView('viewAuth'); });
  $('#backToLogin2').addEventListener('click', function (e) { e.preventDefault(); showView('viewAuth'); });
  $('#resend').addEventListener('click', function (e) {
    e.preventDefault();
    e.target.textContent = '已重新发送';
    setTimeout(function () { e.target.textContent = '重新发送'; }, 2600);
  });

  /* ---------- 密码显隐 ---------- */
  $('#peek').addEventListener('click', function () {
    var p = $('#password'), show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    this.textContent = show ? '隐藏' : '显示';
    this.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
    p.focus();
  });

  /* ---------- 校验 ---------- */
  function setErr(fieldId, msg) {
    var f = $(fieldId);
    f.classList.add('err');
    if (msg) f.querySelector('.msg').textContent = msg;
  }
  function clearErrors() {
    $$('.field').forEach(function (f) { f.classList.remove('err'); });
    $('#note').classList.remove('on');
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

  function loading(btn, on, label) {
    btn.disabled = on;
    btn.innerHTML = on ? '<span class="spinner"></span> 处理中…' : label;
  }

  /* ---------- 登录 / 注册提交 ---------- */
  $('#authForm').addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var name = $('#name').value.trim();
    var email = $('#email').value.trim();
    var pass = $('#password').value;
    var bad = false;

    if (mode === 'up' && !name) { setErr('#fName'); bad = true; }
    if (!validEmail(email)) { setErr('#fEmail'); bad = true; }
    if (pass.length < 8) { setErr('#fPass'); bad = true; }
    if (mode === 'up' && !$('#agree').checked) {
      $('#note').textContent = '请先勾选同意服务条款。';
      $('#note').classList.add('on');
      bad = true;
    }
    if (bad) {
      var first = document.querySelector('.field.err input');
      if (first) first.focus();
      return;
    }

    var btn = $('#submitBtn'), label = btn.textContent;
    loading(btn, true, label);
    setTimeout(function () {
      window.SuperXAuth.signIn(email, mode === 'up' ? name : '');
      location.href = next;
    }, 850);
  });

  /* ---------- 忘记密码 ---------- */
  $('#forgotForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#resetEmail').value.trim();
    $('#fReset').classList.remove('err');
    if (!validEmail(v)) { setErr('#fReset'); $('#resetEmail').focus(); return; }
    var btn = $('#resetBtn');
    loading(btn, true, '发送重置链接');
    setTimeout(function () {
      loading(btn, false, '发送重置链接');
      $('#sentTo').textContent = v;
      showView('viewSent');
    }, 800);
  });

  /* ---------- 第三方登录（占位） ---------- */
  $$('[data-oauth]').forEach(function (b) {
    b.addEventListener('click', function () {
      var who = b.getAttribute('data-oauth');
      var old = b.innerHTML;
      b.disabled = true;
      b.innerHTML = '<span class="spinner" style="border-color:rgba(255,255,255,.3);border-top-color:#fff"></span> 正在跳转 ' + who + '…';
      setTimeout(function () {
        window.SuperXAuth.signIn('demo@' + who.toLowerCase() + '.com', who + ' 用户');
        location.href = next;
      }, 900);
    });
  });

  // 邮箱先聚焦
  $('#email').focus();
})();
