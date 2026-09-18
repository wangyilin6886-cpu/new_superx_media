/* ============================================================
   SuperX Studio · 交互
   外观演示：全部为本地假数据，不发任何网络请求
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); };

  /* ============================================================
     假数据
     ============================================================ */
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
    { id: 1, name: '换季爆皮的姐妹进来', dur: 16, tint: ['#5A1E2C', '#24101A'], status: 'ok' },
    { id: 2, name: '这瓶我空瓶三次了',   dur: 15, tint: ['#4A2038', '#1C0F1A'], status: 'ok' },
    { id: 3, name: '别再买贵的了',       dur: 18, tint: ['#3E1A2A', '#180B12'], status: 'ok' },
    { id: 4, name: '成分党看过来',       dur: 0,  tint: ['#2A1A1E', '#140A0C'], status: 'fail' },
    { id: 5, name: '油皮姐妹的救星',     dur: 17, tint: ['#54202E', '#20101A'], status: 'ok' }
  ];

  var BASE_SHOTS = [
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

  /* ============================================================
     状态
     ============================================================ */
  var state = {
    started: false,
    running: false,
    abort: false,
    clips: [],
    scripts: [],
    selClip: 1,
    selShot: 0,
    grid: false,
    selected: {},     // 网格模式勾选
    playing: false,
    t: 0,
    timer: null
  };

  /* ============================================================
     模式（?mode=video|drama|education|app）
     本次只实现了 AI 短视频的完整工作台
     ============================================================ */
  var MODES = {
    video:     { name: 'AI 短视频', chat: '冬季新品投放', ask: '你想做什么样的短视频？' },
    drama:     { name: 'AI 短剧',   chat: '新短剧',       ask: '你想做一部什么样的短剧？' },
    education: { name: 'AI 教育',   chat: '新课程',       ask: '你想做哪一门课？' },
    app:       { name: 'AI App',    chat: '新应用',       ask: '你想做一个什么应用？' }
  };
  var mode = new URLSearchParams(location.search).get('mode');
  if (!MODES[mode]) mode = 'video';
  document.body.setAttribute('data-mode', mode);
  document.title = 'SuperX Studio · ' + MODES[mode].name;
  $('#chatTitle').textContent = MODES[mode].chat;
  var askEl = $('.empty .dot-title');
  if (askEl) askEl.innerHTML = '<i></i>' + MODES[mode].ask;

  if (mode !== 'video') {
    var empty = $('#empty');
    $$('.empty-label, .starter-grid, .sample-row', empty).forEach(function (n) { n.remove(); });
    var notice = document.createElement('div');
    notice.style.cssText = 'max-width:520px;margin:0 auto;padding:22px;border-radius:14px;' +
      'border:1px solid var(--line);background:rgba(255,255,255,.03);text-align:left';
    notice.innerHTML =
      '<div style="font-size:14px;font-weight:600;margin-bottom:8px">「' + MODES[mode].name + '」的工作台还没做</div>' +
      '<p class="dim" style="font-size:13px;line-height:1.8">四个模式共用同一套壳（左栏、对话流、输入区、状态规范），' +
      '只有右栏工作台的 Tab 和控件不同。本次先把 AI 短视频这条线做完整，' +
      '其余三条按 <span class="mono">docs/design/05-studio.md</span> 的规格套同一套壳即可。</p>' +
      '<a href="studio.html" class="sbtn primary" style="display:inline-flex;margin-top:14px;padding:0 16px;height:34px">' +
      '去 AI 短视频模式看完整流程 →</a>';
    empty.appendChild(notice);
  }

  /* ============================================================
     通用 UI
     ============================================================ */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  var isNarrow = function () { return window.innerWidth <= 768; };

  // 侧栏折叠
  $('#navToggle').addEventListener('click', function () {
    if (isNarrow()) document.body.classList.remove('nav-open');
    else document.body.classList.toggle('nav-collapsed');
  });
  $('#navOpen').addEventListener('click', function () { document.body.classList.add('nav-open'); });
  $('#scrim').addEventListener('click', function () { document.body.classList.remove('nav-open'); });

  function setSide(open) { document.body.classList.toggle('side-collapsed', !open); }
  $('#sideToggle').addEventListener('click', function () {
    setSide(document.body.classList.contains('side-collapsed'));
  });
  $('#sideClose').addEventListener('click', function () { setSide(false); });
  $('#sideOpen').addEventListener('click', function () { setSide(true); });

  // ⌘\ / Ctrl+\ 开关工作台
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
      e.preventDefault();
      setSide(document.body.classList.contains('side-collapsed'));
    }
  });

  // 窄屏默认收起工作台
  function applyWidth() {
    $('#navOpen').style.display = isNarrow() ? 'grid' : 'none';
    if (window.innerWidth <= 1024 && !state.started) setSide(false);
  }
  applyWidth();
  window.addEventListener('resize', applyWidth);

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
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-mode');
      if (m === 'video') { location.reload(); return; }
      toast('「' + b.querySelector('span').childNodes[0].textContent.trim() + '」模式的工作台还没做，本次只实现了 AI 短视频');
    });
  });

  // 项目树折叠
  $$('[data-folder]').forEach(function (f) {
    f.addEventListener('click', function () {
      f.classList.toggle('open');
      var files = f.nextElementSibling;
      if (files && files.hasAttribute('data-files')) files.hidden = !f.classList.contains('open');
    });
  });

  // 会话切换（演示）
  $$('.chat-item').forEach(function (c) {
    c.addEventListener('click', function () {
      $$('.chat-item').forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      $('#chatTitle').textContent = c.querySelector('.t').textContent;
      if (isNarrow()) document.body.classList.remove('nav-open');
    });
  });

  // 右栏 Tab
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () { openTab(t.getAttribute('data-tab')); });
  });
  // reveal=true 才强制展开工作台；窄屏下自动展开会盖住对话，所以默认不展开
  function openTab(name, reveal) {
    $$('.tab').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-tab') === name); });
    $$('.panel').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-panel') === name); });
    $('#gridToggle').style.display = name === 'clips' ? 'grid' : 'none';
    if (reveal || window.innerWidth > 1024) setSide(true);
  }

  $('#gridToggle').addEventListener('click', function () {
    state.grid = !state.grid;
    $('#gridToggle').textContent = state.grid ? '▤' : '⊞';
    $('#gridToggle').classList.toggle('on', state.grid);
    renderClips();
  });

  // 参数面板
  $('#paramBtn').addEventListener('click', function () {
    var open = $('#params').classList.toggle('open');
    $('#paramBtn').classList.toggle('on', open);
  });
  $$('.seg[data-single]').forEach(function (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', seg).forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
  });

  // 输入框
  var input = $('#input'), chips = $('#chips');
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  });

  $('#addBtn').addEventListener('click', function () { addChip('🔗 tmall.com/item/8823…'); });
  $('#atBtn').addEventListener('click', function () {
    input.value += (input.value ? ' ' : '') + '@脚本③ ';
    input.focus(); autosize();
    toast('可以 @ 脚本、成片、角色或品牌知识库');
  });
  function addChip(text) {
    if ($$('.chip-a', chips).some(function (c) { return c.textContent.indexOf(text.slice(2, 10)) > -1; })) return;
    var c = el('<span class="chip-a">' + text + '<button aria-label="移除">✕</button></span>');
    c.querySelector('button').addEventListener('click', function () { c.remove(); });
    chips.appendChild(c);
  }

  // 空状态起手式
  $$('.starter').forEach(function (s) {
    s.addEventListener('click', function () {
      var k = s.getAttribute('data-starter');
      if (k === 'link') { addChip('🔗 tmall.com/item/8823…'); input.value = '用这个链接做 5 条投放素材，主打保湿，要痛点式开场'; }
      if (k === 'copy') { input.value = '这段文案帮我做成 5 条短视频：五重玻尿酸复配、零香精零酒精、pH 5.5…'; }
      if (k === 'ref')  { addChip('🎬 参考视频.mp4'); input.value = '照这条的结构做 5 条同款，换成我的产品'; }
      autosize(); input.focus();
    });
  });
  $$('.sample').forEach(function (s) {
    s.addEventListener('click', function () {
      toast('样例「' + s.getAttribute('data-sample') + '」：完整对话记录 + 原始 prompt（外观稿未接入）');
    });
  });

  /* ============================================================
     发送 / 演示流程
     ============================================================ */
  var sendBtn = $('#send');
  sendBtn.addEventListener('click', onSend);

  function onSend() {
    if (state.running) { state.abort = true; return; }
    if (mode !== 'video') { toast('「' + MODES[mode].name + '」模式的工作台还没做，先去 AI 短视频模式看完整流程'); return; }
    var text = input.value.trim() || '用这个链接做 5 条投放素材，主打保湿，要痛点式开场';
    var attach = $$('.chip-a', chips).map(function (c) { return c.textContent.replace('✕', '').trim(); });
    input.value = ''; autosize();
    chips.innerHTML = '';
    $('#params').classList.remove('open');
    $('#paramBtn').classList.remove('on');
    runDemo(text, attach);
  }

  function setRunning(on) {
    state.running = on;
    sendBtn.textContent = on ? '⏹' : '↑';
    sendBtn.classList.toggle('stop', on);
    sendBtn.setAttribute('aria-label', on ? '停止' : '发送');
  }

  var thread = $('#thread'), inner = $('#threadInner');
  function scrollDown() { thread.scrollTop = thread.scrollHeight; }
  function push(node) { inner.appendChild(node); scrollDown(); return node; }

  function userMsg(text, attach) {
    var a = (attach || []).map(function (t) { return '<span class="attach">' + t + '</span>'; }).join('');
    return push(el(
      '<div class="msg msg-user"><div class="bubble">' + esc(text) + a + '</div></div>'
    ));
  }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); }

  function agentBlock() {
    return push(el('<div class="msg"><div class="agent-head"><span class="mark"></span>SuperX</div></div>'));
  }

  // 一个可展开的步骤行
  function addStep(block, label, detailHtml) {
    var step = el(
      '<div class="step">' +
        '<button class="step-row"><span class="st run">◌</span><span class="lb">' + label + '</span>' +
        '<span class="dur"></span><span class="tw">' + (detailHtml ? '▸' : '') + '</span></button>' +
        (detailHtml ? '<div class="step-detail">' + detailHtml + '</div>' : '') +
      '</div>'
    );
    if (detailHtml) {
      step.querySelector('.step-row').addEventListener('click', function () { step.classList.toggle('open'); });
    }
    block.appendChild(step); scrollDown();
    return {
      done: function (sec) {
        var st = step.querySelector('.st');
        st.classList.remove('run'); st.textContent = '✓';
        step.querySelector('.dur').textContent = sec + 's';
      }
    };
  }

  function say(block, html, cls) {
    var p = el('<p class="say ' + (cls || '') + '">' + html + '</p>');
    block.appendChild(p); scrollDown(); return p;
  }
  function add(block, html) { var n = el(html); block.appendChild(n); scrollDown(); return n; }

  async function runDemo(text, attach) {
    // 首次：清掉空状态
    if (!state.started) {
      state.started = true;
      $('#empty').remove();
      inner.hidden = false;
      if (window.innerWidth > 1024) setSide(true);
    }
    state.abort = false;
    setRunning(true);

    userMsg(text, attach.length ? attach : ['🔗 tmall.com/item/8823…']);
    await sleep(500);
    if (state.abort) return stopped();

    var b = agentBlock();

    var s1 = addStep(b, '理解需求');
    await sleep(900); if (state.abort) return stopped();
    s1.done(3);

    var s2 = addStep(b, '分析商品页',
      '<div class="tool"><b>🔧 read_url</b> tmall.com/item/8823…</div>' +
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
    await sleep(350);

    add(b, '<div class="tool-call"><span class="sp">✦</span> 脚本生成 <span class="ok">✓</span></div>');

    state.scripts = SCRIPTS;
    renderScripts();
    $('#scriptCount').textContent = ' 5';

    var card = add(b,
      '<div class="artifact">' +
        '<div class="artifact-head">📄 口播脚本 × 5 <span class="open">查看 →</span></div>' +
        '<div class="artifact-body">' +
          SCRIPTS.map(function (s) {
            return '<div class="script-line"><b>' + s.n + '</b>' + s.hook + '</div>';
          }).join('') +
        '</div>' +
      '</div>');
    card.addEventListener('click', function () { openTab('scripts', true); });

    await sleep(400);
    say(b, '要我直接按第 ① 版出片，还是先改脚本？', 'small');

    var quick = add(b,
      '<div class="quick">' +
        '<button data-q="one">按 ① 出片 <span class="dim">· 1 额度</span></button>' +
        '<button data-q="all">5 版全出 <span class="dim">· 5 额度</span></button>' +
        '<button data-q="edit">我要改脚本</button>' +
      '</div>');

    setRunning(false);

    $$('button', quick).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-q');
        quick.remove();
        if (q === 'edit') {
          userMsg('我要改脚本');
          var b2 = agentBlock();
          say(b2, '好，脚本在右边「脚本」Tab，直接改就行。改完点「按这版出片」，或者告诉我改哪一版怎么改。', 'small');
          openTab('scripts', true);
          return;
        }
        generate(q === 'all' ? 5 : 1);
      });
    });
  }

  function stopped() {
    setRunning(false);
    var b = agentBlock();
    say(b, '已停止。已生成的内容都保留了，没有扣额度。', 'small');
  }

  /* ---------- 批量生成 ---------- */
  async function generate(count) {
    userMsg(count === 5 ? '5 版全出' : '按 ① 出片');
    setRunning(true);
    state.abort = false;
    await sleep(400);

    var b = agentBlock();
    var clips = CLIPS.slice(0, count).map(function (c) { return Object.assign({}, c, { status: 'queue' }); });

    var card = add(b,
      '<div class="artifact">' +
        '<div class="artifact-head">🎬 正在生成 ' + count + ' 条成片</div>' +
        '<div class="artifact-body">' +
          '<div class="batch-tiles">' +
            clips.map(function (c, i) {
              return '<div class="tile" data-i="' + i + '"><div class="fill" style="height:0"></div><span>排队</span></div>';
            }).join('') +
          '</div>' +
          '<div class="batch-foot"><span class="bstat">排队中…</span>' +
            '<a class="link" href="#" data-open>在工作台查看 →</a></div>' +
        '</div>' +
      '</div>');
    card.querySelector('[data-open]').addEventListener('click', function (e) { e.preventDefault(); openTab('clips', true); });

    var tiles = $$('.tile', card), bstat = $('.bstat', card);
    var doneCount = 0;

    for (var i = 0; i < clips.length; i++) {
      if (state.abort) { bstat.textContent = '已停止，已完成的保留'; setRunning(false); return; }
      var tile = tiles[i], c = clips[i];
      tile.classList.add('run');
      tile.querySelector('span').textContent = '0%';
      bstat.textContent = '正在生成第 ' + (i + 1) + ' 条 · 合成镜头与配音';

      for (var p = 0; p <= 100; p += 20) {
        if (state.abort) break;
        tile.querySelector('.fill').style.height = p + '%';
        tile.querySelector('span').textContent = p + '%';
        await sleep(160);
      }

      tile.classList.remove('run');
      if (c.status === 'queue' && c.id === 4) {
        tile.classList.add('fail');
        tile.querySelector('.fill').style.height = '0';
        tile.querySelector('span').textContent = '✕';
        c.status = 'fail';
      } else {
        tile.classList.add('ok');
        tile.querySelector('.fill').style.height = '0';
        tile.querySelector('span').textContent = '✓';
        c.status = 'ok';
        doneCount++;
      }
      state.clips = clips.slice(0, i + 1);
      renderClips();
      $('#clipCount').textContent = ' ' + doneCount;
    }

    bstat.textContent = doneCount + '/' + count + ' 已完成';

    // 失败卡
    if (clips.some(function (c) { return c.status === 'fail'; })) {
      await sleep(300);
      var fail = add(b,
        '<div class="fail-card">' +
          '<div class="fh">⚠ 第 ④ 条生成失败</div>' +
          '<div class="fb">' +
            '<div class="row"><span class="dim">原因：</span>素材匹配超时——第 3 个镜头「成分表特写」在素材库里找不到合适的空镜。</div>' +
            '<div class="row"><span class="dim">建议：</span>换一个镜头描述，或者允许我用 AI 生成这个镜头。</div>' +
            '<div class="acts">' +
              '<button data-f="retry">重试</button>' +
              '<button data-f="ai">用 AI 生成镜头</button>' +
              '<button data-f="skip">跳过这条</button>' +
            '</div>' +
            '<div class="note">✓ 这条不扣额度</div>' +
          '</div>' +
        '</div>');
      $$('button', fail).forEach(function (fb) {
        fb.addEventListener('click', function () {
          var k = fb.getAttribute('data-f');
          if (k === 'skip') { fail.remove(); toast('已跳过第 ④ 条，额度未扣除'); return; }
          toast(k === 'ai' ? '正在用 AI 生成第 3 个镜头…（外观稿到此为止）' : '正在重试第 ④ 条…（外观稿到此为止）');
        });
      });
    }

    await sleep(400);
    var okList = clips.filter(function (c) { return c.status === 'ok'; });
    add(b,
      '<div class="report">' +
        '<b>' + okList.length + ' 条成片已生成</b>' +
        '<ul>' +
          '<li>时长：' + Math.min.apply(null, okList.map(function (c) { return c.dur; })) + '–' +
            Math.max.apply(null, okList.map(function (c) { return c.dur; })) + ' 秒</li>' +
          '<li>格式：9:16 · 1080×1920</li>' +
          '<li>音色：温柔女声（可在工作台更换）</li>' +
          '<li>第 ③ 版口播语速偏快，我已经调到 0.95x</li>' +
        '</ul>' +
      '</div>');

    add(b, '<div class="done-bar"><span class="st">✓</span> 全部任务已完成 <span style="margin-left:auto;color:var(--text-3)">消耗 ' + okList.length + ' 额度</span></div>');

    var acts = add(b, '<div class="msg-acts"><button data-a="copy">⧉ 复制</button><button data-a="dl">⤓ 全部下载</button><button data-a="more">↻ 再来 5 条</button></div>');
    $$('button', acts).forEach(function (ab) {
      ab.addEventListener('click', function () {
        var a = ab.getAttribute('data-a');
        if (a === 'more') { generate(5); return; }
        toast(a === 'copy' ? '已复制汇报内容' : '开始下载 ' + okList.length + ' 条成片…（外观稿未接入）');
      });
    });

    setRunning(false);
    openTab('clips');
  }

  /* ============================================================
     右栏渲染
     ============================================================ */
  function shotsFor(clip) {
    var ratio = clip.dur / 16;
    var prev = 0;
    return BASE_SHOTS.map(function (s) {
      var end = Math.round(s.end * ratio * 10) / 10;
      var o = Object.assign({}, s, { start: prev, endT: end });
      prev = end;
      return o;
    });
  }

  function fmt(t) {
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function renderClips() {
    var host = $('#panelClips');
    var ok = state.clips.filter(function (c) { return c.status === 'ok'; });
    if (!ok.length) {
      host.innerHTML = '<div class="side-empty"><div><div class="ic">🎬</div>' +
        '<p>还没有成片。<br>在左边说一句你要什么，产出会出现在这里。</p></div></div>';
      return;
    }
    if (state.grid) { renderGrid(host); return; }

    if (!ok.some(function (c) { return c.id === state.selClip; })) state.selClip = ok[0].id;
    var clip = ok.filter(function (c) { return c.id === state.selClip; })[0];
    var shots = shotsFor(clip);
    var shot = shots[Math.min(state.selShot, shots.length - 1)];

    host.innerHTML =
      '<div class="player">' +
        '<div class="stage9" style="background:linear-gradient(165deg,' + clip.tint[0] + ',' + clip.tint[1] + ')">' +
          '<button class="play" id="playBtn" aria-label="播放">▶</button>' +
          '<div class="sub9" id="sub9">' + shot.sub + '</div>' +
          '<div class="scrub"><div class="bar"><i id="bar" style="width:0%"></i></div>' +
            '<div class="t"><span id="tnow">00:00</span><span>' + fmt(clip.dur) + '</span></div></div>' +
        '</div>' +
        '<div class="meta">' +
          '<h3>' + clip.name + '</h3>' +
          '<div class="cap">' + clip.dur + 's · 1080×1920 · 9:16</div>' +
          '<div class="mrow"><span>音色</span><select class="mini-select"><option>温柔女声</option><option>活力女声</option><option>沉稳男声</option></select></div>' +
          '<div class="mrow"><span>BGM</span><select class="mini-select"><option>轻快电子</option><option>温暖钢琴</option><option>无</option></select></div>' +
          '<div class="mrow"><span>字幕</span><select class="mini-select"><option>简约白</option><option>描边黄</option><option>关闭</option></select></div>' +
          '<div class="acts">' +
            '<button class="sbtn primary" data-act="dl">⤓ 下载</button>' +
            '<button class="sbtn" data-act="re">⟳ 重新生成</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="sec-label">分镜</div>' +
      '<div class="shots">' +
        shots.map(function (s, i) {
          return '<button class="shot' + (i === state.selShot ? ' on' : '') + '" data-shot="' + i + '">' +
            '<div class="n">' + s.n + '</div><div class="t">' + s.start + '–' + s.endT + 's</div></button>';
        }).join('') +
      '</div>' +

      '<div class="shot-detail">' +
        '<div class="sd-head">镜头 ' + shot.n + ' · ' + shot.start + '–' + shot.endT + 's</div>' +
        '<div class="sd-row"><span class="k">画面</span><span class="v">' + shot.visual + '</span><button class="act" data-act="swap">换素材 ⟳</button></div>' +
        '<div class="sd-row"><span class="k">口播</span><span class="v">' + shot.vo + '</span><button class="act" data-act="edit">编辑 ✎</button></div>' +
        '<div class="sd-row"><span class="k">字幕</span><span class="v">' + shot.sub + '</span><button class="act" data-act="style">样式 ⌄</button></div>' +
      '</div>' +

      '<div class="sec-label">其他成片</div>' +
      '<div class="others">' +
        state.clips.map(function (c) {
          return '<button class="oth' + (c.id === state.selClip ? ' on' : '') + '" data-clip="' + c.id + '" ' +
            'style="background:linear-gradient(165deg,' + c.tint[0] + ',' + c.tint[1] + ')">' +
            (c.status === 'fail' ? '<span class="warn">⚠</span>' : '') + c.id + '</button>';
        }).join('') +
        '<button class="sbtn" style="margin-left:auto;padding:0 12px" data-act="dlall">⤓ 全部下载</button>' +
      '</div>';

    bindClipPanel(host, clip, shots);
  }

  function bindClipPanel(host, clip, shots) {
    stopPlay();
    $$('.shot', host).forEach(function (s) {
      s.addEventListener('click', function () {
        state.selShot = +s.getAttribute('data-shot');
        state.t = shots[state.selShot].start;
        renderClips();
      });
    });
    $$('.oth', host).forEach(function (o) {
      o.addEventListener('click', function () {
        var id = +o.getAttribute('data-clip');
        var c = state.clips.filter(function (x) { return x.id === id; })[0];
        if (c && c.status === 'fail') { toast('第 ④ 条生成失败，可在对话里重试或跳过'); return; }
        state.selClip = id; state.selShot = 0; state.t = 0;
        renderClips();
      });
    });
    $$('[data-act]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var map = {
          dl: '开始下载《' + clip.name + '》…（外观稿未接入）',
          re: '正在重新生成这条…（外观稿未接入）',
          dlall: '开始打包下载全部成片…（外观稿未接入）',
          swap: '打开素材库替换该镜头画面',
          edit: '口播文案可直接编辑，改完自动重新配音',
          style: '字幕样式：简约白 / 描边黄 / 综艺花字'
        };
        toast(map[btn.getAttribute('data-act')] || '');
      });
    });

    var playBtn = $('#playBtn', host);
    if (playBtn) playBtn.addEventListener('click', function () { togglePlay(clip, shots); });
  }

  /* ---------- 假播放 ---------- */
  function stopPlay() {
    state.playing = false;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }
  function togglePlay(clip, shots) {
    var btn = $('#playBtn');
    if (state.playing) { stopPlay(); btn.textContent = '▶'; return; }
    state.playing = true; btn.textContent = '❚❚';
    if (state.t >= clip.dur) state.t = 0;
    state.timer = setInterval(function () {
      state.t += 0.1;
      if (state.t >= clip.dur) {
        state.t = clip.dur; stopPlay();
        var b2 = $('#playBtn'); if (b2) b2.textContent = '▶';
      }
      var bar = $('#bar'), tn = $('#tnow'), sub = $('#sub9');
      if (!bar) { stopPlay(); return; }
      bar.style.width = (state.t / clip.dur * 100) + '%';
      tn.textContent = fmt(state.t);
      for (var i = 0; i < shots.length; i++) {
        if (state.t <= shots[i].endT) {
          if (sub) sub.textContent = shots[i].sub;
          $$('.shot').forEach(function (s, j) { s.classList.toggle('on', j === i); });
          break;
        }
      }
    }, 100);
  }

  /* ---------- 网格模式 ---------- */
  function renderGrid(host) {
    var sel = state.selected;
    host.innerHTML =
      '<div class="grid5">' +
        state.clips.map(function (c) {
          var fail = c.status === 'fail';
          return '<div class="gcard' + (sel[c.id] ? ' sel' : '') + '" data-g="' + c.id + '">' +
            '<div class="g9" style="background:linear-gradient(165deg,' + c.tint[0] + ',' + c.tint[1] + ')">' +
              (fail ? '<span style="color:var(--err);font-size:18px">⚠</span>' : '<span class="pl">▶</span>') +
              (fail ? '' : '<span class="ck">✓</span>') +
            '</div>' +
            '<div class="gm"><span>' + c.id + '</span><span>' + (fail ? '失败' : c.dur + 's') + '</span></div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="gbar"><span id="selCount">已选 0 条</span><span class="sp"></span>' +
        '<button class="sbtn" data-g-act="dl">⤓ 下载</button>' +
        '<button class="sbtn" data-g-act="del">🗑 删除</button></div>';

    $$('.gcard', host).forEach(function (g) {
      var id = +g.getAttribute('data-g');
      var c = state.clips.filter(function (x) { return x.id === id; })[0];
      g.addEventListener('click', function () {
        if (c.status === 'fail') { toast('这条生成失败了，可在对话里重试'); return; }
        sel[id] = !sel[id];
        g.classList.toggle('sel', sel[id]);
        var n = Object.keys(sel).filter(function (k) { return sel[k]; }).length;
        $('#selCount').textContent = '已选 ' + n + ' 条';
      });
    });
    $$('[data-g-act]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Object.keys(sel).filter(function (k) { return sel[k]; }).length;
        if (!n) { toast('先勾选要操作的成片'); return; }
        toast((b.getAttribute('data-g-act') === 'dl' ? '开始下载 ' : '已删除 ') + n + ' 条（外观稿未接入）');
      });
    });
  }

  /* ---------- 脚本 / 素材 / 设置 ---------- */
  function renderScripts() {
    $('#panelScripts').innerHTML = state.scripts.map(function (s) {
      return '<div class="script-card">' +
        '<div class="sh"><b>' + s.n + '</b>' + s.hook + '<span class="tagx">' + s.style + '</span></div>' +
        '<div class="sb">' + s.body + '</div>' +
        '<div style="padding:0 13px 12px;display:flex;gap:8px">' +
          '<button class="sbtn" style="padding:0 12px" data-s="' + s.n + '" data-k="use">按这版出片</button>' +
          '<button class="sbtn" style="padding:0 12px" data-s="' + s.n + '" data-k="edit">编辑</button>' +
        '</div>' +
      '</div>';
    }).join('');
    $$('[data-s]', $('#panelScripts')).forEach(function (b) {
      b.addEventListener('click', function () {
        var n = b.getAttribute('data-s');
        if (b.getAttribute('data-k') === 'use') { toast('将按第 ' + n + ' 版出片 · 消耗 1 额度'); }
        else { toast('第 ' + n + ' 版脚本可直接改，改完自动重新配音'); }
      });
    });
  }

  $('#panelAssets').innerHTML =
    '<div class="sec-label" style="margin-top:0">本次用到的素材</div>' +
    '<div class="assets-grid">' +
      ASSETS.map(function (a) {
        return '<div class="asset" style="background:linear-gradient(160deg,' + a[1] + ',#0C0C12)">' +
          '<div class="lb">' + a[0] + '</div></div>';
      }).join('') +
    '</div>' +
    '<div class="sec-label">来源</div>' +
    '<p class="dim" style="font-size:12.5px;line-height:1.8">' +
      '8 张来自商品详情页自动抓取<br>1 段 BGM 来自 SuperX 正版曲库<br>其余空镜由 AI 生成</p>';

  $('#panelSettings').innerHTML =
    '<div class="prow"><span>平台</span><div class="seg" data-single><button class="on">抖音</button><button>视频号</button><button>小红书</button></div></div>' +
    '<div class="prow"><span>时长</span><div class="seg" data-single><button>15s</button><button class="on">15–30s</button><button>60s</button></div></div>' +
    '<div class="prow"><span>口播风格</span><div class="seg" data-single><button class="on">痛点式</button><button>测评式</button><button>故事式</button></div></div>' +
    '<div class="prow"><span>音色</span><div class="seg" data-single><button class="on">温柔女声</button><button>活力女声</button><button>沉稳男声</button></div></div>' +
    '<div class="prow"><span>字幕</span><div class="seg" data-single><button class="on">简约白</button><button>描边黄</button><button>综艺花字</button></div></div>' +
    '<div class="prow"><span>批量</span><div class="seg" data-single><button>3 条</button><button class="on">5 条</button><button>10 条</button><button>30 条</button></div></div>' +
    '<div class="sec-label">额度</div>' +
    '<p class="dim" style="font-size:12.5px;line-height:1.8">当前设置下，一次生成消耗 <b style="color:var(--accent)">5 额度</b><br>免费版剩余 12 额度</p>';

  $$('.seg[data-single]', $('#panelSettings')).forEach(function (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', seg).forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
  });

  // 初始：窄屏收起工作台
  if (window.innerWidth <= 1024) setSide(false);
  $('#gridToggle').style.display = 'grid';

})();
