"use client";

import { useState, useCallback } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type QuestionType = "text" | "numeric" | "yesno";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
}

export interface Survey {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (survey: Survey) => void;
  supabase: SupabaseClient;
  user: User;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "Texto libre",
  numeric: "Numérica (1–10)",
  yesno: "Sí / No",
};

const TYPE_ICONS: Record<QuestionType, string> = {
  text: "✏️",
  numeric: "🔢",
  yesno: "✅",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const EMPTY_QUESTION: () => Question = () => ({ id: uid(), text: "", type: "text" });

type Step = "form" | "preview";

export default function NewSurveyModal({ open, onClose, onCreated, supabase, user }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([EMPTY_QUESTION()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("form");
    setTitle("");
    setQuestions([EMPTY_QUESTION()]);
    setError(null);
    setSaving(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const addQuestion = () =>
    setQuestions((prev) => [...prev, EMPTY_QUESTION()]);

  const removeQuestion = (id: string) =>
    setQuestions((prev) => prev.filter((q) => q.id !== id));

  const updateQuestion = (id: string, patch: Partial<Question>) =>
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );

  const moveQuestion = (id: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const canPreview =
    title.trim().length > 0 &&
    questions.length > 0 &&
    questions.every((q) => q.text.trim().length > 0);

  const handleSave = async () => {
    if (!canPreview) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        client_id: user.id,
        title: title.trim(),
        questions: questions.map(({ id: _id, ...rest }) => rest),
        status: "active",
      };

      const { data, error: dbError } = await supabase
        .from("surveys")
        .insert(payload)
        .select("id, title, status, created_at")
        .single();

      if (dbError) throw new Error(dbError.message);
      onCreated(data as Survey);
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar la encuesta");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">+</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nueva Encuesta</h2>
              <p className="text-xs text-gray-400">
                {step === "form" ? "Configura tu encuesta" : "Revisa antes de publicar"}
              </p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mr-8">
            <StepDot n={1} label="Diseño" active={step === "form"} done={step === "preview"} />
            <div className="w-8 h-px bg-gray-200" />
            <StepDot n={2} label="Previa" active={step === "preview"} done={false} />
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === "form" ? (
            <FormStep
              title={title}
              setTitle={setTitle}
              questions={questions}
              addQuestion={addQuestion}
              removeQuestion={removeQuestion}
              updateQuestion={updateQuestion}
              moveQuestion={moveQuestion}
            />
          ) : (
            <PreviewStep title={title} questions={questions} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {error}
            </p>
          )}
          {!error && <div />}

          <div className="flex items-center gap-2">
            {step === "preview" && (
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Editar
              </button>
            )}
            {step === "form" && (
              <button
                onClick={() => setStep("preview")}
                disabled={!canPreview}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Vista previa →
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!canPreview || saving}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                "Publicar encuesta"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step indicator dot ── */
function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          done
            ? "bg-green-500 text-white"
            : active
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        {done ? "✓" : n}
      </div>
      <span className={`text-[10px] ${active ? "text-blue-600 font-medium" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

/* ── Form Step ── */
interface FormStepProps {
  title: string;
  setTitle: (v: string) => void;
  questions: Question[];
  addQuestion: () => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  moveQuestion: (id: string, dir: -1 | 1) => void;
}

function FormStep({ title, setTitle, questions, addQuestion, removeQuestion, updateQuestion, moveQuestion }: FormStepProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Título de la encuesta <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Encuesta de satisfacción del cliente"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          autoFocus
        />
      </div>

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            Preguntas
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
              {questions.length}
            </span>
          </label>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              total={questions.length}
              onUpdate={(patch) => updateQuestion(q.id, patch)}
              onRemove={() => removeQuestion(q.id)}
              onMove={(dir) => moveQuestion(q.id, dir)}
            />
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 text-blue-500 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl py-3 text-sm font-medium transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Agregar pregunta
        </button>
      </div>
    </div>
  );
}

/* ── Question Card ── */
interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Question>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

function QuestionCard({ question, index, total, onUpdate, onRemove, onMove }: QuestionCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-200 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Drag handle / number */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-0 text-xs leading-none"
            title="Subir"
          >
            ▲
          </button>
          <span className="text-xs font-bold text-gray-400 w-5 text-center">{index + 1}</span>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-0 text-xs leading-none"
            title="Bajar"
          >
            ▼
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={question.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={`Pregunta ${index + 1}...`}
            className="w-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none border-b border-transparent focus:border-blue-300 pb-0.5 transition-colors bg-transparent"
          />
          {/* Type selector */}
          <div className="flex gap-2">
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <button
                key={t}
                onClick={() => onUpdate({ type: t })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  question.type === t
                    ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <span>{TYPE_ICONS[t]}</span>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Remove */}
        <button
          onClick={onRemove}
          disabled={total === 1}
          className="text-gray-300 hover:text-red-400 disabled:opacity-0 transition-colors p-1 rounded-lg hover:bg-red-50 mt-0.5 flex-shrink-0"
          title="Eliminar pregunta"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Preview Step ── */
function PreviewStep({ title, questions }: { title: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const progress = ((current + 1) / questions.length) * 100;

  const handleAnswer = (val: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: val }));
    if (!isLast) setTimeout(() => setCurrent((c) => c + 1), 400);
  };

  return (
    <div className="p-6">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">O</span>
          </div>
          <span className="text-sm font-bold text-blue-900">OpinBot</span>
          <span className="ml-auto text-xs text-gray-400">Vista previa</span>
        </div>

        {/* Progress */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Pregunta {current + 1} de {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Survey title */}
        <p className="text-xs text-gray-400 mb-4">{title}</p>

        {/* Question */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-800 font-medium mb-4">{q.text}</p>

          {q.type === "text" && (
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Escribe tu respuesta..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          )}

          {q.type === "numeric" && (
            <div className="space-y-2">
              <div className="flex justify-between gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => handleAnswer(String(n))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      answers[q.id] === String(n)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-blue-100 text-gray-700"
                    }`}
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

          {q.type === "yesno" && (
            <div className="flex gap-3">
              {["Sí", "No"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    answers[q.id] === opt
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700"
                  }`}
                >
                  {opt === "Sí" ? "✅ Sí" : "❌ No"}
                </button>
              ))}
            </div>
          )}

          {q.type === "text" && (
            <button
              onClick={() => { if (answers[q.id]?.trim()) handleAnswer(answers[q.id]); }}
              disabled={!answers[q.id]?.trim()}
              className="mt-3 btn-primary text-sm w-full py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLast ? "Finalizar" : "Siguiente →"}
            </button>
          )}

          {isLast && answers[q.id] && (
            <div className="mt-4 text-center">
              <p className="text-green-600 font-medium text-sm">¡Gracias por tu respuesta! 🎉</p>
            </div>
          )}
        </div>

        {/* Question nav dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? "bg-blue-500" : answers[questions[i].id] ? "bg-green-400" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
