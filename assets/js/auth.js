/* ============================================================
   SuperX · 极简登录状态（外观演示）
   仅写 localStorage，不发任何网络请求、不校验真实凭据。
   接后端时把 signIn / signUp 换成真实接口即可。
   ============================================================ */
(function (w) {
  'use strict';
  var KEY = 'superx_user';

  function read() {
    try { return JSON.parse(w.localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function write(u) {
    try { w.localStorage.setItem(KEY, JSON.stringify(u)); } catch (e) { /* 隐私模式下忽略 */ }
  }

  w.SuperXAuth = {
    get: read,
    isIn: function () { return !!read(); },
    signIn: function (email, name) {
      var u = {
        email: email,
        name: name || email.split('@')[0],
        plan: '免费版',
        quota: { used: 8, total: 20 },
        at: Date.now()
      };
      write(u);
      return u;
    },
    signOut: function () { try { w.localStorage.removeItem(KEY); } catch (e) {} },
    initial: function (u) { return (u && (u.name || u.email) || '?').trim().charAt(0).toUpperCase(); }
  };
})(window);
