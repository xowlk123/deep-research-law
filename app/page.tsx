"use client";

import { useState, useRef, useCallback, ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "@/components/MermaidDiagram";

type AnalysisResult = {
  part1: string;
  part2: string;
  part3: string;
};

type Status = "idle" | "uploading" | "analyzing" | "done" | "error";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStatus("uploading");
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setStatus("analyzing");
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setStatus("done");
      setActiveTab(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误，请重试");
      setStatus("error");
    }
  };

  const resetState = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const tabLabels: Record<1 | 2 | 3, string> = {
    1: "一、案情事实与思维导图",
    2: "二、案件研究报告",
    3: "三、判决书修订建议",
  };

  const tabContent: Record<1 | 2 | 3, string> = {
    1: result?.part1 ?? "",
    2: result?.part2 ?? "",
    3: result?.part3 ?? "",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-800 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h1 className="text-xl font-bold tracking-wide">庭长阅核智能辅助系统</h1>
            <p className="text-xs text-red-200 mt-0.5">
              上传裁判文书草稿，自动生成案情梳理、研究报告与修订建议
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">上传裁判文书草稿</h2>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-red-400 bg-red-50"
                : file
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-red-300 hover:bg-gray-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="space-y-1">
                <p className="text-green-700 font-medium">📄 {file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-4xl">📂</p>
                <p className="text-gray-600 font-medium">
                  拖拽文件至此处，或点击选择文件
                </p>
                <p className="text-sm text-gray-400">
                  支持格式：PDF、Word（.doc/.docx）、TXT
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleAnalyze}
              disabled={!file || status === "analyzing" || status === "uploading"}
              className="px-6 py-2.5 bg-red-800 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "uploading" || status === "analyzing"
                ? "分析中…"
                : "开始分析"}
            </button>
            {(file || result) && (
              <button
                onClick={resetState}
                className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重置
              </button>
            )}
            {(status === "uploading" || status === "analyzing") && (
              <span className="text-sm text-gray-500 animate-pulse">
                {status === "uploading" ? "上传文件中…" : "AI 分析中，请稍候…"}
              </span>
            )}
          </div>

          {status === "error" && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Tab Bar */}
            <div className="flex border-b border-gray-200">
              {([1, 2, 3] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab
                      ? "border-red-700 text-red-800 bg-red-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 prose prose-sm max-w-none prose-headings:text-gray-800 prose-a:text-red-700">
              <MarkdownWithMermaid content={tabContent[activeTab]} />
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 pb-8">
        本系统仅供辅助参考，最终裁判以法官独立判断为准
      </footer>
    </div>
  );
}

function MarkdownWithMermaid({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children }: ComponentPropsWithoutRef<"code">) {
          const lang = (className ?? "").replace("language-", "");
          const codeStr = String(children).trim();
          if (lang === "mermaid") {
            return <MermaidDiagram chart={codeStr} />;
          }
          return (
            <code className={className}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
