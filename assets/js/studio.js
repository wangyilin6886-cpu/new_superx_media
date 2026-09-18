/* ============================================================
   SuperX Studio · 交互
   壳（左栏 / 对话流 / 输入区 / 状态规范）四个模式共用，
   每个模式只提供：空状态、参数、对话剧本、右栏工作台。
   外观演示：全部为本地假数据，不发任何网络请求。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); };
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); }
  function fmt(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }

  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  /* ============================================================
     模式注册
     ============================================================ */
  var MODES = {
    video:     { name: 'AI 短视频', chat: '冬季新品投放', ask: '你想做什么样的短视频？', ready: true },
    drama:     { name: 'AI 短剧',   chat: '《雨夜之后》', ask: '你想做一部什么样的短剧？', ready: true },
    education: { name: 'AI 教育',   chat: '新课程',       ask: '你想做哪一门课？' },
    app:       { name: 'AI App',    chat: '团队周报工具', ask: '你想做一个什么应用？', ready: true }
  };
  var mode = new URLSearchParams(location.search).get('mode');
  if (!MODES[mode]) mode = 'video';
  var M = MODES[mode];

  document.body.setAttribute('data-mode', mode);
  document.title = 'SuperX Studio · ' + M.name;
  $('#chatTitle').textContent = M.chat;
  $('.empty .dot-title').innerHTML = '<i></i>' + M.ask;

  /* ============================================================
     壳
     ============================================================ */
  var isNarrow = function () { return window.innerWidth <= 768; };

  $('#navToggle').addEventListener('click', function () {
    if (isNarrow()) document.body.classList.remove('nav-open');
    else document.body.classList.toggle('nav-collapsed');
  });
  $('#navOpen').addEventListener('click', function () { document.body.classList.add('nav-open'); });
  $('#scrim').addEventListener('click', function () { document.body.classList.remove('nav-open'); });

  function setSide(open) { document.body.classList.toggle('side-collapsed', !open); }
  $('#sideToggle').addEventListener('click', function () { setSide(document.body.classList.contains('side-collapsed')); });
  $('#sideClose').addEventListener('click', function () { setSide(false); });
  $('#sideOpen').addEventListener('click', function () { setSide(true); });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); setSide(document.body.classList.contains('side-collapsed')); }
  });

  function applyWidth() { $('#navOpen').style.display = isNarrow() ? 'grid' : 'none'; }
  applyWidth();
  window.addEventListener('resize', applyWidth);
  if (window.innerWidth <= 1024) setSide(false);

  /* ---------- 登录态 ---------- */
  var Auth = window.SuperXAuth;
  var nextUrl = 'studio.html' + (mode === 'video' ? '' : '?mode=' + mode);
  var loginUrl = 'login.html?next=' + encodeURIComponent(nextUrl);

  function renderFoot() {
    var u = Auth.get(), host = $('#navFoot');
    if (u) {
      var pct = Math.round(u.quota.used / u.quota.total * 100);
      host.innerHTML =
        '<div class="user-row"><div class="avatar avatar-txt">' + Auth.initial(u) + '</div>' +
        '<div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:500;overflow:hidden;' +
        'text-overflow:ellipsis;white-space:nowrap">' + esc(u.name) + '</div>' +
        '<div class="dim" style="font-size:11px">' + u.plan + ' · ' + u.quota.used + '/' + u.quota.total + ' 额度</div></div>' +
        '<button class="signout" id="signOut" title="退出登录">退出</button></div>' +
        '<div class="quota"><i style="width:' + pct + '%"></i></div>' +
        '<button class="upgrade">🚀 升级到创作者</button>';
      $('#signOut').addEventListener('click', function () {
        Auth.signOut(); renderFoot(); toast('已退出登录');
      });
    } else {
      host.innerHTML =
        '<p class="anon">未登录 · 可以随便逛，<br>生成时再登录就行。</p>' +
        '<a class="signin-btn" href="' + loginUrl + '">登录 / 注册</a>';
    }
  }
  renderFoot();

  /* ---------- 未登录拦截 ---------- */
  var gate = document.createElement('div');
  gate.className = 'modal-scrim';
  gate.innerHTML =
    '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="gateTitle">' +
    '<h3 id="gateTitle">登录后开始生成</h3>' +
    '<p>生成会消耗额度，所以需要一个账号。新账号赠 20 条免费额度，无需信用卡。</p>' +
    '<div class="acts"><a class="go" href="' + loginUrl + '">去登录 / 注册</a>' +
    '<button class="later" id="gateLater">先看一遍演示（不消耗额度）</button></div></div>';
  document.body.appendChild(gate);

  function closeGate() { gate.classList.remove('on'); }
  gate.addEventListener('click', function (e) { if (e.target === gate) closeGate(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeGate(); });

  // 模式菜单
  var modeMenu = $('#modeMenu'), newChat = $('#newChat');
  newChat.addEventListener('click', function (e) {
    e.stopPropagation();
    var r = newChat.getBoundingClientRect();
    modeMenu.style.left = r.left + 'px';
    modeMenu.style.top = (r.bottom + 6) + 'px';
    modeMenu.classList.toggle('open');
  });
  document.addEventListener('click', function () { modeMenu.classList.remove('open'); });
  $$('#modeMenu button').forEach(function (b) {
    b.addEventListener('click', function () { location.href = 'studio.html?mode=' + b.getAttribute('data-mode'); });
  });

  // 项目树
  $$('[data-folder]').forEach(function (f) {
    f.addEventListener('click', function () {
      f.classList.toggle('open');
      var files = f.nextElementSibling;
      if (files && files.hasAttribute('data-files')) files.hidden = !f.classList.contains('open');
    });
  });
  $$('.chat-item').forEach(function (c) {
    c.addEventListener('click', function () {
      $$('.chat-item').forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      $('#chatTitle').textContent = c.querySelector('.t').textContent;
      if (isNarrow()) document.body.classList.remove('nav-open');
    });
  });

  // 单选按钮组（参数面板 / 设置 Tab 通用）
  function bindSegs(root) {
    $$('.seg[data-single]', root).forEach(function (seg) {
      if (seg.dataset.bound) return;
      seg.dataset.bound = '1';
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        $$('button', seg).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
  }

  /* ---------- 右栏 Tab ---------- */
  var TABS = {
    video: [['clips', '成片'], ['scripts', '脚本'], ['assets', '素材'], ['settings', '设置']],
    drama: [['eps', '剧集'], ['script', '剧本'], ['cast', '角色'], ['settings', '设置']],
    education: [['out', '产出'], ['settings', '设置']],
    app: [['preview', '预览'], ['code', '代码'], ['db', '数据库'], ['deploy', '部署']]
  };
  var tabsHost = $('#tabs'), sideBody = $('#sideBody');
  TABS[mode].forEach(function (t, i) {
    var b = el('<button class="tab' + (i === 0 ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '<span class="n"></span></button>');
    b.addEventListener('click', function () { openTab(t[0], true); });
    tabsHost.appendChild(b);
    var p = el('<div class="panel' + (i === 0 ? ' on' : '') + '" data-panel="' + t[0] + '"></div>');
    sideBody.appendChild(p);
  });
  function panel(name) { return $('.panel[data-panel="' + name + '"]'); }
  function tabCount(name, n) { var t = $('.tab[data-tab="' + name + '"] .n'); if (t) t.textContent = n ? ' ' + n : ''; }

  // reveal=true 才强制展开；窄屏自动展开会盖住对话
  function openTab(name, reveal) {
    $$('.tab').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-tab') === name); });
    $$('.panel').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-panel') === name); });
    $('#gridToggle').style.display = (mode === 'video' && name === 'clips') ? 'grid' : 'none';
    if (reveal || window.innerWidth > 1024) setSide(true);
  }

  /* ---------- 输入区 ---------- */
  var input = $('#input'), chips = $('#chips');
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } });

  function addChip(text) {
    if ($$('.chip-a', chips).some(function (c) { return c.textContent.indexOf(text.slice(2, 10)) > -1; })) return;
    var c = el('<span class="chip-a">' + text + '<button aria-label="移除">✕</button></span>');
    c.querySelector('button').addEventListener('click', function () { c.remove(); });
    chips.appendChild(c);
  }
  $('#addBtn').addEventListener('click', function () {
    addChip(mode === 'drama' ? '📄 故事梗概.docx' : '🔗 shopee.co.id/p/8823…');
  });
  $('#atBtn').addEventListener('click', function () {
    input.value += (input.value ? ' ' : '') + (mode === 'drama' ? '@Maya ' : '@脚本③ ');
    input.focus(); autosize();
    toast(mode === 'drama' ? '可以 @ 角色、某一集、剧本或世界观设定' : '可以 @ 脚本、成片、角色或品牌知识库');
  });
  $('#paramBtn').addEventListener('click', function () {
    var open = $('#params').classList.toggle('open');
    $('#paramBtn').classList.toggle('on', open);
  });

  /* ---------- 对话流基础件 ---------- */
  var thread = $('#thread'), inner = $('#threadInner');
  function scrollDown() { thread.scrollTop = thread.scrollHeight; }
  function push(node) { inner.appendChild(node); scrollDown(); return node; }

  function userMsg(text, attach) {
    var a = (attach || []).map(function (t) { return '<span class="attach">' + t + '</span>'; }).join('');
    return push(el('<div class="msg msg-user"><div class="bubble">' + esc(text) + a + '</div></div>'));
  }
  function agentBlock() {
    return push(el('<div class="msg"><div class="agent-head"><span class="mark"></span>SuperX</div></div>'));
  }
  function addStep(block, label, detailHtml) {
    var step = el(
      '<div class="step"><button class="step-row"><span class="st run">◌</span><span class="lb">' + label + '</span>' +
      '<span class="dur"></span><span class="tw">' + (detailHtml ? '▸' : '') + '</span></button>' +
      (detailHtml ? '<div class="step-detail">' + detailHtml + '</div>' : '') + '</div>');
    if (detailHtml) step.querySelector('.step-row').addEventListener('click', function () { step.classList.toggle('open'); });
    block.appendChild(step); scrollDown();
    return { done: function (sec) {
      var st = step.querySelector('.st');
      st.classList.remove('run'); st.textContent = '✓';
      step.querySelector('.dur').textContent = sec + 's';
    } };
  }
  function say(block, html, cls) { var p = el('<p class="say ' + (cls || '') + '">' + html + '</p>'); block.appendChild(p); scrollDown(); return p; }
  function add(block, html) { var n = el(html); block.appendChild(n); scrollDown(); return n; }

  function artifactCard(block, icon, title, bodyHtml, tab) {
    var c = add(block,
      '<div class="artifact"><div class="artifact-head">' + icon + ' ' + title +
      '<span class="open">查看 →</span></div><div class="artifact-body">' + bodyHtml + '</div></div>');
    c.addEventListener('click', function () { openTab(tab, true); });
    return c;
  }

  function quickReplies(block, items, handler) {
    var q = add(block, '<div class="quick">' + items.map(function (i) {
      return '<button data-q="' + i[0] + '">' + i[1] + (i[2] ? ' <span class="dim">· ' + i[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>');
    $$('button', q).forEach(function (b) {
      b.addEventListener('click', function () { q.remove(); handler(b.getAttribute('data-q')); });
    });
    return q;
  }

  function report(block, title, items, credits) {
    add(block, '<div class="report"><b>' + title + '</b><ul>' +
      items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>');
    add(block, '<div class="done-bar"><span class="st">✓</span> 全部任务已完成' +
      '<span style="margin-left:auto;color:var(--text-3)">消耗 ' + credits + ' 额度</span></div>');
    var acts = add(block, '<div class="msg-acts"><button data-a="copy">⧉ 复制</button>' +
      '<button data-a="dl">⤓ 全部下载</button></div>');
    $$('button', acts).forEach(function (ab) {
      ab.addEventListener('click', function () {
        toast(ab.getAttribute('data-a') === 'copy' ? '已复制汇报内容' : '开始下载…（外观稿未接入）');
      });
    });
  }

  /* ---------- 发送 ---------- */
  var state = { started: false, running: false, abort: false };
  var sendBtn = $('#send');
  function setRunning(on) {
    state.running = on;
    sendBtn.textContent = on ? '⏹' : '↑';
    sendBtn.classList.toggle('stop', on);
    sendBtn.setAttribute('aria-label', on ? '停止' : '发送');
  }
  sendBtn.addEventListener('click', onSend);

  var gateSeen = false;
  function onSend() {
    if (state.running) { state.abort = true; return; }
    if (!M.ready) { toast('「' + M.name + '」模式的工作台还没做，可以先看短视频 / 短剧 / AI App'); return; }
    // 未登录：第一次点生成时拦一下，但允许继续看演示
    if (!Auth.isIn() && !gateSeen) {
      gate.classList.add('on');
      $('#gateLater').onclick = function () { gateSeen = true; closeGate(); onSend(); };
      return;
    }
    var text = input.value.trim() || IMPL.defaultPrompt;
    var attach = $$('.chip-a', chips).map(function (c) { return c.textContent.replace('✕', '').trim(); });
    input.value = ''; autosize(); chips.innerHTML = '';
    $('#params').classList.remove('open'); $('#paramBtn').classList.remove('on');
    if (!state.started) {
      state.started = true;
      $('#empty').remove();
      inner.hidden = false;
      if (window.innerWidth > 1024) setSide(true);
    }
    state.abort = false;
    IMPL.run(text, attach);
  }
  function stopped() {
    setRunning(false);
    say(agentBlock(), '已停止。已生成的内容都保留了，没有扣额度。', 'small');
  }

  /* ---------- 假播放（两种模式共用一个计时器） ---------- */
  var play = { on: false, t: 0, timer: null };
  function stopPlay() { play.on = false; if (play.timer) { clearInterval(play.timer); play.timer = null; } }
  function togglePlay(dur, tick, btn) {
    if (play.on) { stopPlay(); btn.textContent = '▶'; return; }
    play.on = true; btn.textContent = '❚❚';
    if (play.t >= dur) play.t = 0;
    play.timer = setInterval(function () {
      play.t += 0.1;
      if (play.t >= dur) { play.t = dur; stopPlay(); if (btn.isConnected) btn.textContent = '▶'; }
      if (!tick(play.t)) stopPlay();
    }, 100);
  }

  /* ============================================================
     模式一 · AI 短视频
     ============================================================ */
  var VIDEO = (function () {
    var SCRIPTS = [
      { n: '①', hook: '换季爆皮的姐妹进来', style: '痛点式 · 16s',
        body: '换季爆皮的姐妹进来，这瓶真的救我。它的玻尿酸浓度是同价位的三倍，质地是水感的，油皮也不闷痘。我连续用了两周，鼻翼那块再没起过皮。现在下单还送同系列小样。' },
      { n: '②', hook: '这瓶我空瓶三次了', style: '测评式 · 15s',
        body: '这瓶我空瓶三次了，说点真实的。第一，它不黏；第二，上妆前用不搓泥；第三，一瓶能用两个月。缺点也有，味道偏淡，喜欢香香的可能会失望。' },
      { n: '③', hook: '别再买贵的了', style: '对比式 · 18s',
        body: '别再买贵的了。左边这瓶四百八，右边这瓶九十九，我拿仪器测了八小时补水率——差距不到百分之五。成分表我放在评论区，自己看。' },
      { n: '④', hook: '成分党看过来', style: '清单式 · 15s',
        body: '成分党看过来，三个关键点：五重玻尿酸复配、零香精零酒精、pH 值 5.5 贴近皮肤。敏感肌可以闭眼入，我给我妈也买了一瓶。' },
      { n: '⑤', hook: '油皮姐妹的救星', style: '故事式 · 17s',
        body: '去年这个时候我还在为夏天出油冬天爆皮发愁，试了七八瓶都不对。直到用上这个——它是水感的，油皮不闷，干皮也够。现在我梳妆台上常年备两瓶。' }
    ];
    var CLIPS = [
      { id: 1, name: '换季爆皮的姐妹进来', dur: 16, tint: ['#5A1E2C', '#24101A'] },
      { id: 2, name: '这瓶我空瓶三次了',   dur: 15, tint: ['#4A2038', '#1C0F1A'] },
      { id: 3, name: '别再买贵的了',       dur: 18, tint: ['#3E1A2A', '#180B12'] },
      { id: 4, name: '成分党看过来',       dur: 0,  tint: ['#2A1A1E', '#140A0C'] },
      { id: 5, name: '油皮姐妹的救星',     dur: 17, tint: ['#54202E', '#20101A'] }
    ];
    var BASE = [
      { n: '01', end: 3,  visual: '痛点开场：模特面部特写，皮肤起皮', vo: '换季爆皮的姐妹进来，这瓶真的救我', sub: '换季爆皮的姐妹进来' },
      { n: '02', end: 6,  visual: '产品特写，手部涂抹',               vo: '它的玻尿酸浓度是同价位的三倍',   sub: '玻尿酸浓度 ×3' },
      { n: '03', end: 9,  visual: '质地展示，挑起拉丝',               vo: '质地是水感的，油皮也不闷痘',     sub: '水感质地 · 不闷痘' },
      { n: '04', end: 13, visual: '使用前后对比分屏',                 vo: '我连续用了两周，鼻翼那块再没起过皮', sub: '连用 2 周对比' },
      { n: '05', end: 16, visual: '产品定格 + 价格贴片',              vo: '现在下单还送同系列小样',         sub: '下单送小样' }
    ];
    var ASSETS = [
      ['产品主图', '#4A1A24'], ['模特特写', '#3A2030'], ['质地微距', '#2C2440'],
      ['使用场景', '#203040'], ['对比图 A', '#3A2418'], ['空镜 · 窗边', '#1E2E2A'],
      ['成分表', '#2A2A38'], ['包装盒', '#402030'], ['BGM 轻快电子', '#1A2438']
    ];

    var s = { clips: [], selClip: 1, selShot: 0, grid: false, sel: {} };

    function shotsFor(c) {
      var r = c.dur / 16, prev = 0;
      return BASE.map(function (b) {
        var end = Math.round(b.end * r * 10) / 10;
        var o = Object.assign({}, b, { start: prev, endT: end });
        prev = end; return o;
      });
    }

    function renderEmpty(host) {
      host.innerHTML =
        '<div class="empty-label" style="margin-top:0">从这些开始 ——</div>' +
        '<div class="starter-grid">' +
          '<button class="starter" data-s="link"><div class="ico">🔗</div><b>商品链接出片</b><span>粘贴 Shopee / Tokopedia / Lazada 链接</span></button>' +
          '<button class="starter" data-s="copy"><div class="ico">📝</div><b>一段文案出片</b><span>已经写好卖点了，直接排片</span></button>' +
          '<button class="starter" data-s="ref"><div class="ico">🎯</div><b>竞品同款</b><span>发一条参考视频，做同结构的</span></button>' +
        '</div>' +
        '<div class="empty-label">或者看看别人怎么做的（点开能看到完整对话，含原始 prompt）：</div>' +
        '<div class="sample-row">' +
          [['美妆 · 成本 -72%', '#4A1A24,#170C12'], ['3C · 测评式', '#16283F,#0B1220'],
           ['食品 · 口播', '#3F2A12,#1A1208'], ['服饰 · 穿搭', '#2C1840,#140B1E']].map(function (x) {
            return '<button class="sample"><div class="cov" style="background:linear-gradient(160deg,' + x[1] + ')"></div><div class="nm">' + x[0] + '</div></button>';
          }).join('') +
        '</div>';
      $$('.starter', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-s');
          if (k === 'link') { addChip('🔗 shopee.co.id/p/8823…'); input.value = '用这个链接做 5 条投放素材，主打保湿，要痛点式开场'; }
          if (k === 'copy') { input.value = '这段文案帮我做成 5 条短视频：五重玻尿酸复配、零香精零酒精、pH 5.5…'; }
          if (k === 'ref') { addChip('🎬 参考视频.mp4'); input.value = '照这条的结构做 5 条同款，换成我的产品'; }
          autosize(); input.focus();
        });
      });
      $$('.sample', host).forEach(function (b) {
        b.addEventListener('click', function () { toast('样例：完整对话记录 + 原始 prompt（外观稿未接入）'); });
      });
    }

    function renderParams(host) {
      host.innerHTML =
        row('平台', ['TikTok*', 'Instagram Reels', 'YouTube Shorts', 'Facebook']) +
        row('时长', ['15s', '15–30s*', '60s']) +
        row('口播风格', ['痛点式*', '测评式', '故事式', '对比式', '清单式']) +
        row('音色', ['温柔女声*', '活力女声', '沉稳男声', '克隆我的声音']) +
        row('批量', ['3 条', '5 条*', '10 条', '30 条']);
      bindSegs(host);
    }

    async function run(text, attach) {
      setRunning(true);
      userMsg(text, attach.length ? attach : ['🔗 shopee.co.id/p/8823…']);
      await sleep(500); if (state.abort) return stopped();

      var b = agentBlock();
      var s1 = addStep(b, '理解需求');
      await sleep(900); if (state.abort) return stopped();
      s1.done(3);

      var s2 = addStep(b, '分析商品页',
        '<div class="tool"><b>🔧 read_url</b> shopee.co.id/p/8823…</div>' +
        '<div class="res">→ 标题、价格、主图 8 张、详情页文案 1,240 字</div>' +
        '<div class="tool"><b>🔧 extract_selling_points</b></div>' +
        '<div class="res">→ 6 个卖点：五重玻尿酸 / 24h 保湿 / 无香精 / pH 5.5 / 不搓泥 / 大容量</div>');
      await sleep(1500); if (state.abort) return stopped();
      s2.done(12);

      var s3 = addStep(b, '生成脚本 5 版',
        '<div class="tool"><b>🔧 write_script</b> style=痛点式 count=5</div>' +
        '<div class="res">→ 5 版口播脚本，每版含钩子、卖点顺序、结尾 CTA</div>');
      await sleep(1600); if (state.abort) return stopped();
      s3.done(18);

      say(b, '我从商品页提取到 <b>6 个卖点</b>，按「保湿力」「质地」「性价比」三个角度写了 5 版口播脚本，都用痛点式开场。先给你看脚本，确认后再出片。');
      await sleep(320);
      add(b, '<div class="tool-call"><span class="sp">✦</span> 脚本生成 <span class="ok">✓</span></div>');

      renderScripts(); tabCount('scripts', 5);
      artifactCard(b, '📄', '口播脚本 × 5',
        SCRIPTS.map(function (x) { return '<div class="script-line"><b>' + x.n + '</b>' + x.hook + '</div>'; }).join(''), 'scripts');

      await sleep(380);
      say(b, '要我直接按第 ① 版出片，还是先改脚本？', 'small');
      setRunning(false);

      quickReplies(b, [['one', '按 ① 出片', '1 额度'], ['all', '5 版全出', '5 额度'], ['edit', '我要改脚本']], function (q) {
        if (q === 'edit') {
          userMsg('我要改脚本');
          say(agentBlock(), '好，脚本在右边「脚本」Tab，直接改就行。改完点「按这版出片」，或者告诉我改哪一版怎么改。', 'small');
          openTab('scripts', true);
          return;
        }
        generate(q === 'all' ? 5 : 1);
      });
    }

    async function generate(count) {
      userMsg(count === 5 ? '5 版全出' : '按 ① 出片');
      setRunning(true); state.abort = false;
      await sleep(400);

      var b = agentBlock();
      var clips = CLIPS.slice(0, count).map(function (c) { return Object.assign({}, c, { status: 'queue' }); });
      var card = add(b,
        '<div class="artifact"><div class="artifact-head">🎬 正在生成 ' + count + ' 条成片</div>' +
        '<div class="artifact-body"><div class="batch-tiles">' +
          clips.map(function (_, i) { return '<div class="tile" data-i="' + i + '"><div class="fill" style="height:0"></div><span>排队</span></div>'; }).join('') +
        '</div><div class="batch-foot"><span class="bstat">排队中…</span>' +
        '<a class="link" href="#" data-open>在工作台查看 →</a></div></div></div>');
      card.querySelector('[data-open]').addEventListener('click', function (e) { e.preventDefault(); openTab('clips', true); });

      var tiles = $$('.tile', card), bstat = $('.bstat', card), okCount = 0;

      for (var i = 0; i < clips.length; i++) {
        if (state.abort) { bstat.textContent = '已停止，已完成的保留'; setRunning(false); return; }
        var tile = tiles[i], c = clips[i];
        tile.classList.add('run');
        bstat.textContent = '正在生成第 ' + (i + 1) + ' 条 · 合成镜头与配音';
        for (var p = 0; p <= 100; p += 20) {
          if (state.abort) break;
          tile.querySelector('.fill').style.height = p + '%';
          tile.querySelector('span').textContent = p + '%';
          await sleep(160);
        }
        tile.classList.remove('run');
        tile.querySelector('.fill').style.height = '0';
        if (c.id === 4) { tile.classList.add('fail'); tile.querySelector('span').textContent = '✕'; c.status = 'fail'; }
        else { tile.classList.add('ok'); tile.querySelector('span').textContent = '✓'; c.status = 'ok'; okCount++; }
        s.clips = clips.slice(0, i + 1);
        renderClips(); tabCount('clips', okCount);
      }
      bstat.textContent = okCount + '/' + count + ' 已完成';

      if (clips.some(function (c) { return c.status === 'fail'; })) {
        await sleep(300);
        var fail = add(b,
          '<div class="fail-card"><div class="fh">⚠ 第 ④ 条生成失败</div><div class="fb">' +
          '<div class="row"><span class="dim">原因：</span>素材匹配超时——第 3 个镜头「成分表特写」在素材库里找不到合适的空镜。</div>' +
          '<div class="row"><span class="dim">建议：</span>换一个镜头描述，或者允许我用 AI 生成这个镜头。</div>' +
          '<div class="acts"><button data-f="retry">重试</button><button data-f="ai">用 AI 生成镜头</button><button data-f="skip">跳过这条</button></div>' +
          '<div class="note">✓ 这条不扣额度</div></div></div>');
        $$('button', fail).forEach(function (fb) {
          fb.addEventListener('click', function () {
            var k = fb.getAttribute('data-f');
            if (k === 'skip') { fail.remove(); toast('已跳过第 ④ 条，额度未扣除'); return; }
            toast(k === 'ai' ? '正在用 AI 生成第 3 个镜头…（外观稿到此为止）' : '正在重试第 ④ 条…（外观稿到此为止）');
          });
        });
      }

      await sleep(380);
      var ok = clips.filter(function (c) { return c.status === 'ok'; });
      report(b, ok.length + ' 条成片已生成', [
        '时长：' + Math.min.apply(null, ok.map(function (c) { return c.dur; })) + '–' + Math.max.apply(null, ok.map(function (c) { return c.dur; })) + ' 秒',
        '格式：9:16 · 1080×1920',
        '音色：温柔女声（可在工作台更换）',
        '第 ③ 版口播语速偏快，我已经调到 0.95x'
      ], ok.length);
      setRunning(false);
      openTab('clips');
    }

    function renderClips() {
      var host = panel('clips');
      var ok = s.clips.filter(function (c) { return c.status === 'ok'; });
      if (!ok.length) { host.innerHTML = emptyBox('🎬', '还没有成片。<br>在左边说一句你要什么，产出会出现在这里。'); return; }
      if (s.grid) { renderGrid(host); return; }
      if (!ok.some(function (c) { return c.id === s.selClip; })) s.selClip = ok[0].id;

      var clip = ok.filter(function (c) { return c.id === s.selClip; })[0];
      var shots = shotsFor(clip);
      var shot = shots[Math.min(s.selShot, shots.length - 1)];

      host.innerHTML =
        '<div class="player"><div class="stage9" style="background:linear-gradient(165deg,' + clip.tint[0] + ',' + clip.tint[1] + ')">' +
          '<button class="play" id="playBtn" aria-label="播放">▶</button>' +
          '<div class="sub9" id="sub9">' + shot.sub + '</div>' +
          '<div class="scrub"><div class="bar"><i id="bar" style="width:0%"></i></div>' +
          '<div class="t"><span id="tnow">00:00</span><span>' + fmt(clip.dur) + '</span></div></div></div>' +
        '<div class="meta"><h3>' + clip.name + '</h3><div class="cap">' + clip.dur + 's · 1080×1920 · 9:16</div>' +
          mrow('音色', ['温柔女声', '活力女声', '沉稳男声']) +
          mrow('BGM', ['轻快电子', '温暖钢琴', '无']) +
          mrow('字幕', ['简约白', '描边黄', '关闭']) +
          '<div class="acts"><button class="sbtn primary" data-act="dl">⤓ 下载</button>' +
          '<button class="sbtn" data-act="re">⟳ 重新生成</button></div></div></div>' +
        '<div class="sec-label">分镜</div><div class="shots">' +
          shots.map(function (x, i) {
            return '<button class="shot' + (i === s.selShot ? ' on' : '') + '" data-shot="' + i + '">' +
              '<div class="n">' + x.n + '</div><div class="t">' + x.start + '–' + x.endT + 's</div></button>';
          }).join('') + '</div>' +
        '<div class="shot-detail"><div class="sd-head">镜头 ' + shot.n + ' · ' + shot.start + '–' + shot.endT + 's</div>' +
          sd('画面', shot.visual, '换素材 ⟳', 'swap') + sd('口播', shot.vo, '编辑 ✎', 'edit') + sd('字幕', shot.sub, '样式 ⌄', 'style') +
        '</div>' +
        '<div class="sec-label">其他成片</div><div class="others">' +
          s.clips.map(function (c) {
            return '<button class="oth' + (c.id === s.selClip ? ' on' : '') + '" data-clip="' + c.id + '" style="background:linear-gradient(165deg,' + c.tint[0] + ',' + c.tint[1] + ')">' +
              (c.status === 'fail' ? '<span class="warn">⚠</span>' : '') + c.id + '</button>';
          }).join('') +
          '<button class="sbtn" style="margin-left:auto;padding:0 12px" data-act="dlall">⤓ 全部下载</button></div>';

      stopPlay();
      $$('.shot', host).forEach(function (x) {
        x.addEventListener('click', function () { s.selShot = +x.getAttribute('data-shot'); play.t = shots[s.selShot].start; renderClips(); });
      });
      $$('.oth', host).forEach(function (o) {
        o.addEventListener('click', function () {
          var id = +o.getAttribute('data-clip');
          var c = s.clips.filter(function (x) { return x.id === id; })[0];
          if (c && c.status === 'fail') { toast('第 ④ 条生成失败，可在对话里重试或跳过'); return; }
          s.selClip = id; s.selShot = 0; play.t = 0; renderClips();
        });
      });
      bindActs(host, {
        dl: '开始下载《' + clip.name + '》…（外观稿未接入）', re: '正在重新生成这条…（外观稿未接入）',
        dlall: '开始打包下载全部成片…（外观稿未接入）', swap: '打开素材库替换该镜头画面',
        edit: '口播文案可直接编辑，改完自动重新配音', style: '字幕样式：简约白 / 描边黄 / 综艺花字'
      });

      var btn = $('#playBtn', host);
      btn.addEventListener('click', function () {
        togglePlay(clip.dur, function (t) {
          var bar = $('#bar'); if (!bar) return false;
          bar.style.width = (t / clip.dur * 100) + '%';
          $('#tnow').textContent = fmt(t);
          for (var i = 0; i < shots.length; i++) {
            if (t <= shots[i].endT) {
              $('#sub9').textContent = shots[i].sub;
              $$('.shot').forEach(function (x, j) { x.classList.toggle('on', j === i); });
              break;
            }
          }
          return true;
        }, btn);
      });
    }

    function renderGrid(host) {
      host.innerHTML =
        '<div class="grid5">' + s.clips.map(function (c) {
          var f = c.status === 'fail';
          return '<div class="gcard' + (s.sel[c.id] ? ' sel' : '') + '" data-g="' + c.id + '">' +
            '<div class="g9" style="background:linear-gradient(165deg,' + c.tint[0] + ',' + c.tint[1] + ')">' +
            (f ? '<span style="color:var(--err);font-size:18px">⚠</span>' : '<span class="pl">▶</span>') +
            (f ? '' : '<span class="ck">✓</span>') + '</div>' +
            '<div class="gm"><span>' + c.id + '</span><span>' + (f ? '失败' : c.dur + 's') + '</span></div></div>';
        }).join('') + '</div>' +
        '<div class="gbar"><span id="selCount">已选 0 条</span><span class="sp"></span>' +
        '<button class="sbtn" data-g-act="dl">⤓ 下载</button><button class="sbtn" data-g-act="del">🗑 删除</button></div>';

      $$('.gcard', host).forEach(function (g) {
        var id = +g.getAttribute('data-g');
        var c = s.clips.filter(function (x) { return x.id === id; })[0];
        g.addEventListener('click', function () {
          if (c.status === 'fail') { toast('这条生成失败了，可在对话里重试'); return; }
          s.sel[id] = !s.sel[id];
          g.classList.toggle('sel', s.sel[id]);
          $('#selCount').textContent = '已选 ' + Object.keys(s.sel).filter(function (k) { return s.sel[k]; }).length + ' 条';
        });
      });
      $$('[data-g-act]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var n = Object.keys(s.sel).filter(function (k) { return s.sel[k]; }).length;
          if (!n) { toast('先勾选要操作的成片'); return; }
          toast((b.getAttribute('data-g-act') === 'dl' ? '开始下载 ' : '已删除 ') + n + ' 条（外观稿未接入）');
        });
      });
    }

    function renderScripts() {
      var host = panel('scripts');
      host.innerHTML = SCRIPTS.map(function (x) {
        return '<div class="script-card"><div class="sh"><b>' + x.n + '</b>' + x.hook +
          '<span class="tagx">' + x.style + '</span></div><div class="sb">' + x.body + '</div>' +
          '<div style="padding:0 13px 12px;display:flex;gap:8px">' +
          '<button class="sbtn" style="padding:0 12px" data-n="' + x.n + '" data-k="use">按这版出片</button>' +
          '<button class="sbtn" style="padding:0 12px" data-n="' + x.n + '" data-k="edit">编辑</button></div></div>';
      }).join('');
      $$('[data-n]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var n = b.getAttribute('data-n');
          toast(b.getAttribute('data-k') === 'use' ? '将按第 ' + n + ' 版出片 · 消耗 1 额度' : '第 ' + n + ' 版脚本可直接改，改完自动重新配音');
        });
      });
    }

    function init() {
      renderClips();
      panel('scripts').innerHTML = emptyBox('📄', '还没有脚本。');
      panel('assets').innerHTML =
        '<div class="sec-label" style="margin-top:0">本次用到的素材</div><div class="assets-grid">' +
        ASSETS.map(function (a) { return '<div class="asset" style="background:linear-gradient(160deg,' + a[1] + ',#0C0C12)"><div class="lb">' + a[0] + '</div></div>'; }).join('') +
        '</div><div class="sec-label">来源</div><p class="dim" style="font-size:12.5px;line-height:1.8">' +
        '8 张来自商品详情页自动抓取<br>1 段 BGM 来自 SuperX 正版曲库<br>其余空镜由 AI 生成</p>';
      panel('settings').innerHTML =
        row('平台', ['TikTok*', 'Instagram Reels', 'YouTube Shorts']) + row('时长', ['15s', '15–30s*', '60s']) +
        row('口播风格', ['痛点式*', '测评式', '故事式']) + row('音色', ['温柔女声*', '活力女声', '沉稳男声']) +
        row('字幕', ['简约白*', '描边黄', '综艺花字']) + row('批量', ['3 条', '5 条*', '10 条', '30 条']) +
        '<div class="sec-label">额度</div><p class="dim" style="font-size:12.5px;line-height:1.8">' +
        '当前设置下，一次生成消耗 <b style="color:var(--accent)">5 额度</b><br>免费版剩余 12 额度</p>';
      bindSegs(panel('settings'));

      $('#gridToggle').addEventListener('click', function () {
        s.grid = !s.grid;
        $('#gridToggle').textContent = s.grid ? '▤' : '⊞';
        $('#gridToggle').classList.toggle('on', s.grid);
        renderClips();
      });
      $('#gridToggle').style.display = 'grid';
    }

    return { init: init, run: run, renderEmpty: renderEmpty, renderParams: renderParams,
             defaultPrompt: '用这个链接做 5 条投放素材，主打保湿，要痛点式开场' };
  })();

  /* ============================================================
     模式二 · AI 短剧
     ============================================================ */
  var DRAMA = (function () {
    var TITLE = '雨夜之后';
    var NAMES = ['初见', '合约', '雨夜对峙', '旧照片', '反转', '摊牌', '离场', '重逢',
                 '暗流', '对簿', '真相', '抉择', '余波', '归来', '对峙 II', '收网',
                 '告别', '新生', '尾声', '番外'];
    var TINTS = [['#2A1240', '#120A1E'], ['#331750', '#150B22'], ['#251038', '#0F0818']];

    var CHARS = [
      { name: 'Maya', role: '女主', face: '#A855F7', voice: '清冷女声', locked: true,
        bio: '26 岁，律所合伙人，外冷内热。三年前替 Arga 背下一纸合约。' },
      { name: 'Arga', role: '男主', face: '#0B62CE', voice: '低沉男声', locked: true,
        bio: '30 岁，重生归来的落魄总裁。记得前世的每一次背叛。' },
      { name: 'Pak Yusuf', role: '配角', face: '#F59E0B', voice: '苍老男声', locked: false,
        bio: 'Wijaya 家旧仆，唯一察觉 Arga"变了"的人。' }
    ];

    // 每集剧本：t 为该行起始秒
    var SCRIPTS = {
      1: { dur: 130, lines: [
        { t: 0,  k: 'scene', v: '【场景】律所会议室 · 日 · 逆光' },
        { t: 6,  k: 'move',  v: '【运镜】长焦压缩，越过玻璃隔断推进' },
        { t: 14, k: 'name',  v: 'Maya', l: '「Arga 先生，这份合约我不会签。」', note: '（情绪：克制｜停顿 0.5s）' },
        { t: 30, k: 'move',  v: '【运镜】反打，Arga 指节敲击桌面三下' },
        { t: 40, k: 'name',  v: 'Arga', l: '「你会的。三年前你就签过一次。」', note: '（情绪：笃定）' },
        { t: 60, k: 'name',  v: 'Maya', l: '「……你说什么？」', note: '（情绪：错愕｜语速 -15%）' },
        { t: 78, k: 'move',  v: '【运镜】特写，Maya 瞳孔收缩' },
        { t: 96, k: 'scene', v: '【转场】白闪，切前世记忆片段' },
        { t: 112, k: 'hook', v: '【钩子】他为什么知道三年前的事？' }
      ] },
      2: { dur: 145, lines: [
        { t: 0,  k: 'scene', v: '【场景】Wijaya 集团顶层办公室 · 黄昏' },
        { t: 8,  k: 'move',  v: '【运镜】环绕镜头，落地窗城市天际线' },
        { t: 18, k: 'name',  v: 'Arga', l: '「合约条款我改过了，你再看一遍。」' },
        { t: 34, k: 'name',  v: 'Maya', l: '「你把违约责任全揽到自己身上了。」', note: '（情绪：疑惑）' },
        { t: 52, k: 'name',  v: 'Arga', l: '「这一次，我不想再让你替我赔。」', note: '（情绪：低沉｜停顿 1.2s）' },
        { t: 74, k: 'move',  v: '【运镜】双人中景，光线渐暗' },
        { t: 92, k: 'name',  v: 'Pak Yusuf', l: '「少爷，夫人生前也是这么说的。」' },
        { t: 114, k: 'hook', v: '【钩子】Pak Yusuf 到底知道多少？' }
      ] },
      3: { dur: 150, lines: [
        { t: 0,  k: 'scene', v: '【场景】老宅门口 · 夜 · 大雨' },
        { t: 7,  k: 'move',  v: '【运镜】低角度推近，雨滴打在伞面' },
        { t: 16, k: 'name',  v: 'Maya', l: '「你以为把合同撕了，这事就算完了？」', note: '（情绪：压抑的愤怒｜停顿 0.8s）' },
        { t: 38, k: 'move',  v: '【运镜】过肩反打，Arga 背身' },
        { t: 48, k: 'name',  v: 'Arga', l: '「合同是我签的，撕的也该是我。」' },
        { t: 68, k: 'name',  v: 'Maya', l: '「三年前你也是这么说的。」', note: '（情绪：讥讽｜语速 +10%）' },
        { t: 90, k: 'move',  v: '【运镜】双人中景，雨势加大' },
        { t: 104, k: 'name', v: 'Arga', l: '「这次不一样。」', note: '（情绪：决绝）' },
        { t: 124, k: 'scene', v: '【转场】雨幕虚化，切 EP04' },
        { t: 136, k: 'hook',  v: '【钩子】他手里那张旧照片是谁？' }
      ] }
    };

    var OUTLINE = [
      '律所初见，Maya 拒签合约，Arga 说出三年前的秘密',
      'Arga 改了违约条款，Pak Yusuf 一句话暴露了前世',
      '雨夜老宅对峙，旧照片第一次出现',
      'Maya 查到照片来源，指向已故的 Arga 母亲',
      '前世记忆碎片回闪，Arga 第一次说出"重来"',
      '董事会逼宫，Maya 当庭反转',
      'Arga 主动离场，把股权交给 Maya',
      '半年后机场重逢，两人都变了'
    ];

    var s = { eps: [], sel: 3 };

    function epState(n) {
      var e = s.eps.filter(function (x) { return x.n === n; })[0];
      return e ? e.status : 'idle';
    }

    function renderEmpty(host) {
      host.innerHTML =
        '<div class="empty-label" style="margin-top:0">从这些开始 ——</div>' +
        '<div class="starter-grid">' +
          '<button class="starter" data-s="idea"><div class="ico">💡</div><b>一句梗概开剧</b><span>说个设定，我来写人物和分集</span></button>' +
          '<button class="starter" data-s="script"><div class="ico">📄</div><b>已有剧本直接拍</b><span>上传剧本或大纲，跳过创作</span></button>' +
          '<button class="starter" data-s="novel"><div class="ico">📚</div><b>小说改编</b><span>贴一段原文，改成分集短剧</span></button>' +
        '</div>' +
        '<div class="empty-label">或者看看已经做出来的（点开能看到完整对话，含原始 prompt）：</div>' +
        '<div class="sample-row">' +
          [['都市情感 · 20 集', '#2C1840,#140B1E'], ['豪门恩怨 · 24 集', '#3A2418,#1A1208'],
           ['悬疑推理 · 16 集', '#16283F,#0B1220'], ['重生逆袭 · 30 集', '#3F1630,#1A0A16']].map(function (x) {
            return '<button class="sample"><div class="cov" style="background:linear-gradient(160deg,' + x[1] + ')"></div><div class="nm">' + x[0] + '</div></button>';
          }).join('') +
        '</div>';
      $$('.starter', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-s');
          if (k === 'idea') input.value = '做一部都市情感短剧，落魄总裁重生复仇 + 双向救赎，20 集，竖屏';
          if (k === 'script') { addChip('📄 故事梗概.docx'); input.value = '按这份大纲拍，20 集，每集 2–3 分钟'; }
          if (k === 'novel') input.value = '把这段小说改成 20 集短剧，保留原作的第一人称视角';
          autosize(); input.focus();
        });
      });
      $$('.sample', host).forEach(function (b) {
        b.addEventListener('click', function () { toast('样例：完整对话记录 + 原始 prompt（外观稿未接入）'); });
      });
    }

    function renderParams(host) {
      host.innerHTML =
        row('题材', ['都市情感*', '豪门恩怨', '悬疑推理', '重生逆袭']) +
        row('集数', ['12 集', '20 集*', '24 集', '30 集']) +
        row('每集时长', ['1–2 分钟', '2–3 分钟*', '3–5 分钟']) +
        row('版式', ['竖屏 9:16*', '横屏 16:9', '双版都要']) +
        row('生成策略', ['先出 3 集*', '一次全出']);
      bindSegs(host);
    }

    async function run(text, attach) {
      setRunning(true);
      userMsg(text, attach);
      await sleep(500); if (state.abort) return stopped();

      var b = agentBlock();
      var s1 = addStep(b, '理解设定');
      await sleep(900); if (state.abort) return stopped();
      s1.done(4);

      var s2 = addStep(b, '生成人物小传',
        '<div class="tool"><b>🔧 build_characters</b> count=8</div>' +
        '<div class="res">→ 3 主角 + 5 配角，含身份、动机、前史与人物弧光</div>' +
        '<div class="tool"><b>🔧 lock_appearance</b> chars=Maya,Arga</div>' +
        '<div class="res">→ 每人生成 4 张参考图（正/侧/笑/怒），跨集复用</div>');
      await sleep(1500); if (state.abort) return stopped();
      s2.done(16);

      var s3 = addStep(b, '拆分集大纲 20 集',
        '<div class="tool"><b>🔧 outline_episodes</b> count=20 genre=都市情感</div>' +
        '<div class="res">→ 每集含主线推进、情绪转折与结尾钩子</div>' +
        '<div class="tool"><b>🔧 write_screenplay</b> ep=1-3</div>' +
        '<div class="res">→ 前 3 集完整台词剧本，带运镜与情绪标注</div>');
      await sleep(1700); if (state.abort) return stopped();
      s3.done(22);

      say(b, '按「重生复仇 + 双向救赎」的主线写了 <b>20 集大纲</b>，三个主角五个配角，每集结尾都留了钩子。' +
             'Maya 和 Arga 的形象我已经<b>锁定</b>了，后面所有集都会沿用同一组参考图，不会跑脸。');
      await sleep(320);
      add(b, '<div class="tool-call"><span class="sp">✦</span> 剧本生成 <span class="ok">✓</span></div>');

      renderCast(); tabCount('cast', 8);
      artifactCard(b, '👤', '人物小传 × 8',
        CHARS.map(function (c) {
          return '<div class="script-line"><b>' + c.name + '</b><span class="dim">' + c.role + ' · ' + c.bio.slice(0, 18) + '…</span></div>';
        }).join('') + '<div class="script-line dim" style="padding-left:2px">另有 5 个配角</div>', 'cast');

      await sleep(300);
      renderScriptPanel(); tabCount('script', 20);
      artifactCard(b, '📄', '分集大纲 EP01–EP20',
        OUTLINE.slice(0, 4).map(function (o, i) {
          return '<div class="script-line"><b>EP0' + (i + 1) + '</b>' + o + '</div>';
        }).join('') + '<div class="script-line dim" style="padding-left:2px">…还有 16 集</div>', 'script');

      await sleep(380);
      say(b, '建议<b>先出 3 集</b>看效果，风格确认了再往下走——20 集全出大概要 6 小时，也更费额度。', 'small');
      setRunning(false);

      quickReplies(b, [['three', '先出 3 集', '3 额度'], ['all', '20 集全出', '20 额度'], ['edit', '我要改剧本']], function (q) {
        if (q === 'edit') {
          userMsg('我要改剧本');
          say(agentBlock(), '好，剧本在右边「剧本」Tab，逐集可改。角色形象和音色在「角色」Tab 里调，改完后面的集数会自动沿用。', 'small');
          openTab('script', true);
          return;
        }
        generate(q === 'all' ? 20 : 3);
      });
    }

    async function generate(count) {
      userMsg(count === 20 ? '20 集全出' : '先出 3 集');
      setRunning(true); state.abort = false;
      await sleep(400);

      var b = agentBlock();
      var n = Math.min(count, 3); // 外观演示只跑前 3 集
      var card = add(b,
        '<div class="artifact"><div class="artifact-head">🎬 正在生成 EP01–EP' + String(n).padStart(2, '0') + '</div>' +
        '<div class="artifact-body"><div class="batch-tiles">' +
          Array.apply(null, Array(n)).map(function (_, i) {
            return '<div class="tile wide" data-i="' + i + '"><div class="fill" style="height:0"></div><span>排队</span></div>';
          }).join('') +
        '</div><div class="batch-foot"><span class="bstat">排队中…</span>' +
        '<a class="link" href="#" data-open>在工作台查看 →</a></div></div></div>');
      card.querySelector('[data-open]').addEventListener('click', function (e) { e.preventDefault(); openTab('eps', true); });

      var tiles = $$('.tile', card), bstat = $('.bstat', card);
      var phases = ['分镜编排', '角色渲染', '配音合成', '配乐与调色'];

      for (var i = 0; i < n; i++) {
        if (state.abort) { bstat.textContent = '已停止，已完成的保留'; setRunning(false); return; }
        var tile = tiles[i];
        tile.classList.add('run');
        s.eps.push({ n: i + 1, status: 'run' });
        for (var p = 0; p <= 100; p += 25) {
          if (state.abort) break;
          bstat.textContent = 'EP0' + (i + 1) + ' · ' + phases[Math.min(Math.floor(p / 25), 3)];
          tile.querySelector('.fill').style.height = p + '%';
          tile.querySelector('span').textContent = p + '%';
          renderEps();
          await sleep(200);
        }
        tile.classList.remove('run');
        tile.querySelector('.fill').style.height = '0';
        tile.classList.add('ok');
        tile.querySelector('span').textContent = '✓';
        s.eps[i].status = i === 1 ? 'warn' : 'ok';
        renderEps(); tabCount('eps', i + 1);
      }
      bstat.textContent = n + '/' + n + ' 已完成';

      // 警告态（不是失败，片子能用但有瑕疵）
      await sleep(300);
      var warn = add(b,
        '<div class="fail-card" style="border-color:rgba(245,200,76,.35);background:rgba(245,200,76,.05)">' +
        '<div class="fh" style="color:var(--warn)">⚠ EP02 有一处需要你确认</div><div class="fb">' +
        '<div class="row"><span class="dim">问题：</span>Pak Yusuf 那句「夫人生前也是这么说的」口型与台词偏差 0.3 秒，我已经自动重配了一次。</div>' +
        '<div class="row"><span class="dim">影响：</span>片子可以用，但如果你对口型要求严格，建议听一遍。</div>' +
        '<div class="acts"><button data-w="play">去听这一句</button><button data-w="re">重配这一句</button><button data-w="ok">就这样，继续</button></div>' +
        '</div></div>');
      $$('button', warn).forEach(function (wb) {
        wb.addEventListener('click', function () {
          var k = wb.getAttribute('data-w');
          if (k === 'ok') { warn.remove(); toast('已确认，EP02 保持当前版本'); return; }
          if (k === 'play') { s.sel = 2; renderEps(); openTab('eps', true); toast('已跳到 EP02 · 01:32'); return; }
          toast('正在重配这一句…（外观稿到此为止）');
        });
      });

      await sleep(380);
      report(b, n + ' 集已生成', [
        '时长：2:10 / 2:25 / 2:30',
        '版式：竖屏 9:16（横屏版可在设置里一并导出）',
        '角色一致性：Maya、Arga 跨 3 集检查通过',
        'EP02 有一处口型提示，见上方'
      ], n);

      if (count === 20) {
        await sleep(200);
        say(b, '前 3 集完成了。确认风格没问题的话，我继续跑 EP04–EP20，预计 5 小时 40 分。', 'small');
        quickReplies(b, [['go', '继续跑完 17 集', '17 额度'], ['wait', '我先看看']], function (q) {
          if (q === 'go') { toast('已加入队列，跑完会通知你（外观稿到此为止）'); }
          else { toast('好，随时在这里说「继续」'); }
        });
      }

      setRunning(false);
      s.sel = 3;
      openTab('eps');
      renderEps();
    }

    /* ---------- 剧集面板 ---------- */
    function renderEps() {
      var host = panel('eps');
      if (!s.eps.length) { host.innerHTML = emptyBox('🎬', '还没有剧集。<br>在左边说一句设定，剧集会出现在这里。'); return; }

      var done = s.eps.filter(function (e) { return e.status === 'ok' || e.status === 'warn'; });
      if (!done.length) { host.innerHTML = emptyBox('🎬', '正在生成第一集…'); return; }
      if (!done.some(function (e) { return e.n === s.sel; })) s.sel = done[done.length - 1].n;

      var sc = SCRIPTS[s.sel], tint = TINTS[(s.sel - 1) % TINTS.length];
      var first = sc.lines[0];

      host.innerHTML =
        '<div class="crumb">《<b>' + TITLE + '</b>》<span class="sep">›</span> <b>EP' + String(s.sel).padStart(2, '0') + '</b> ' + NAMES[s.sel - 1] +
          (epState(s.sel) === 'warn' ? ' <span style="color:var(--warn)">⚠</span>' : '') + '</div>' +

        '<div class="stage16" style="background:linear-gradient(150deg,' + tint[0] + ',' + tint[1] + ')">' +
          '<div class="ep">EP' + String(s.sel).padStart(2, '0') + '</div>' +
          '<div class="nm">' + NAMES[s.sel - 1] + '</div>' +
          '<button class="play" id="playBtn" aria-label="播放">▶</button>' +
          '<div class="line" id="nowline">' + (first.l || first.v) + '</div>' +
          '<div class="scrub"><div class="bar"><i id="bar" style="width:0%"></i></div>' +
          '<div class="t"><span id="tnow">00:00</span><span>' + fmt(sc.dur) + '</span></div></div>' +
        '</div>' +

        '<div class="mrow" style="margin-top:12px"><span>本集时长 ' + fmt(sc.dur) + ' · 竖屏 9:16</span>' +
          '<span style="display:flex;gap:8px"><button class="sbtn" style="padding:0 12px" data-act="dl">⤓ 下载本集</button>' +
          '<button class="sbtn" style="padding:0 12px" data-act="re">⟳ 重出本集</button></span></div>' +

        '<div class="sec-label">剧集进度</div>' +
        '<div class="eps">' + NAMES.map(function (nm, i) {
          var n = i + 1, st = epState(n);
          var cls = st === 'ok' || st === 'warn' ? 'ok' : (st === 'run' ? 'run' : '');
          if (n === s.sel) cls = 'on';
          return '<button class="ep-cell ' + cls + '" data-ep="' + n + '" title="EP' + String(n).padStart(2, '0') + ' ' + nm + '">' +
            '<div class="fill"></div><span>' + n + '</span></button>';
        }).join('') + '</div>' +
        '<div class="ep-legend">' +
          '<span><i style="background:var(--accent)"></i>当前</span>' +
          '<span><i style="background:rgba(52,211,153,.5)"></i>已完成</span>' +
          '<span><i style="background:rgba(255,255,255,.1)"></i>未开始</span>' +
        '</div>' +

        '<div class="sec-label">本集剧本</div>' +
        '<div class="screenplay"><div class="sp-head">EP' + String(s.sel).padStart(2, '0') + ' · ' + NAMES[s.sel - 1] +
          '<button class="act" data-act="editsp">编辑 ✎</button></div>' +
          '<div class="sp-body" id="spBody">' + sc.lines.map(function (l, i) { return lineHtml(l, i); }).join('') + '</div></div>' +

        '<div class="sec-label">本集出场角色</div>' +
        '<div class="cast">' + CHARS.map(function (c) {
          return '<button class="cast-chip" data-char="' + c.name + '">' +
            '<span class="face" style="background:linear-gradient(140deg,' + c.face + ',#1A1020)"></span>' + c.name + '</button>';
        }).join('') + '</div>';

      stopPlay();
      play.t = 0;

      $$('.ep-cell', host).forEach(function (c) {
        c.addEventListener('click', function () {
          var n = +c.getAttribute('data-ep');
          if (!SCRIPTS[n] || epState(n) === 'idle') {
            toast('EP' + String(n).padStart(2, '0') + ' 还没生成，在对话里说「继续跑 EP04 之后的」');
            return;
          }
          s.sel = n; play.t = 0; renderEps();
        });
      });
      $$('.cast-chip', host).forEach(function (c) {
        c.addEventListener('click', function () { openTab('cast', true); });
      });
      bindActs(host, {
        dl: '开始下载 EP' + String(s.sel).padStart(2, '0') + '…（外观稿未接入）',
        re: '重出本集会沿用已锁定的角色形象 · 消耗 1 额度',
        editsp: '剧本可逐行编辑，改完自动重新配音并对口型'
      });

      var btn = $('#playBtn', host);
      btn.addEventListener('click', function () {
        togglePlay(sc.dur, function (t) {
          var bar = $('#bar'); if (!bar) return false;
          bar.style.width = (t / sc.dur * 100) + '%';
          $('#tnow').textContent = fmt(t);
          var idx = 0;
          for (var i = 0; i < sc.lines.length; i++) if (t >= sc.lines[i].t) idx = i;
          var cur = sc.lines[idx];
          $('#nowline').textContent = cur.l || cur.v;
          $$('#spBody .sl').forEach(function (x, j) { x.classList.toggle('on', j === idx); });
          var act = $('#spBody .sl.on');
          if (act) act.scrollIntoView({ block: 'nearest' });
          return true;
        }, btn);
      });
    }

    function lineHtml(l, i) {
      if (l.k === 'name') {
        return '<div class="sl" data-i="' + i + '"><span class="sl-name">' + l.v + '</span>' +
          '<span class="sl-line">' + l.l + '</span>' + (l.note ? '<span class="sl-note"> ' + l.note + '</span>' : '') + '</div>';
      }
      var cls = l.k === 'move' ? 'sl-move' : (l.k === 'hook' ? 'sl-note' : 'sl-scene');
      return '<div class="sl ' + cls + '" data-i="' + i + '">' + l.v + '</div>';
    }

    /* ---------- 剧本面板 ---------- */
    function renderScriptPanel() {
      var host = panel('script');
      host.innerHTML =
        '<div class="crumb">《<b>' + TITLE + '</b>》<span class="sep">›</span> 20 集大纲</div>' +
        NAMES.map(function (nm, i) {
          var n = i + 1, has = !!SCRIPTS[n];
          return '<div class="script-card"><div class="sh"><b>EP' + String(n).padStart(2, '0') + '</b>' + nm +
            '<span class="tagx">' + (has ? '完整剧本' : '仅大纲') + '</span></div>' +
            '<div class="sb">' + (OUTLINE[i] || '待写：延续主线，结尾留钩子') + '</div>' +
            (has ? '<div style="padding:0 13px 12px"><button class="sbtn" style="padding:0 12px" data-go="' + n + '">看完整剧本 →</button></div>' : '') +
            '</div>';
        }).join('');
      $$('[data-go]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var n = +b.getAttribute('data-go');
          if (epState(n) === 'idle') { toast('EP' + String(n).padStart(2, '0') + ' 还没生成成片，但剧本可以先看'); }
          s.sel = n; renderEps(); openTab('eps', true);
        });
      });
    }

    /* ---------- 角色面板 ---------- */
    function renderCast() {
      var host = panel('cast');
      host.innerHTML =
        '<div class="crumb">角色库 <span class="sep">·</span> 3 主角 + 5 配角</div>' +
        CHARS.map(function (c, i) {
          return '<div class="char-card"><div class="char-top">' +
            '<span class="face" style="background:linear-gradient(140deg,' + c.face + ',#160C1E)"></span>' +
            '<div><h4>' + c.name + '<span class="role">' + c.role + '</span></h4>' +
            '<div class="bio">' + c.bio + '</div></div></div>' +
            '<div class="char-meta"><span class="dim">音色</span>' +
            '<select class="mini-select"><option>' + c.voice + '</option><option>换一个…</option></select>' +
            '<button class="lock' + (c.locked ? ' on' : '') + '" data-lock="' + i + '">' +
            (c.locked ? '🔒 形象已锁定' : '🔓 未锁定') + '</button></div>' +
            '<div class="refs">' +
              ['正', '侧', '笑', '怒'].map(function (t) {
                return '<span class="ref" style="background:linear-gradient(150deg,' + c.face + '55,#140B1C)">' + t + '</span>';
              }).join('') +
              '<button class="ref add" data-add="' + i + '">＋</button>' +
            '</div></div>';
        }).join('') +
        '<div class="hint">💡 锁定形象后，后续所有集数都会沿用这组参考图。这是「跨 20 集不跑脸」的关键——解锁会让该角色在新集里重新生成外观。</div>' +
        '<button class="sbtn" style="width:100%;margin-top:12px" data-act="newchar">＋ 新建角色</button>';

      $$('[data-lock]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var c = CHARS[+b.getAttribute('data-lock')];
          c.locked = !c.locked;
          renderCast();
          toast(c.locked ? c.name + ' 形象已锁定，后续集数沿用同一组参考图' : c.name + ' 已解锁，新集会重新生成外观');
        });
      });
      $$('[data-add]', host).forEach(function (b) {
        b.addEventListener('click', function () { toast('上传一张参考图，或让 AI 再生成一个角度'); });
      });
      bindActs(host, { newchar: '新建角色：可上传真人形象、从模板选，或让 AI 生成原创角色' });
    }

    function init() {
      renderEps();
      panel('script').innerHTML = emptyBox('📄', '还没有剧本。<br>说一句设定，我先写人物和分集大纲。');
      panel('cast').innerHTML = emptyBox('👤', '还没有角色。');
      panel('settings').innerHTML =
        row('题材', ['都市情感*', '豪门恩怨', '悬疑推理', '重生逆袭']) +
        row('集数', ['12 集', '20 集*', '24 集', '30 集']) +
        row('每集时长', ['1–2 分钟', '2–3 分钟*', '3–5 分钟']) +
        row('版式', ['竖屏 9:16*', '横屏 16:9', '双版都要']) +
        row('影调', ['冷调都市*', '暖调复古', '高对比悬疑', '清新日系']) +
        row('配乐', ['自动匹配*', '手动选曲', '无']) +
        '<div class="sec-label">生成策略</div>' +
        '<div class="seg" data-single style="flex-direction:column;align-items:stretch">' +
          '<button class="on" style="text-align:left;height:auto;padding:10px 12px">先出 3 集看效果，确认后继续' +
          '<span class="dim" style="display:block;font-size:11px;font-weight:400">省额度，推荐</span></button>' +
          '<button style="text-align:left;height:auto;padding:10px 12px">一次全出 20 集' +
          '<span class="dim" style="display:block;font-size:11px;font-weight:400">约 6 小时，消耗 20 额度</span></button>' +
        '</div>' +
        '<div class="sec-label">额度</div><p class="dim" style="font-size:12.5px;line-height:1.8">' +
        '当前策略下，先出 3 集消耗 <b style="color:var(--accent)">3 额度</b><br>免费版剩余 12 额度</p>';
      bindSegs(panel('settings'));
      $('#gridToggle').style.display = 'none';
    }

    return { init: init, run: run, renderEmpty: renderEmpty, renderParams: renderParams,
             defaultPrompt: '做一部都市情感短剧，落魄总裁重生复仇 + 双向救赎，20 集，竖屏' };
  })();

  /* ============================================================
     模式四 · AI App（Vibe Coding）
     ============================================================ */
  var APP = (function () {
    var PLAN = [
      ['页面', '首页 / 写周报 / 团队周报 / 我的'],
      ['数据模型', 'reports · users · mentions 三张表'],
      ['关键能力', '@提及、富文本、导出 PDF、邮件周提醒'],
      ['技术栈', 'Next.js 15 + Postgres + Tailwind']
    ];

    var FILES = [
      { p: 'weekly-report/', d: 0, dir: true },
      { p: 'app/',            d: 1, dir: true },
      { p: 'page.tsx',              d: 2, f: 'app/page.tsx' },
      { p: 'reports/page.tsx',      d: 2, f: 'app/reports/page.tsx' },
      { p: 'api/reports/route.ts',  d: 2, f: 'app/api/reports/route.ts' },
      { p: 'components/',     d: 1, dir: true },
      { p: 'ReportCard.tsx',      d: 2, f: 'components/ReportCard.tsx' },
      { p: 'MentionInput.tsx',    d: 2, f: 'components/MentionInput.tsx' },
      { p: 'ExportPdfButton.tsx', d: 2, f: 'components/ExportPdfButton.tsx' },
      { p: 'lib/db.ts',       d: 1, f: 'lib/db.ts' },
      { p: 'package.json',    d: 1, f: 'package.json' }
    ];

    var CODE = {
      'components/ReportCard.tsx':
        "'use client';\n" +
        "import { formatWeek } from '@/lib/date';\n" +
        "import { Avatar } from './Avatar';\n\n" +
        "type Props = { author: string; week: string; body: string; mentions: string[] };\n\n" +
        "export function ReportCard({ author, week, body, mentions }: Props) {\n" +
        "  // 被 @ 到的人会收到一封邮件提醒\n" +
        "  return (\n" +
        "    <article className=\"rounded-xl border border-white/10 p-4\">\n" +
        "      <header className=\"flex items-center gap-2\">\n" +
        "        <Avatar name={author} />\n" +
        "        <span className=\"font-medium\">{author}</span>\n" +
        "        <time className=\"ml-auto text-xs opacity-60\">{formatWeek(week)}</time>\n" +
        "      </header>\n" +
        "      <p className=\"mt-2 text-sm leading-relaxed\">{body}</p>\n" +
        "      {mentions.length > 0 && (\n" +
        "        <footer className=\"mt-3 flex gap-1\">\n" +
        "          {mentions.map((m) => (\n" +
        "            <span key={m} className=\"text-xs text-amber-400\">@{m}</span>\n" +
        "          ))}\n" +
        "        </footer>\n" +
        "      )}\n" +
        "    </article>\n" +
        "  );\n" +
        "}\n",
      'lib/db.ts':
        "import { sql } from '@vercel/postgres';\n\n" +
        "export type Report = {\n" +
        "  id: string;\n" +
        "  authorId: string;\n" +
        "  week: string;\n" +
        "  body: string;\n" +
        "};\n\n" +
        "// 按周拉取团队全部周报，附带作者与被提及的人\n" +
        "export async function listReports(week: string) {\n" +
        "  const { rows } = await sql`\n" +
        "    select r.*, u.name as author\n" +
        "    from reports r\n" +
        "    join users u on u.id = r.author_id\n" +
        "    where r.week = ${week}\n" +
        "    order by r.created_at desc\n" +
        "  `;\n" +
        "  return rows as Report[];\n" +
        "}\n",
      'app/api/reports/route.ts':
        "import { NextResponse } from 'next/server';\n" +
        "import { listReports } from '@/lib/db';\n\n" +
        "export async function GET(req: Request) {\n" +
        "  const week = new URL(req.url).searchParams.get('week');\n" +
        "  if (!week) {\n" +
        "    return NextResponse.json({ error: 'week is required' }, { status: 400 });\n" +
        "  }\n" +
        "  const reports = await listReports(week);\n" +
        "  return NextResponse.json({ reports });\n" +
        "}\n"
    };

    var TABLES = [
      { n: 'reports', rows: 128, cols: [['id', 'uuid', 'PK'], ['author_id', 'uuid → users'], ['week', 'text'], ['body', 'text'], ['created_at', 'timestamptz']] },
      { n: 'users',   rows: 24,  cols: [['id', 'uuid', 'PK'], ['name', 'text'], ['email', 'text'], ['avatar_url', 'text']] },
      { n: 'mentions', rows: 341, cols: [['id', 'uuid', 'PK'], ['report_id', 'uuid → reports'], ['user_id', 'uuid → users'], ['notified', 'boolean']] }
    ];

    var s = { stage: 0, file: 'components/ReportCard.tsx', device: 'phone', built: false, deployed: false, log: [] };

    /* 极简高亮：仅用于外观演示 */
    // 单次分支替换：分两次 replace 会让第二个正则匹配到第一个插进去的标签
    function hl(src) {
      var re = /(\/\/[^\n]*)|('[^'\n]*'|"[^"\n]*")|\b(import|from|export|function|const|let|return|type|async|await|new|default|interface|if)\b/g;
      return esc(src).replace(re, function (m, comment, str, kw) {
        if (comment) return '<span class="c">' + comment + '</span>';
        if (str) return '<span class="s">' + str + '</span>';
        return '<span class="k">' + kw + '</span>';
      });
    }

    function renderEmpty(host) {
      host.innerHTML =
        '<div class="empty-label" style="margin-top:0">从这些开始 ——</div>' +
        '<div class="starter-grid">' +
          '<button class="starter" data-s="report"><div class="ico">📊</div><b>团队周报工具</b><span>能 @人、能导出 PDF</span></button>' +
          '<button class="starter" data-s="shop"><div class="ico">🧾</div><b>记账小程序</b><span>拍照识别票据，自动归类</span></button>' +
          '<button class="starter" data-s="crm"><div class="ico">💬</div><b>客服后台</b><span>工单、分配、SLA 看板</span></button>' +
        '</div>' +
        '<div class="empty-label">或者从模板开始（点开会把模板 prompt 填进输入框）：</div>' +
        '<div class="sample-row">' +
          [['SaaS 后台', '#3F2A12,#1A1208'], ['活动落地页', '#16283F,#0B1220'],
           ['数据看板', '#2C1840,#140B1E'], ['预约系统', '#12352C,#0A1A16']].map(function (x) {
            return '<button class="sample"><div class="cov" style="background:linear-gradient(160deg,' + x[1] + ')"></div><div class="nm">' + x[0] + '</div></button>';
          }).join('') +
        '</div>';
      $$('.starter', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-s');
          if (k === 'report') input.value = '做一个团队周报工具，能 @人、能导出 PDF，每周五自动提醒';
          if (k === 'shop') input.value = '做一个记账小程序，能拍照识别票据并自动归类，月底出报表';
          if (k === 'crm') input.value = '做一个客服后台，工单分配 + SLA 看板 + 满意度回访';
          autosize(); input.focus();
        });
      });
      $$('.sample', host).forEach(function (b) {
        b.addEventListener('click', function () {
          input.value = '照「' + b.querySelector('.nm').textContent + '」模板做一个，配色用我们的品牌色';
          autosize(); input.focus();
        });
      });
    }

    function renderParams(host) {
      host.innerHTML =
        row('应用类型', ['Web 应用*', '落地页', '内部工具', '小程序']) +
        row('技术栈', ['Next.js*', 'React + Vite', 'Vue + Nuxt']) +
        row('数据库', ['Postgres*', 'SQLite', '不需要']) +
        row('登录方式', ['邮箱*', 'Google', '企业 SSO', '不需要']) +
        row('部署目标', ['SuperX 托管*', '导出源码', '推到 GitHub']);
      bindSegs(host);
    }

    async function run(text) {
      setRunning(true);
      userMsg(text);
      await sleep(500); if (state.abort) return stopped();

      var b = agentBlock();
      var s1 = addStep(b, '理解需求');
      await sleep(900); if (state.abort) return stopped();
      s1.done(3);

      var s2 = addStep(b, '规划页面结构',
        '<div class="tool"><b>🔧 plan_routes</b></div>' +
        '<div class="res">→ /（首页） · /new（写周报） · /reports（团队周报） · /me（我的）</div>' +
        '<div class="tool"><b>🔧 pick_stack</b></div>' +
        '<div class="res">→ Next.js 15 App Router + Tailwind + Postgres</div>');
      await sleep(1400); if (state.abort) return stopped();
      s2.done(9);

      var s3 = addStep(b, '设计数据模型',
        '<div class="tool"><b>🔧 design_schema</b> tables=3</div>' +
        '<div class="res">→ reports(id, author_id, week, body, created_at)</div>' +
        '<div class="res">→ users(id, name, email, avatar_url)</div>' +
        '<div class="res">→ mentions(id, report_id, user_id, notified)</div>');
      await sleep(1500); if (state.abort) return stopped();
      s3.done(12);

      say(b, '我打算这么做：<b>4 个页面 + 3 张表</b>。@提及做成独立的 mentions 表，' +
             '这样"谁被 @ 了、提醒发没发"可以单独查，以后加邮件提醒不用改结构。');

      renderDb(); tabCount('db', 3);
      artifactCard(b, '📐', '实现方案',
        PLAN.map(function (p) {
          return '<div class="script-line"><b>' + p[0] + '</b><span class="dim">' + p[1] + '</span></div>';
        }).join(''), 'db');

      await sleep(340);
      say(b, '方案没问题的话我就开始写了。', 'small');
      setRunning(false);

      quickReplies(b, [['go', '开始生成', '2 额度'], ['plan', '我要改方案'], ['stack', '换个技术栈']], function (q) {
        if (q === 'plan') {
          userMsg('我要改方案');
          say(agentBlock(), '好，说说改哪块——页面、数据表还是能力？也可以直接在「数据库」Tab 里改表结构，我按新结构重写代码。', 'small');
          openTab('db', true);
          return;
        }
        if (q === 'stack') {
          userMsg('换个技术栈');
          say(agentBlock(), '可选 React + Vite（更轻）或 Vue + Nuxt。在输入框下面的「🎛 参数」里改，改完说「按新栈重来」就行。', 'small');
          return;
        }
        build();
      });
    }

    async function build() {
      userMsg('开始生成');
      setRunning(true); state.abort = false;
      await sleep(400);

      var b = agentBlock();
      var writeable = FILES.filter(function (f) { return f.f; });
      var card = add(b,
        '<div class="artifact"><div class="artifact-head">⌨ 正在编写 ' + writeable.length + ' 个文件</div>' +
        '<div class="artifact-body"><div id="fileWrite"></div>' +
        '<div class="batch-foot" style="margin-top:10px"><span class="bstat">准备中…</span>' +
        '<a class="link" href="#" data-open>在工作台查看 →</a></div></div></div>');
      card.querySelector('[data-open]').addEventListener('click', function (e) { e.preventDefault(); openTab('preview', true); });

      var listHost = $('#fileWrite', card), bstat = $('.bstat', card);
      s.stage = 0; renderPreview();

      for (var i = 0; i < writeable.length; i++) {
        if (state.abort) { bstat.textContent = '已停止，已写入的文件保留'; setRunning(false); return; }
        var f = writeable[i];
        var lineEl = el('<div class="script-line"><b style="color:var(--accent)">⟳</b>' +
          '<span class="mono" style="font-size:11.5px">' + f.f + '</span></div>');
        listHost.appendChild(lineEl); scrollDown();
        bstat.textContent = '写入 ' + f.f;
        await sleep(260);
        lineEl.querySelector('b').textContent = '✓';
        lineEl.querySelector('b').style.color = 'var(--ok)';
        s.stage = Math.min(3, Math.floor((i + 1) / writeable.length * 3.99));
        renderCode(); renderPreview(); tabCount('code', i + 1);
      }

      bstat.textContent = writeable.length + '/' + writeable.length + ' 已写入';
      s.built = true;

      await sleep(300);
      var s4 = addStep(b, '安装依赖并启动',
        '<div class="tool"><b>$ npm install</b></div>' +
        '<div class="res">→ added 214 packages in 8s</div>' +
        '<div class="tool"><b>$ npm run dev</b></div>' +
        '<div class="res">→ ready on http://localhost:3000</div>');
      await sleep(1500);
      s4.done(11);

      s.stage = 3; renderPreview(); renderDeploy();

      report(b, '应用已经跑起来了', [
        '4 个页面 · 8 个文件 · 3 张表',
        '已实现：@提及、富文本编辑、导出 PDF、周五邮件提醒',
        '预览地址：weekly-report.superx.app（临时，部署后换正式域名）',
        '源码随时可导出，不锁定'
      ], 2);

      setRunning(false);
      openTab('preview');

      quickReplies(b, [['deploy', '一键部署', '1 额度'], ['edit', '我还要改'], ['export', '导出源码']], function (q) {
        if (q === 'export') { toast('正在打包源码…（外观稿未接入）'); return; }
        if (q === 'edit') {
          userMsg('把周报列表改成看板，按状态分列');
          var b2 = agentBlock();
          say(b2, '这类改动只动一个组件。改完右边预览会直接变，不用重新生成整个应用。', 'small');
          add(b2, '<div class="tool-call"><span class="sp">✦</span> 改写 components/ReportBoard.tsx <span class="ok">✓</span></div>');
          toast('外观稿到此为止：真实产品这里会实时重绘预览');
          return;
        }
        deploy();
      });
    }

    async function deploy() {
      userMsg('一键部署');
      setRunning(true);
      await sleep(400);
      var b = agentBlock();
      openTab('deploy', true);

      var lines = [
        ['run', '$ superx deploy --prod'],
        ['', '  正在打包…'],
        ['', '  ✓ 编译 8 个文件'],
        ['', '  ✓ 生成静态页 4 个'],
        ['', '  ✓ 迁移数据库 3 张表'],
        ['', '  ✓ 绑定域名 weekly-report.superx.app'],
        ['ok', '  部署完成 · 用时 24s']
      ];
      s.log = [];
      for (var i = 0; i < lines.length; i++) {
        if (state.abort) break;
        s.log.push(lines[i]);
        renderDeploy();
        await sleep(420);
      }
      s.deployed = true;
      renderDeploy();

      report(b, '已上线', [
        '地址：https://weekly-report.superx.app',
        '自定义域名可在「部署」Tab 里绑',
        '后续每次改动都会自动重新部署'
      ], 1);
      setRunning(false);
    }

    /* ---------- 右栏：预览 ---------- */
    function renderPreview() {
      var host = panel('preview');
      if (!s.stage && !s.built) {
        host.innerHTML = emptyBox('📱', '还没有应用。<br>说一句你想做什么，预览会出现在这里。');
        return;
      }
      var st = s.stage;
      host.innerHTML =
        '<div class="device-bar"><div class="seg2" id="devSeg">' +
          ['phone', 'tablet', 'desktop'].map(function (d, i) {
            return '<button data-d="' + d + '" class="' + (s.device === d ? 'on' : '') + '">' +
              ['手机', '平板', '桌面'][i] + '</button>';
          }).join('') +
        '</div><span class="url">🔒 weekly-report.superx.app</span></div>' +

        '<div class="device ' + s.device + '">' +
          '<div class="chrome"><i></i><i></i><i></i><span class="u">weekly-report.superx.app</span></div>' +
          '<div class="fake">' +
            '<div class="fh grow-in"><b>团队周报</b>' + (st >= 2 ? '<span class="btn-x">导出 PDF</span>' : '') + '</div>' +
            (st >= 1 ? '<div class="weeks grow-in"><span class="on">本周</span><span>上周</span><span>W37</span></div>' : '') +
            (st >= 1 ? card('Maya', '完成了投放素材的批量生成，成本降到每条 3 元以内。', ['Arga'], '#0B62CE') : '') +
            (st >= 2 ? card('Arga', '短剧前三集已过审，本周进入 EP04–EP06。', ['Maya', 'Yusuf'], '#12B5C0') : '') +
            (st >= 3 ? card('Yusuf', '客服工单积压清零，SLA 达标率 98%。', [], '#F59E0B') : '') +
          '</div>' +
        '</div>' +

        (s.built ? '<div class="sec-label">本次实现</div>' +
          '<div class="cast">' +
            ['@提及', '富文本编辑', '导出 PDF', '周五邮件提醒', '邮箱登录'].map(function (t) {
              return '<span class="chip" style="height:30px;font-size:12px">' + t + '</span>';
            }).join('') +
          '</div>' : '');

      $$('#devSeg button', host).forEach(function (b) {
        b.addEventListener('click', function () { s.device = b.getAttribute('data-d'); renderPreview(); });
      });
    }
    function card(who, body, ats, color) {
      return '<div class="card-x grow-in"><div class="who">' +
        '<span class="ava" style="background:linear-gradient(140deg,' + color + ',#151522)"></span>' +
        '<b style="font-size:11px">' + who + '</b>' +
        '<span class="dim" style="margin-left:auto;font-size:10px">W38</span></div>' +
        '<div style="color:var(--text-2);line-height:1.6">' + body + '</div>' +
        (ats.length ? '<div style="margin-top:6px" class="mention">' + ats.map(function (a) { return '@' + a; }).join(' ') + '</div>' : '') +
        '</div>';
    }

    /* ---------- 右栏：代码 ---------- */
    function renderCode() {
      var host = panel('code');
      if (!s.stage && !s.built) { host.innerHTML = emptyBox('⌨', '还没有代码。'); return; }
      var written = FILES.filter(function (f) { return f.f; })
        .slice(0, s.built ? 99 : Math.max(1, Math.round((s.stage + 1) / 4 * 8)))
        .map(function (f) { return f.f; });

      host.innerHTML =
        '<div class="code-split"><div class="tree">' +
          FILES.map(function (f) {
            var on = f.f === s.file;
            var pad = 7 + f.d * 13;
            if (f.dir) return '<button disabled style="padding-left:' + pad + 'px;opacity:.75;cursor:default">📁 ' + f.p + '</button>';
            var has = written.indexOf(f.f) > -1;
            return '<button class="' + (on ? 'on' : '') + '" data-f="' + f.f + '" style="padding-left:' + pad + 'px;' +
              (has ? '' : 'opacity:.35') + '">📄 ' + f.p + (has ? '<span class="new">新增</span>' : '') + '</button>';
          }).join('') +
        '</div>' +
        '<div class="code"><div class="ch">📄 <span class="fn">' + s.file + '</span>' +
          '<button class="cp" data-act="copy">复制</button></div>' +
          '<pre>' + (CODE[s.file] ? hl(CODE[s.file]) : '<span class="c">// ' + s.file + ' 的内容在外观稿里没写</span>') + '</pre></div></div>';

      $$('[data-f]', host).forEach(function (b) {
        b.addEventListener('click', function () { s.file = b.getAttribute('data-f'); renderCode(); });
      });
      bindActs(host, { copy: '已复制 ' + s.file });
    }

    /* ---------- 右栏：数据库 ---------- */
    function renderDb() {
      panel('db').innerHTML =
        '<div class="crumb">Postgres <span class="sep">·</span> weekly_report</div>' +
        TABLES.map(function (t) {
          return '<div class="tbl"><div class="th">▤ ' + t.n +
            '<span class="rows">' + t.rows + ' 行</span></div>' +
            t.cols.map(function (c) {
              return '<div class="col"><span class="nm">' + c[0] + (c[2] ? ' <span class="pk">' + c[2] + '</span>' : '') +
                '</span><span class="ty">' + c[1] + '</span></div>';
            }).join('') + '</div>';
        }).join('') +
        '<div class="hint">💡 表结构可以直接改，改完我会把受影响的代码一起重写——不用你自己去找哪些文件引用了它。</div>';
    }

    /* ---------- 右栏：部署 ---------- */
    function renderDeploy() {
      var host = panel('deploy');
      if (!s.built) { host.innerHTML = emptyBox('🚀', '应用还没生成。'); return; }
      host.innerHTML =
        '<div class="deploy-box">' +
          (s.deployed
            ? '<div class="deploy-url"><span class="live"></span>https://weekly-report.superx.app<button class="cp" data-act="copy">复制</button></div>'
            : '<p class="dim" style="font-size:12.5px;margin-bottom:14px">还没部署。部署后会拿到一个正式地址，后续改动自动重新发布。</p>') +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            '<button class="sbtn primary" data-act="' + (s.deployed ? 'redeploy' : 'deploy') + '">' +
              (s.deployed ? '⟳ 重新部署' : '🚀 一键部署 · 1 额度') + '</button>' +
            '<button class="sbtn" data-act="domain">🌐 自定义域名</button>' +
          '</div>' +
          (s.log.length ? '<div class="sec-label">构建日志</div><div class="build-log">' +
            s.log.map(function (l) { return '<div class="' + l[0] + '">' + esc(l[1]) + '</div>'; }).join('') +
            '</div>' : '') +
        '</div>' +
        '<div class="sec-label">导出</div>' +
        '<div style="display:grid;gap:8px">' +
          '<button class="sbtn" data-act="zip">⤓ 下载源码 zip</button>' +
          '<button class="sbtn" data-act="git">↗ 推到 GitHub 仓库</button>' +
        '</div>' +
        '<p class="dim" style="font-size:12px;line-height:1.8;margin-top:12px">' +
        '源码是标准 Next.js 工程，不含私有运行时，拿走就能自己跑。</p>';

      bindActs(host, {
        copy: '已复制地址', domain: '绑定自定义域名需要加一条 CNAME 记录',
        zip: '正在打包源码…（外观稿未接入）', git: '将创建一个新仓库并推送（外观稿未接入）',
        redeploy: '正在重新部署…（外观稿未接入）'
      });
      var dep = host.querySelector('[data-act="deploy"]');
      if (dep) dep.addEventListener('click', function () { deploy(); });
    }

    function init() {
      renderPreview();
      panel('code').innerHTML = emptyBox('⌨', '还没有代码。');
      panel('db').innerHTML = emptyBox('▤', '还没有数据表。');
      panel('deploy').innerHTML = emptyBox('🚀', '应用还没生成。');
      $('#gridToggle').style.display = 'none';
    }

    return {
      init: init, run: run, renderEmpty: renderEmpty, renderParams: renderParams,
      defaultPrompt: '做一个团队周报工具，能 @人、能导出 PDF，每周五自动提醒',
      envBadge: '<b>Next.js 15</b><span class="sep">·</span>weekly-report',
      composerExtra:
        '<select class="mini-sel" title="生成模型"><option>SuperX Code v3</option><option>v3 Fast</option></select>' +
        '<select class="mini-sel" title="思考强度"><option>标准</option><option>深度</option></select>'
    };
  })();

  /* ============================================================
     未实现的模式
     ============================================================ */
  var TODO = {
    defaultPrompt: '',
    init: function () {
      TABS[mode].forEach(function (t) { panel(t[0]).innerHTML = emptyBox('🚧', '这个模式的工作台还没做。'); });
      $('#gridToggle').style.display = 'none';
    },
    renderParams: function (host) { host.innerHTML = '<p class="dim" style="font-size:12.5px">该模式的参数面板还没做。</p>'; },
    renderEmpty: function (host) {
      host.innerHTML =
        '<div style="max-width:560px;margin:0 auto;padding:22px;border-radius:14px;' +
        'border:1px solid var(--line);background:rgba(255,255,255,.03);text-align:left">' +
        '<div style="font-size:14px;font-weight:600;margin-bottom:8px">「' + M.name + '」的工作台还没做</div>' +
        '<p class="dim" style="font-size:13px;line-height:1.8">四个模式共用同一套壳（左栏、对话流、输入区、状态规范），' +
        '只有右栏工作台的 Tab 和控件不同。目前 <b>AI 短视频</b>、<b>AI 短剧</b> 和 <b>AI App</b> 三条线已经做完整了，' +
        '其余按 <span class="mono">docs/design/05-studio.md</span> 的规格套同一套壳即可。</p>' +
        '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">' +
        '<a href="studio.html?mode=video" class="sbtn primary" style="display:inline-flex;padding:0 16px;height:34px">看 AI 短视频 →</a>' +
        '<a href="studio.html?mode=drama" class="sbtn" style="display:inline-flex;padding:0 16px;height:34px">看 AI 短剧 →</a>' +
        '<a href="studio.html?mode=app" class="sbtn" style="display:inline-flex;padding:0 16px;height:34px">看 AI App →</a>' +
        '</div></div>';
    },
    run: function () {}
  };

  /* ============================================================
     小工具（模式实现共用）
     ============================================================ */
  function row(label, opts) {
    return '<div class="prow"><span>' + label + '</span><div class="seg" data-single>' +
      opts.map(function (o) {
        var on = o.slice(-1) === '*';
        return '<button class="' + (on ? 'on' : '') + '">' + (on ? o.slice(0, -1) : o) + '</button>';
      }).join('') + '</div></div>';
  }
  function mrow(label, opts) {
    return '<div class="mrow"><span>' + label + '</span><select class="mini-select">' +
      opts.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></div>';
  }
  function sd(k, v, act, key) {
    return '<div class="sd-row"><span class="k">' + k + '</span><span class="v">' + v + '</span>' +
      '<button class="act" data-act="' + key + '">' + act + '</button></div>';
  }
  function emptyBox(icon, text) {
    return '<div class="side-empty"><div><div class="ic">' + icon + '</div><p>' + text + '</p></div></div>';
  }
  function bindActs(host, map) {
    $$('[data-act]', host).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var m = map[b.getAttribute('data-act')];
        if (m) toast(m);
      });
    });
  }

  /* ============================================================
     装配
     ============================================================ */
  var IMPL = ({ video: VIDEO, drama: DRAMA, app: APP })[mode] || TODO;
  IMPL.renderEmpty($('#emptyBody'));
  IMPL.renderParams($('#params'));
  IMPL.init();
  if (IMPL.envBadge) { $('#envBadge').innerHTML = IMPL.envBadge; $('#envBadge').hidden = false; }
  if (IMPL.composerExtra) $('#composerExtra').innerHTML = IMPL.composerExtra;
  openTab(TABS[mode][0][0], false);

})();
