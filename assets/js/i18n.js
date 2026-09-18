/* ============================================================
   SuperX · 运行时多语言层
   以中文原文为 key，翻译在 i18n-dict.js 里。
   MutationObserver 兜住工作台动态生成的内容，所以新加的界面
   只要把中文补进字典就会自动生效，不用改调用点。
   ============================================================ */
(function (w, d) {
  'use strict';

  var KEY = 'superx_lang';
  var LANGS = [['zh', '中文'], ['en', 'English'], ['id', 'Indonesia']];
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1 };

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  function valid(v) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === v) return true; return false; }

  function detect() {
    // ?lang=en 既方便测试，也能分享指定语言的链接
    var q = null;
    try { q = new w.URLSearchParams(w.location.search).get('lang'); } catch (e) {}
    if (valid(q)) { try { w.localStorage.setItem(KEY, q); } catch (e) {} return q; }
    try { var v = w.localStorage.getItem(KEY); if (valid(v)) return v; } catch (e) {}
    var n = ((w.navigator.language || 'en') + '').toLowerCase();
    if (n.indexOf('zh') === 0) return 'zh';
    if (n.indexOf('id') === 0 || n.indexOf('in') === 0) return 'id';
    return 'en';
  }

  var lang = detect();
  var dict = (w.SUPERX_I18N || {})[lang] || null;   // zh 时为 null，直接用原文

  d.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : (lang === 'id' ? 'id' : 'en'));

  function tr(s) {
    if (!dict) return null;
    var hit = dict[norm(s)];
    return hit === undefined ? null : hit;
  }

  function walk(node) {
    if (!dict || !node) return;
    if (node.nodeType === 3) {
      var raw = node.nodeValue;
      if (!raw || raw.indexOf('​') > -1) return;
      var hit = tr(raw);
      if (hit !== null) {
        node.nodeValue = raw.match(/^\s*/)[0] + hit + raw.match(/\s*$/)[0];
      }
      return;
    }
    if (node.nodeType !== 1 || SKIP[node.tagName]) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = node.getAttribute(ATTRS[i]);
      if (v) { var h = tr(v); if (h !== null) node.setAttribute(ATTRS[i], h); }
    }
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  // 解析过程中就开始翻，避免中文一闪而过
  if (dict && w.MutationObserver) {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes') {
          // 翻完之后值已是译文，字典查不到，不会再次触发
          var cur = m.target.getAttribute(m.attributeName);
          if (cur) { var h = tr(cur); if (h !== null) m.target.setAttribute(m.attributeName, h); }
          continue;
        }
        for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }).observe(d.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ATTRS
    });
  }

  function full() {
    walk(d.body);
    var t = tr(d.title);
    if (t !== null) d.title = t;
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', full);
  else full();

  /* ---------- 切换器 ---------- */
  function mount() {
    var hosts = d.querySelectorAll('[data-lang-switch]');
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      if (host.dataset.mounted) continue;
      host.dataset.mounted = '1';
      var sel = d.createElement('select');
      sel.className = 'lang-switch';
      sel.setAttribute('aria-label', 'Language');
      for (var k = 0; k < LANGS.length; k++) {
        var o = d.createElement('option');
        o.value = LANGS[k][0];
        o.textContent = LANGS[k][1];
        if (LANGS[k][0] === lang) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', function () {
        try { w.localStorage.setItem(KEY, this.value); } catch (e) {}
        // 整页重载：反向还原原文比再翻一遍更容易出错
        w.location.reload();
      });
      host.appendChild(sel);
    }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', mount);
  else mount();

  w.SuperXI18N = { lang: lang, langs: LANGS, t: function (s) { var h = tr(s); return h === null ? s : h; } };
})(window, document);
