/* ============================================================
   SuperX 官网 · 交互
   全部为外观演示逻辑，无后端请求
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 导航：滚动加毛玻璃 ---------- */
  var nav = $('#nav');
  var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 80); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 移动端抽屉 ---------- */
  var burger = $('#burger');
  burger.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#drawer a').forEach(function (a) {
    a.addEventListener('click', function () {
      document.body.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* ---------- Hero 背景拼贴（占位素材） ---------- */
  var collage = $('#collage');
  if (collage) {
    var palettes = [
      ['#FF5A6E', '9:16'], ['#A855F7', '16:9'], ['#34D399', '4:3'], ['#F59E0B', '3:2'],
      ['#6C4CF5', '9:16'], ['#22D3EE', '16:9']
    ];
    var cols = window.innerWidth < 768 ? 4 : 8;
    for (var c = 0; c < cols; c++) {
      var col = document.createElement('div');
      col.className = 'collage-col';
      col.style.animationDelay = (-c * 3) + 's';
      // 每列的内容重复两遍，保证无缝循环
      for (var k = 0; k < 2; k++) {
        for (var t = 0; t < 5; t++) {
          var p = palettes[(c + t) % palettes.length];
          var tile = document.createElement('div');
          tile.className = 'collage-tile';
          var ratios = { '9:16': 1.78, '16:9': 0.56, '4:3': 0.75, '3:2': 0.66 };
          tile.style.height = Math.round(180 * ratios[p[1]]) + 'px';
          tile.style.background = 'linear-gradient(160deg, ' + p[0] + '55, ' + p[0] + '11)';
          col.appendChild(tile);
        }
      }
      collage.appendChild(col);
    }
  }

  /* ---------- 滚动进场 ---------- */
  var revealItems = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var siblings = Array.prototype.slice.call(e.target.parentNode.children).filter(function (n) {
          return n.classList && n.classList.contains('reveal');
        });
        var i = Math.max(0, siblings.indexOf(e.target));
        e.target.style.transitionDelay = Math.min(i * 60, 300) + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealItems.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 数字滚动 ---------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var done = false;
    var run = function () {
      if (done) return; done = true;
      if (reduce) { el.textContent = target.toLocaleString('en-US') + suffix; return; }
      var start = performance.now(), dur = 1200;
      var tick = function (now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, ob) {
        es.forEach(function (e) { if (e.isIntersecting) { run(); ob.disconnect(); } });
      }, { threshold: 0.5 }).observe(el);
    } else { run(); }
  });

  /* ---------- 右侧章节轴 ---------- */
  var rail = $('#rail');
  var railLinks = $$('#rail a');
  var railColors = {
    video: 'var(--p1)', drama: 'var(--p2)', education: 'var(--p3)', app: 'var(--p4)'
  };
  var sections = $$('[data-rail]');
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.getAttribute('data-rail');
        railLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('data-target') === id);
        });
        rail.style.setProperty('--accent-rail', railColors[id] || 'var(--violet)');
      });
    }, { threshold: 0.01, rootMargin: '-45% 0px -45% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 屏 05 · 短剧胶片条 ---------- */
  var strip = $('#filmstrip');
  if (strip) {
    var titles = ['初见', '合约', '雨夜对峙', '旧照片', '反转', '摊牌', '离场', '重逢',
                  '暗流', '对簿', '真相', '抉择', '余波', '归来', '对峙 II', '收网',
                  '告别', '新生', '尾声', '番外'];
    var tints = ['#2A1240', '#331750', '#251038', '#3A1B58', '#2E1444'];
    titles.forEach(function (name, i) {
      var b = document.createElement('button');
      b.textContent = 'EP' + String(i + 1).padStart(2, '0');
      b.setAttribute('role', 'tab');
      if (i === 2) b.classList.add('on');
      b.addEventListener('click', function () {
        $$('#filmstrip button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        $('#dramaTitle').textContent = name;
        $('#dramaFrame').style.background = 'linear-gradient(150deg,' + tints[i % tints.length] + ',#120A1E)';
        $('#dramaFrame').querySelector('.mono').textContent = 'EP' + String(i + 1).padStart(2, '0');
      });
      strip.appendChild(b);
    });
  }

  /* ---------- 屏 06 · 教育 Tab ---------- */
  var tabbar = $('#eduTabs');
  if (tabbar) {
    var btns = $$('button', tabbar);
    var ink = $('.ink', tabbar);
    var panels = $$('.tabpanel', tabbar.parentNode);
    var moveInk = function (btn) { ink.style.left = btn.offsetLeft + 'px'; ink.style.width = btn.offsetWidth + 'px'; };
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); });
        panels.forEach(function (p) { p.classList.remove('on'); });
        b.classList.add('on'); b.setAttribute('aria-selected', 'true');
        panels[i].classList.add('on');
        moveInk(b);
      });
    });
    var initInk = function () { moveInk($('button.on', tabbar)); };
    window.addEventListener('load', initInk);
    window.addEventListener('resize', initInk);
    initInk();
  }

  /* ---------- 屏 07 · Vibe Coding 打字机 ---------- */
  var chatlog = $('#chatlog');
  if (chatlog) {
    var script = [
      { cls: 'you', text: '你：做一个团队周报工具，能@人、能导出 PDF' },
      { cls: 'done', text: '规划页面结构（4 页）' },
      { cls: 'done', text: '生成数据模型：Report / User / Mention' },
      { cls: 'done', text: '搭建登录与权限' },
      { cls: 'run', text: '⟳ 编写 ReportCard 组件…' }
    ];
    var mock = $('#mockapp');
    var i = 0, ch = 0, line = null;

    var reset = function () {
      chatlog.innerHTML = ''; i = 0; ch = 0; line = null;
      mock.innerHTML = '<div class="row" style="width:52%"></div>';
    };

    var grow = function () {
      var el;
      if (i === 2) {
        el = document.createElement('div');
        el.className = 'row grow'; el.style.width = '84%';
        mock.appendChild(el);
      } else if (i === 3) {
        el = document.createElement('div');
        el.className = 'blocks grow';
        el.innerHTML = '<div></div><div></div><div></div>';
        mock.appendChild(el);
      } else if (i === 4) {
        el = document.createElement('div');
        el.className = 'row grow'; el.style.width = '66%'; el.style.marginTop = '12px';
        mock.appendChild(el);
      }
    };

    var type = function () {
      if (i >= script.length) { setTimeout(function () { reset(); type(); }, 2600); return; }
      if (!line) {
        line = document.createElement('div');
        line.className = script[i].cls;
        chatlog.appendChild(line);
      }
      var full = script[i].text;
      if (ch <= full.length) {
        line.innerHTML = full.slice(0, ch) + (i === script.length - 1 ? '<span class="caret"></span>' : '');
        ch++;
        setTimeout(type, 28);
      } else {
        grow();
        i++; ch = 0; line = null;
        setTimeout(type, 420);
      }
    };

    if (reduce) {
      script.forEach(function (s) {
        var d = document.createElement('div'); d.className = s.cls; d.textContent = s.text;
        chatlog.appendChild(d);
      });
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, ob) {
        es.forEach(function (e) { if (e.isIntersecting) { type(); ob.disconnect(); } });
      }, { threshold: 0.3 }).observe(chatlog);
    } else { type(); }
  }

  /* ---------- 屏 10 · 客户 Logo 墙 ---------- */
  var track = $('#logoTrack');
  if (track) {
    var names = ['NOVA', 'Lumen', '星野文化', 'Driftly', '橙子科技', 'PEAK', '云溪教育', 'Mirage',
                 'HALO', '未名传媒', 'Volta', 'Kite'];
    var build = function () {
      names.forEach(function (n) {
        var el = document.createElement('span');
        el.className = 'logo-item';
        el.innerHTML = '<i class="sq"></i>' + n;
        track.appendChild(el);
      });
    };
    build(); build(); // 两份，保证 marquee 无缝
  }

  /* ---------- 屏 11 · 月付 / 年付 ---------- */
  var billing = $('#billing');
  if (billing) {
    $$('button', billing).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', billing).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        var mode = b.getAttribute('data-mode');
        $$('.price').forEach(function (p) {
          var val = p.getAttribute('data-' + mode);
          var per = p.querySelector('small');
          p.textContent = val;
          if (per) { p.appendChild(per); }
        });
      });
    });
  }

  /* ---------- 屏 12 · FAQ 一次只开一条 ---------- */
  var faqItems = $$('.faq details');
  faqItems.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqItems.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

})();
