# 庭长阅核智能辅助系统

一款专为庭长设计的裁判文书阅核辅助工具，基于大语言模型自动分析裁判文书草稿，输出三部分报告：

1. **案情事实与思维导图** — 案情简述、Mermaid 事实思维导图、争议焦点
2. **案件研究报告** — 法律适用审查、类案裁判规则提示、阅核意见
3. **判决书修订建议** — 带修订痕迹的文书修订意见（修订人：石）

## 技术栈

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI API](https://platform.openai.com/) (默认模型：`gpt-4o`)
- [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm)
- [Mermaid](https://mermaid.js.org/) — 动态渲染思维导图
- [mammoth](https://github.com/mwilliamson/mammoth.js) — Word 文档解析
- [pdf-parse](https://github.com/modesty/pdf-parse) — PDF 解析

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件并填写您的 OpenAI API Key：

```env
OPENAI_API_KEY=sk-...
# 可选，默认使用 gpt-4o
# OPENAI_MODEL=gpt-4o
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 4. 生产构建

```bash
npm run build
npm start
```

## 使用说明

1. 打开系统页面，点击上传区域或拖拽文件上传裁判文书草稿（支持 PDF、Word、TXT）
2. 点击「开始分析」，等待 AI 分析完成
3. 通过标签页切换查看三部分分析结果
4. 最终裁判以法官独立判断为准，本系统仅供辅助参考

## 注意事项

- 本系统处理的文书属于司法敏感信息，请确保 API Key 及服务器安全配置
- 文档内容超过 60,000 字时将自动截断
- 不同模型的分析质量可能有差异，推荐使用 `gpt-4o` 或更高级模型

