# 部署到 superx-id.com（Vercel + Cloudflare DNS）

站点是**纯静态**的：没有 `package.json`，没有构建步骤，Vercel 直接把仓库根目录当静态站发出去。

---

## 一、先把旧站从 Vercel 摘掉

**顺序很重要。** 一个域名在同一时间只能绑在一个 Vercel 项目上，旧项目不放手，新项目就加不上
`superx-id.com`，而且会提示 "Domain is already in use by another project"。

1. 打开 https://vercel.com/dashboard，进旧项目
2. **Settings → Domains**，把 `superx-id.com` 和 `www.superx-id.com` 逐个 **Remove**
3. 确认域名列表里已经没有这两条
4. 再 **Settings → 最下方 Delete Project**（要输项目名确认）

> 只想先停掉、不想删项目的话：做完第 2 步就够了，域名已经释放。
> 项目留着不影响新部署，只是会一直挂在 dashboard 里。

删项目不可撤销，旧站的部署历史和环境变量会一起没。如果旧站上有还要用的环境变量，
先在 Settings → Environment Variables 里抄下来。

---

## 二、部署这个仓库

1. Vercel dashboard → **Add New → Project**
2. 选 GitHub 仓库 `wangyilin6886-cpu/new_superx_media`
3. 配置页面这样填：

   | 项 | 值 |
   |---|---|
   | Framework Preset | **Other** |
   | Root Directory | `./`（默认） |
   | Build Command | **留空**（覆盖掉默认值） |
   | Output Directory | **留空**（默认就是仓库根目录） |
   | Install Command | **留空** |

4. **Deploy**，大约十几秒完成，会给一个 `xxx.vercel.app` 的临时地址，先打开确认没问题

### 关于分支

仓库当前的默认分支是 `claude/kind-knuth-i9y662`，Vercel 会把它当作 Production 分支。
能用，但生产站挂在这么个分支名上不太体面。建议二选一：

- **在 GitHub 上把这个分支重命名为 `main`**（Settings → Branches），Vercel 会自动跟上；或
- 保留现状，在 Vercel 的 Settings → Git → Production Branch 里显式指定

---

## 三、Cloudflare DNS

**先别急着改。** 域名之前就指向 Vercel 的话，解析记录很可能已经是对的——
Vercel 给同一个域名分配的 CNAME 目标在同一账号内是稳定的，换项目不一定会变。

正确顺序是：**先在 Vercel 加域名，看它要什么，再决定动不动 Cloudflare。**

### 当前记录（2026-09 实际状态）

| 类型 | 名称 | 内容 | 代理 | 归属 |
|---|---|---|---|---|
| CNAME | `superx-id.com` | `a680b520c8a239fe.vercel-dns-017.com` | DNS only | **网站** |
| CNAME | `www` | `a680b520c8a239fe.vercel-dns-017.com` | DNS only | **网站** |
| MX ×3 | `superx-id.com` | `mx.zoho.com` / `mx2` / `mx3` | DNS only | 邮箱 |
| TXT | `superx-id.com` | `v=spf1 include:one.zoho.com ~all` | DNS only | 邮箱 |
| TXT | `superx-id.com` | `zoho-verification=…` | DNS only | 邮箱 |
| TXT | `230110336._domainkey` / `zc915539326._domainkey` | DKIM 公钥 | DNS only | 邮箱 |

### ⚠️ 只有前两条 CNAME 跟网站有关

**MX 和 TXT 全是 Zoho 邮箱的**（收信、SPF 反垃圾、DKIM 签名、域名验证）。
删掉任何一条，`@superx-id.com` 的邮件就会开始丢或被判垃圾。换站点的时候**一条都不要碰**。

### Vercel 的 CNAME 有两种形态

- 旧的通用值：`cname.vercel-dns.com`
- 现在的按域名分配值：`<一串哈希>.vercel-dns-017.com` ← 你用的是这种

**以 Vercel 项目 Settings → Domains 里显示的为准。** 如果它显示的值和现在这条一样，
Cloudflare 什么都不用改；不一样就只改这两条 CNAME 的 Content，代理状态保持灰云。

### 代理状态必须是灰云

Cloudflare 顶部会一直提示 "Proxying is required for most security and performance
features"，**忽略它**。橙云（Proxied）会导致：

- Vercel 签不出证书（它需要直接验证域名归属）
- 或者签出来了，但 Cloudflare 边缘和 Vercel 之间证书不匹配
- 最典型的表现是 **ERR_TOO_MANY_REDIRECTS**（重定向循环）

灰云不影响解析走 Cloudflare，HTTPS 由 Vercel 自己签发和续期，Vercel 本身就在全球 CDN 上。

如果你确实要开橙云（比如想用 Cloudflare 的 WAF），那么 Cloudflare 的
**SSL/TLS → Overview** 必须设成 **Full (strict)**，绝不能是 Flexible——Flexible 就是
上面那个重定向循环的根源。

> 顺带一提：apex（`superx-id.com`）上挂 CNAME 本来不合 DNS 规范，能用是因为
> Cloudflare 做了 CNAME flattening。这是 Cloudflare 的特性，换别家 DNS 要改用 A 记录。

## 四、在 Vercel 绑定域名

1. 新项目 → **Settings → Domains**
2. 加 `superx-id.com`，再加 `www.superx-id.com`
3. **看 Vercel 怎么说**：
   - 显示 **Valid Configuration** → Cloudflare 一个字都不用改，证书会自动签发
   - 显示 **Invalid Configuration** → 它会给出期望的 CNAME 值，把 Cloudflare 里那
     两条 CNAME 的 Content 改成它给的值（代理状态保持灰云），等一两分钟自动复检
4. Vercel 会自动把其中一个设为主域、另一个 301 跳过去（默认 apex 为主）

DNS 生效通常几分钟内，偶尔要等到 TTL 过期。查进度：

```bash
dig superx-id.com +short
dig www.superx-id.com +short
```

---

## 五、上线前必须知道的事

**这是一个外观原型，不是能用的产品。** 挂在正式域名上之前，确认你接受这些：

- **登录是假的。** `assets/js/auth.js` 只往 `localStorage` 写一个标记，任何邮箱 + 8 位以上
  密码都能进。没有后端、没有校验、没有真实账号。
- **所有数据是假的。** 成片、剧集、课件、应用全部是写死的演示内容，点「生成」不会真的生成。
- **表单不发请求。** 预约演示、忘记密码、导出、部署全是占位。
- 客户 Logo、案例数据、定价都是占位内容，**不要当作对外承诺**。

如果不想让公众误以为这是上线产品，两个办法：

1. **加一条演示横幅**（我可以做，十分钟的事），页面顶部常驻一行
   "这是产品演示，功能尚未开放"
2. **用 Vercel 的访问保护**：Settings → Deployment Protection → Password Protection，
   设一个密码，只有拿到密码的人能看。适合只给客户和投资人看的阶段。

---

## 六、仓库里已经为部署准备好的东西

| 文件 | 作用 |
|---|---|
| `vercel.json` | 干净 URL（`/studio` 而非 `/studio.html`）、缓存策略、安全响应头 |
| `404.html` | 404 页，Vercel 静态站自动识别 |
| `robots.txt` | 允许抓取，指向 sitemap |
| `sitemap.xml` | 三个页面 |
| `assets/img/og.png` | 1200×630 分享图，微信 / WhatsApp / X / LinkedIn 通用 |
| 各页 `<head>` | canonical、Open Graph、twitter:card、theme-color |

### 关于缓存策略

`assets/` 下的文件名**没有内容哈希**（`styles.css` 而不是 `styles.a3f9.css`），所以
`vercel.json` 里故意没用 `immutable`，而是：

```
assets/*   public, max-age=600, stale-while-revalidate=86400
```

HTML 没有单独写规则——Vercel 对静态 HTML 的默认值就是
`public, max-age=0, must-revalidate`，正是我们要的。

> `vercel.json` 是严格 JSON，**不能写注释**，header 对象里也只允许 `key` / `value`
> 两个字段。多加任何属性（哪怕是想当注释用的 `comment`）都会在 import 时报
> `should NOT have additional property`。说明性的文字写在这份文档里，不要写进配置。

改了样式或脚本，用户最多 10 分钟内就能拿到新版。如果以后接了构建流程、文件名带上哈希，
再把 `assets/` 那条换成 `max-age=31536000, immutable`。

---

## 七、后续每次更新

推到 Production 分支，Vercel 自动构建部署，一般 15 秒内完成：

```bash
git push origin <production-branch>
```

其他分支推上去会生成 Preview 部署，有独立链接，不影响正式站。
