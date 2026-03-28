import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Maximum document length forwarded to the model (characters)
const MAX_DOC_CHARS = 60_000;

// Allowlist of supported OpenAI chat model IDs
const ALLOWED_MODELS = new Set([
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
  "o1",
  "o1-mini",
  "o3-mini",
]);

function resolveModel(envValue: string | undefined): string {
  if (envValue && ALLOWED_MODELS.has(envValue)) return envValue;
  return "gpt-4o";
}

const SYSTEM_PROMPT = `你是一名资深法官助理，专门协助庭长审阅裁判文书草稿。
用户会提供一份裁判文书草稿，请严格保留案件核心细节，不要过度删减，
并按以下三个部分输出结果（全部使用 Markdown 格式）。

---

## 一、案情事实与思维导图

### 案情简述
用精炼的语言客观概括原告诉求、被告答辩及案件核心事实。

### 事实思维导图
使用 Mermaid 代码（\`\`\`mermaid ... \`\`\`）绘制案情时间线、法律关系主体图或资金流向图（选择最适合本案的一种）。

### 争议焦点
提炼本案的核心争议（可用有序列表）。

---

## 二、案件研究报告

请基于现行公司法及相关商事法律规范，结合"护企安商"和"法安善治"的裁判理念，撰写一份研究报告。

### 法律适用审查
分析草稿中的法律适用是否准确，指出需要关注或补充的法律依据。

### 类案裁判规则提示
基于公开的商事审判原则（侧重宏观裁判尺度），提示类似案件的常见处理思路和法律风险。

### 阅核意见
给出是否同意签发的初步结论及理由。

---

## 三、判决书修订建议（修订人：石）

针对文书中存在的事实认定不清、说理不透彻或表述不规范的段落进行修订。
对每处修订使用如下格式：

**原文段落：**
> [引用需要修改的原文]

**修订后段落：**
[给出修改后的文本。请**加粗**新增或修改的文字，对删除的文字使用 ~~删除线~~ 进行标识]

**【石评】：** [简要说明修改理由]

---

如果草稿中暂无需修订之处，可说明"草稿整体表述规范，暂无需修订"。
请用中文输出所有内容。`;

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (file.name.toLowerCase().endsWith(".pdf")) {
    // pdf-parse must be imported dynamically to avoid Node.js build issues
    type PdfParseModule = {
      default?: (buffer: Buffer) => Promise<{ text: string }>;
      (buffer: Buffer): Promise<{ text: string }>;
    };
    const pdfParseModule = (await import("pdf-parse")) as unknown as PdfParseModule;
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const data = await pdfParse(buffer);
    return data.text;
  }

  // Plain text / fallback
  return buffer.toString("utf-8");
}

function splitResult(raw: string): { part1: string; part2: string; part3: string } {
  // Split on the h2 headings produced by the system prompt
  const part1Match = raw.match(/##\s*一[、,，.．].*?(?=##\s*二[、,，.．]|$)/s);
  const part2Match = raw.match(/##\s*二[、,，.．].*?(?=##\s*三[、,，.．]|$)/s);
  const part3Match = raw.match(/##\s*三[、,，.．].*/s);

  return {
    part1: part1Match ? part1Match[0].trim() : raw,
    part2: part2Match ? part2Match[0].trim() : "",
    part3: part3Match ? part3Match[0].trim() : "",
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "请上传裁判文书文件" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [".pdf", ".doc", ".docx", ".txt"];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedTypes.some((ext) => fileName.endsWith(ext));
    if (!isAllowed) {
      return NextResponse.json(
        { error: "不支持的文件格式，请上传 PDF、Word 或 TXT 文件" },
        { status: 400 }
      );
    }

    // Extract text from uploaded document
    let docText: string;
    try {
      docText = await extractText(file);
    } catch {
      return NextResponse.json({ error: "无法解析文件内容，请确认文件格式正确" }, { status: 422 });
    }

    if (!docText.trim()) {
      return NextResponse.json({ error: "文件内容为空，请重新上传" }, { status: 422 });
    }

    // Truncate if too long
    if (docText.length > MAX_DOC_CHARS) {
      docText = docText.slice(0, MAX_DOC_CHARS) + "\n\n[…文档内容过长，已截断至前 60000 字…]";
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "服务器未配置 AI 接口密钥（OPENAI_API_KEY），请联系系统管理员" },
        { status: 503 }
      );
    }

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: resolveModel(process.env.OPENAI_MODEL),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `以下是裁判文书草稿，请严格按照系统指令的三部分格式进行阅核分析：\n\n${docText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = splitResult(raw);

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "服务器内部错误";
    // Don't expose internal stack traces
    console.error("[analyze] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
