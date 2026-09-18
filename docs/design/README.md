# SuperX 官网设计稿

纯文本设计稿，只描述外观与结构，不含实现代码。

| 文件 | 内容 |
|------|------|
| `00-foundation.md` | 品牌定位、色板、字体、栅格、动效、信息架构、导航与页脚 |
| `01-homepage.md` | 首页 13 屏逐屏线框（公司 + 产品总览，一路下滑） |
| `02-product-pages.md` | 四条产品线子页面线框（/video /drama /education /app） |
| `03-secondary-pages.md` | about / pricing / cases / contact / blog / legal / 404 |
| `04-components-responsive.md` | 组件规格、响应式断点、可访问性、素材清单、实现建议 |

## 一句话结构

```
/  首页（13 屏）
   Hero → 数据 → 我们是谁 → 产品矩阵 → P1 → P2 → P3 → P4
   → 统一引擎 → 三步流程 → 案例 → 定价 → FAQ+CTA
        │
        ├─ ● /video      AI 短视频   #FF5A6E
        ├─ ● /drama      AI 短剧     #A855F7
        ├─ ● /education  AI 教育     #34D399
        └─ ● /app        AI App      #F59E0B
```
