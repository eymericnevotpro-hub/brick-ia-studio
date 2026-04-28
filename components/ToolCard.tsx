"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import type { Tool } from "@/lib/tools";

interface ToolCardProps {
  tool: Tool;
  index?: number;
}

export default function ToolCard({ tool, index = 0 }: ToolCardProps) {
  const delay = `${index * 80}ms`;
  const hasApi = !!tool.falModelId;

  return (
    <Link
      href={`/tool/${tool.id}`}
      className="card-glow rounded-2xl p-5 flex flex-col gap-3 group animate-fade-up cursor-pointer block"
      style={{ animationDelay: delay, animationFillMode: "both", opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `${tool.color}22`, border: `1px solid ${tool.color}44`, boxShadow: `0 0 20px ${tool.color}22` }}
          >
            {tool.emoji}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-sm leading-tight">{tool.name}</h3>
              {tool.isNew && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${tool.color}22`, border: `1px solid ${tool.color}44`, color: tool.accentColor, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Nouveau
                </span>
              )}
              {tool.isPro && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                  style={{ background: "#FFD70022", border: "1px solid #FFD70044", color: "#FFD700", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  <Star className="w-2 h-2" /> Pro
                </span>
              )}
            </div>
            <p style={{ color: tool.accentColor, fontSize: "0.78rem", fontWeight: 500 }}>{tool.tagline}</p>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${tool.color}22`, border: `1px solid ${tool.color}44` }}>
          <ArrowRight className="w-3.5 h-3.5" style={{ color: tool.color }} />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed" style={{ color: "#8a6040" }}>{tool.description}</p>

      {/* Model info — what's REALLY used */}
      <div className="flex items-center gap-2 py-2 border-t border-b" style={{ borderColor: "#1A0B00" }}>
        {tool.modelType === "open-source" ? (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "#22c55e15", border: "1px solid #22c55e33", color: "#22c55e" }}>
            <span>✦</span> Open Source
          </span>
        ) : tool.modelType === "proprietary" ? (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", color: "#f59e0b" }}>
            <span>◆</span> Propriétaire
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "#6b728015", border: "1px solid #6b728033", color: "#9ca3af" }}>
            <span>→</span> Prompt redirect
          </span>
        )}
        <span className="text-xs" style={{ color: "#4a2a0a" }}>
          {tool.modelLabel} · {tool.modelBy}
        </span>
        {hasApi && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#FF7A0011", border: "1px solid #FF7A0022", color: "#FF7A00", fontSize: "0.6rem", fontWeight: 700 }}>
            ⚡ Direct
          </span>
        )}
      </div>

      {/* Style pills */}
      <div className="flex flex-wrap gap-1.5">
        {tool.styles.slice(0, 3).map(style => (
          <span key={style.id} className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#6a4020", fontSize: "0.7rem" }}>
            {style.emoji} {style.label}
          </span>
        ))}
        {tool.styles.length > 3 && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#6a4020", fontSize: "0.7rem" }}>
            +{tool.styles.length - 3}
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#6a4020" }}>
        <span style={{ fontSize: "0.8rem" }} className="group-hover:text-white transition-colors duration-300">
          {hasApi ? "Générer maintenant →" : "Créer le prompt →"}
        </span>
      </div>
    </Link>
  );
}
