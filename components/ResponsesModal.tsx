"use client";

import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  text: string;
  type: "text" | "numeric" | "yesno";
}

interface RawAnswer {
  question: string;
  type: string;
  value: string;
}

interface RawResponse {
  id: string;
  answers: RawAnswer[];
  created_at: string;
}

interface Survey {
  id: string;
  title: string;
  questions: Question[];
}

interface Props {
  surveyId: string;
  surveyTitle: string;
  open: boolean;
  onClose: () => void;
  supabase: SupabaseClient;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ResponsesModal({ surveyId, surveyTitle, open, onClose, supabase }: Props) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<RawResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        supabase.from("surveys").select("id, title, questions").eq("id", surveyId).single(),
        supabase.from("responses").select("id, answers, created_at").eq("survey_id", surveyId).order("created_at", { ascending: false }),
      ]);
      if (surveyRes.error) throw surveyRes.error;
      if (responsesRes.error) throw responsesRes.error;
      setSurvey(surveyRes.data as Survey);
      setResponses(responsesRes.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar respuestas");
    } finally {
      setLoading(false);
    }
  }, [supabase, surveyId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const exportCSV = () => {
    if (!survey || responses.length === 0) return;
    setExporting(true);

    const headers = ["Fecha", ...survey.questions.map((q) => q.text)];
    const rows = responses.map((r) => {
      const dateStr = new Date(r.created_at).toLocaleString("es-ES");
      const vals = survey.questions.map((q) => {
        const ans = r.answers.find((a) => a.question === q.text);
        return ans ? `"${ans.value.replace(/"/g, '""')}"` : '""';
      });
      return [`"${dateStr}"`, ...vals].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respuestas-${surveyTitle.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — slides from right */}
      <div className="relative ml-auto bg-white h-full w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>📊</span> Resultados
            </h2>
            <p className="text-sm text-gray-500 truncate max-w-sm">{surveyTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {responses.length > 0 && (
              <button
                onClick={exportCSV}
                disabled={exporting}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar CSV
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-gray-400 text-sm">Cargando respuestas...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <p className="text-red-500 text-sm">⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && responses.length === 0 && (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-600 font-medium mb-1">Sin respuestas aún</p>
              <p className="text-gray-400 text-sm">Comparte el enlace de la encuesta para recibir respuestas.</p>
            </div>
          )}

          {!loading && !error && survey && responses.length > 0 && (
            <div className="space-y-6">
              {/* Summary bar */}
              <div className="flex items-center gap-6 bg-blue-50 rounded-2xl px-6 py-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-700">{responses.length}</p>
                  <p className="text-xs text-blue-500 font-medium">Respuestas totales</p>
                </div>
                <div className="w-px h-10 bg-blue-200" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-700">{survey.questions.length}</p>
                  <p className="text-xs text-blue-500 font-medium">Preguntas</p>
                </div>
                <div className="w-px h-10 bg-blue-200" />
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">
                    {new Date(responses[responses.length - 1].created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                  </p>
                  <p className="text-xs text-blue-500 font-medium">Primera respuesta</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">
                    {new Date(responses[0].created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                  </p>
                  <p className="text-xs text-blue-500 font-medium">Última respuesta</p>
                </div>
              </div>

              {/* Per-question cards */}
              {survey.questions.map((q, qi) => {
                const allAnswers = responses
                  .flatMap((r) => r.answers.filter((a) => a.question === q.text))
                  .map((a) => a.value);

                return (
                  <QuestionCard
                    key={qi}
                    index={qi}
                    question={q}
                    answers={allAnswers}
                    total={responses.length}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  index,
  question,
  answers,
  total,
}: {
  index: number;
  question: Question;
  answers: string[];
  total: number;
}) {
  const TYPE_BADGE: Record<string, string> = {
    text: "✏️ Texto libre",
    numeric: "🔢 Numérica",
    yesno: "✅ Sí / No",
  };
  const TYPE_COLOR: Record<string, string> = {
    text: "bg-purple-100 text-purple-700",
    numeric: "bg-blue-100 text-blue-700",
    yesno: "bg-green-100 text-green-700",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
            {index + 1}
          </span>
          <p className="text-sm font-medium text-gray-900 leading-relaxed">{question.text}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${TYPE_COLOR[question.type]}`}>
          {TYPE_BADGE[question.type]}
        </span>
      </div>
      <div className="px-5 py-5">
        {answers.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin respuestas para esta pregunta</p>
        ) : question.type === "numeric" ? (
          <NumericChart answers={answers} />
        ) : question.type === "yesno" ? (
          <YesNoChart answers={answers} total={total} />
        ) : (
          <TextAnswers answers={answers} />
        )}
      </div>
    </div>
  );
}

// ─── Numeric Chart ────────────────────────────────────────────────────────────

function NumericChart({ answers }: { answers: string[] }) {
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) counts[i] = 0;
  let sum = 0;
  for (const a of answers) {
    const n = parseInt(a, 10);
    if (n >= 1 && n <= 10) {
      counts[n] = (counts[n] ?? 0) + 1;
      sum += n;
    }
  }
  const avg = answers.length > 0 ? (sum / answers.length).toFixed(1) : "—";

  const data = Array.from({ length: 10 }, (_, i) => ({
    label: String(i + 1),
    count: counts[i + 1] ?? 0,
  }));

  const COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-700">{avg}</p>
          <p className="text-xs text-gray-500">Promedio</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700">{answers.length}</p>
          <p className="text-xs text-gray-500">Respuestas</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: number) => [`${v} respuesta${v !== 1 ? "s" : ""}`, ""]}
            labelFormatter={(l) => `Valor: ${l}`}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Yes/No Chart ─────────────────────────────────────────────────────────────

function YesNoChart({ answers, total }: { answers: string[]; total: number }) {
  const si = answers.filter((a) => a === "Sí").length;
  const no = answers.filter((a) => a === "No").length;
  const siPct = total > 0 ? Math.round((si / answers.length) * 100) : 0;
  const noPct = total > 0 ? 100 - siPct : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="font-medium text-gray-700">Sí</span>
          <span className="text-gray-900 font-bold">{si}</span>
          <span className="text-gray-400">({siPct}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="font-medium text-gray-700">No</span>
          <span className="text-gray-900 font-bold">{no}</span>
          <span className="text-gray-400">({noPct}%)</span>
        </div>
      </div>

      {/* Visual bar */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>✅ Sí</span>
            <span>{siPct}%</span>
          </div>
          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
              style={{ width: `${siPct}%` }}
            >
              {siPct > 10 && <span className="text-xs text-white font-bold">{si}</span>}
            </div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>❌ No</span>
            <span>{noPct}%</span>
          </div>
          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
              style={{ width: `${noPct}%` }}
            >
              {noPct > 10 && <span className="text-xs text-white font-bold">{no}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Text Answers ─────────────────────────────────────────────────────────────

function TextAnswers({ answers }: { answers: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 5;
  const visible = expanded ? answers : answers.slice(0, LIMIT);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{answers.length} respuesta{answers.length !== 1 ? "s" : ""}</p>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {visible.map((a, i) => (
          <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <span className="text-xs text-gray-400 font-mono mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
            <p className="text-sm text-gray-700 leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
      {answers.length > LIMIT && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {expanded ? "Mostrar menos ↑" : `Ver ${answers.length - LIMIT} respuestas más ↓`}
        </button>
      )}
    </div>
  );
}
