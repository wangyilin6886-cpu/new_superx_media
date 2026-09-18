# SuperX 官网

按 `docs/design/` 的设计稿实现的公司官网首页（12 屏）。
**纯静态外观稿**：没有后端、没有构建步骤，双击 `index.html` 就能看。

## 本地预览

```bash
# 方式一：直接打开
open index.html          # macOS
start index.html         # Windows

# 方式二：起个本地服务（推荐，避免个别浏览器对 file:// 的限制）
npx http-server . -p 8080
# 然后访问 http://localhost:8080
```

## 文件结构

```
index.html              首页全部 12 屏
assets/css/styles.css   设计系统（色板/字体/组件）+ 各屏样式 + 响应式
assets/js/main.js       交互：滚动进场、数字滚动、Tab、胶片条、打字机、定价切换等
docs/design/            设计稿（plaintext 线框），实现以此为准
```

## 12 屏对照

| 屏 | 锚点 | 内容 |
|----|------|------|
| 01 | `#top` | Hero 首屏 · 主张 + 双 CTA + 四色分流胶囊 |
| 02 | `#about` | 我们是谁 · 引擎示意图 + 三个支柱 + 核心数字 |
| 03 | `#products` | 产品矩阵 2×2 · 四条产品线分流 |
| 04 | `#video` | AI 短视频（辅色 `#FF5A6E`） |
| 05 | `#drama` | AI 短剧（辅色 `#A855F7`） |
| 06 | `#education` | AI 教育（辅色 `#34D399`） |
| 07 | `#app` | AI App / Vibe Coding（辅色 `#F59E0B`） |
| 08 | `#engine` | SuperX Engine 统一底座 |
| 09 | `#how` | 三步上手 |
| 10 | `#cases` | 客户 Logo 墙 + 案例 + 证言 |
| 11 | `#pricing` | 定价四档 + 月付/年付切换 |
| 12 | `#faq` | FAQ + 收尾 CTA + 页脚 |

## 已实现的交互

- 导航滚动后加毛玻璃；产品下拉菜单；移动端全屏抽屉
- 右侧章节轴，滚动高亮，进入产品线时切换成该线辅色
- 滚动进场动画（同组 stagger 60ms）、核心数字滚动计数
- 屏 05 剧集胶片条：点击切换剧集标题与画面色调
- 屏 06 三个 Tab：课件 / 讲课视频 / 练习题，下划线滑动
- 屏 07 Vibe Coding 打字机：左侧日志逐字生成，右侧界面同步"长"出来，循环播放
- 屏 10 客户 Logo 无限横向滚动，hover 暂停并恢复彩色
- 屏 11 月付/年付切换实时改价
- 屏 12 FAQ 手风琴，一次只展开一条
- 全站支持 `prefers-reduced-motion`，关闭位移与自动播放

## 占位说明

外观稿阶段没有真实素材，以下均为 CSS 占位：
成片缩略图、剧照、课件页、App 界面、案例封面、客户 Logo、团队头像。
接入真实素材时替换对应元素即可，尺寸与位置已按设计稿定好。

## 尚未实现（设计稿里有，本次未做）

- 四个产品子页面 `/video` `/drama` `/education` `/app`
  （首页产品卡与「了解更多」目前指向首页内对应分区 / `#cta`）
- `/about` `/pricing` `/cases` `/contact` 等二级页面
- 所有表单、登录、视频 Modal 均为占位，不发请求
