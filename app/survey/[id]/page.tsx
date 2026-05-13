"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  text: string;
  type: "text" | "numeric" | "yesno";
}

interface Survey {
  id: string;
  title: string;
  questions: Question[];
  status: string;
}

interface Answer {
  question: string;
  type: string;
  value: string;
}

type ChatMsg =
  | { role: "bot"; text: string; id: string }
  | { role: "user"; text: string; id: string }
  | { role: "typing"; id: string };

type Stage = "loading" | "error" | "welcome" | "chatting" | "saving" | "done";

// ─── Supabase anon client (public — no auth required) ────────────────────────

function getSupabase() {
  const v1 = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const v2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const isUrl = (v: string) => v.startsWith("https://") || v.startsWith("http://");
  const url = isUrl(v1) ? v1 : isUrl(v2) ? v2 : "";
  const key = isUrl(v1) ? v2 : isUrl(v2) ? v1 : "";
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _msgId = 0;
const mkId = () => `m${++_msgId}`;

const TYPING_DELAY = 900;
const SHOW_DELAY = 600;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SurveyPage() {
  const { id } = useParams<{ id: string }>();
  const [stage, setStage] = useState<Stage>("loading");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [awaitingInput, setAwaitingInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch survey ─────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg("Configuración de base de datos no disponible.");
      setStage("error");
      return;
    }

    supabase
      .from("surveys")
      .select("id, title, questions, status")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrorMsg("Encuesta no encontrada o no disponible.");
          setStage("error");
          return;
        }
        if (data.status !== "active") {
          setErrorMsg("Esta encuesta no está activa por el momento.");
          setStage("error");
          return;
        }
        setSurvey(data as Survey);
        setStage("welcome");
      });
  }, [id]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Post bot message with typing animation ────────────────────────────────
  const addBotMessage = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      const typingId = mkId();
      setMessages((prev) => [...prev, { role: "typing", id: typingId }]);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === typingId ? { role: "bot", text, id: typingId } : m
          )
        );
        setTimeout(resolve, SHOW_DELAY);
      }, TYPING_DELAY);
    });
  }, []);

  // ── Add user message bubble ───────────────────────────────────────────────
  const addUserMessage = (text: string) => {
    setMessages((prev) => [...prev, { role: "user", text, id: mkId() }]);
  };

  // ── Start conversation ────────────────────────────────────────────────────
  const startChat = useCallback(async () => {
    if (!survey) return;
    setStage("chatting");
    setCurrentQ(0);
    setAnswers([]);
    setMessages([]);
    await addBotMessage(`¡Hola! Soy OpinBot 👋 Voy a hacerte ${survey.questions.length} pregunta${survey.questions.length !== 1 ? "s" : ""} rápidas sobre "${survey.title}".`);
    await addBotMessage(survey.questions[0].text);
    setAwaitingInput(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [survey, addBotMessage]);

  // ── Handle answer submission ──────────────────────────────────────────────
  const submitAnswer = useCallback(async (value: string) => {
    if (!survey || !awaitingInput) return;
    setAwaitingInput(false);
    addUserMessage(value);

    const newAnswers: Answer[] = [
      ...answers,
      { question: survey.questions[currentQ].text, type: survey.questions[currentQ].type, value },
    ];
    setAnswers(newAnswers);
    setInputValue("");

    const nextQ = currentQ + 1;

    if (nextQ < survey.questions.length) {
      setCurrentQ(nextQ);
      await addBotMessage(survey.questions[nextQ].text);
      setAwaitingInput(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // All questions answered
      await addBotMessage("¡Gracias por tomarte el tiempo! 🙏 Tus respuestas han sido registradas.");
      setStage("saving");

      const supabase = getSupabase();
      if (supabase) {
        await supabase.from("responses").insert({
          survey_id: survey.id,
          answers: newAnswers,
        });
      }
      setStage("done");
    }
  }, [survey, awaitingInput, answers, currentQ, addBotMessage]);

  const handleTextSubmit = () => {
    if (inputValue.trim()) submitAnswer(inputValue.trim());
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const currentQuestion = survey?.questions[currentQ];
  const progress = survey ? ((currentQ) / survey.questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-4">
      {/* ── Loading ── */}
      {stage === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <BotAvatar size="lg" blink />
          <p className="text-gray-500 text-sm animate-pulse">Cargando encuesta...</p>
        </div>
      )}

      {/* ── Error ── */}
      {stage === "error" && (
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Ups, algo salió mal</h2>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <a href="/" className="btn-primary text-sm">← Volver al inicio</a>
        </div>
      )}

      {/* ── Welcome ── */}
      {stage === "welcome" && survey && (
        <div className="text-center max-w-md w-full">
          <BotAvatar size="xl" blink className="mx-auto mb-6" />
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              {survey.questions.length} pregunta{survey.questions.length !== 1 ? "s" : ""}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h1>
            <p className="text-gray-500 text-sm mb-6">
              Esta encuesta toma menos de un minuto. Tus respuestas son anónimas.
            </p>
            <button
              onClick={startChat}
              className="btn-primary w-full text-base py-3 flex items-center justify-center gap-2"
            >
              Comenzar encuesta
              <span>→</span>
            </button>
          </div>
          <p className="text-xs text-gray-400">Powered by OpinBot</p>
        </div>
      )}

      {/* ── Chat ── */}
      {(stage === "chatting" || stage === "saving" || stage === "done") && survey && (
        <div className="w-full max-w-lg flex flex-col" style={{ height: "100dvh", maxHeight: "700px" }}>
          {/* Header */}
          <div className="bg-white rounded-t-2xl border border-b-0 border-gray-200 px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <BotAvatar size="sm" blink={stage === "chatting"} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">OpinBot</p>
              <p className="text-xs text-green-500 font-medium">
                {stage === "chatting" ? "En línea" : stage === "saving" ? "Guardando..." : "Completado"}
              </p>
            </div>
            {/* Progress */}
            <div className="text-right">
              <p className="text-xs text-gray-400">
                {stage === "done" ? "✓ Listo" : `${currentQ + 1} / ${survey.questions.length}`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-100 border-x border-gray-200 flex-shrink-0">
            <div
              className="h-full bg-blue-500 transition-all duration-700"
              style={{ width: `${stage === "done" ? 100 : progress}%` }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-white border-x border-gray-200 px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="bg-white rounded-b-2xl border border-t border-gray-200 p-4 flex-shrink-0">
            {stage === "chatting" && awaitingInput && currentQuestion && (
              <>
                {currentQuestion.type === "text" && (
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                      placeholder="Escribe tu respuesta..."
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                    <button
                      onClick={handleTextSubmit}
                      disabled={!inputValue.trim()}
                      className="btn-primary px-4 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </div>
                )}

                {currentQuestion.type === "numeric" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => submitAnswer(String(n))}
                          className="aspect-square rounded-lg text-sm font-semibold bg-gray-100 hover:bg-blue-500 hover:text-white transition-colors text-gray-700"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 px-1">
                      <span>Muy malo</span>
                      <span>Excelente</span>
                    </div>
                  </div>
                )}

                {currentQuestion.type === "yesno" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => submitAnswer("Sí")}
                      className="py-3 rounded-xl bg-green-50 hover:bg-green-500 text-green-700 hover:text-white font-semibold text-sm transition-colors border border-green-200 hover:border-green-500"
                    >
                      ✅ Sí
                    </button>
                    <button
                      onClick={() => submitAnswer("No")}
                      className="py-3 rounded-xl bg-red-50 hover:bg-red-500 text-red-700 hover:text-white font-semibold text-sm transition-colors border border-red-200 hover:border-red-500"
                    >
                      ❌ No
                    </button>
                  </div>
                )}
              </>
            )}

            {!awaitingInput && stage === "chatting" && (
              <div className="flex justify-center py-1">
                <span className="text-xs text-gray-400 animate-pulse">OpinBot está escribiendo...</span>
              </div>
            )}

            {stage === "saving" && (
              <div className="flex justify-center py-1">
                <span className="text-xs text-gray-400 animate-pulse">Guardando respuestas...</span>
              </div>
            )}

            {stage === "done" && (
              <div className="text-center space-y-3">
                <div className="text-3xl">🎉</div>
                <p className="text-sm font-medium text-gray-700">¡Gracias por completar la encuesta!</p>
                <a
                  href="/"
                  className="inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Volver al inicio →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bot Avatar ───────────────────────────────────────────────────────────────

function BotAvatar({
  size = "md",
  blink = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  blink?: boolean;
  className?: string;
}) {
  const [eyeOpen, setEyeOpen] = useState(true);
  useEffect(() => {
    if (!blink) return;
    const blinker = setInterval(() => {
      setEyeOpen(false);
      setTimeout(() => setEyeOpen(true), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinker);
  }, [blink]);

  const dim = { sm: 36, md: 48, lg: 72, xl: 96 }[size];
  const eyeR = dim * 0.09;
  const eyeY = dim * 0.38;
  const eyeH = eyeOpen ? eyeR * 2 : eyeR * 0.3;

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      className={`flex-shrink-0 drop-shadow-sm ${className}`}
    >
      {/* Body */}
      <circle cx={dim / 2} cy={dim / 2} r={dim / 2 - 1} fill="#2563eb" />
      {/* Face plate */}
      <ellipse cx={dim / 2} cy={dim * 0.55} rx={dim * 0.32} ry={dim * 0.28} fill="#1d4ed8" />
      {/* Eyes */}
      <ellipse cx={dim * 0.38} cy={eyeY} rx={eyeR} ry={eyeH} fill="white" />
      <ellipse cx={dim * 0.62} cy={eyeY} rx={eyeR} ry={eyeH} fill="white" />
      {/* Pupils */}
      {eyeOpen && (
        <>
          <circle cx={dim * 0.38} cy={eyeY + eyeR * 0.3} r={eyeR * 0.55} fill="#93c5fd" />
          <circle cx={dim * 0.62} cy={eyeY + eyeR * 0.3} r={eyeR * 0.55} fill="#93c5fd" />
        </>
      )}
      {/* Mouth / smile */}
      <path
        d={`M ${dim * 0.36} ${dim * 0.62} Q ${dim * 0.5} ${dim * 0.72} ${dim * 0.64} ${dim * 0.62}`}
        stroke="white"
        strokeWidth={dim * 0.04}
        strokeLinecap="round"
        fill="none"
      />
      {/* Antenna */}
      <line x1={dim / 2} y1={1} x2={dim / 2} y2={dim * 0.14} stroke="#93c5fd" strokeWidth={dim * 0.04} strokeLinecap="round" />
      <circle cx={dim / 2} cy={dim * 0.06} r={dim * 0.06} fill="#93c5fd" />
    </svg>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMsg }) {
  if (msg.role === "typing") {
    return (
      <div className="flex items-end gap-2">
        <BotAvatar size="sm" />
        <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
          <div className="flex gap-1 items-center h-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === "bot") {
    return (
      <div className="flex items-end gap-2 max-w-[85%]">
        <BotAvatar size="sm" />
        <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
          <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>
        </div>
      </div>
    );
  }

  // user
  return (
    <div className="flex justify-end">
      <div className="bg-blue-600 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%]">
        <p className="text-sm text-white leading-relaxed">{msg.text}</p>
      </div>
    </div>
  );
}
