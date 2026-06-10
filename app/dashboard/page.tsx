"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import NewSurveyModal from '../../components/NewSurveyModal';
import ResponsesModal from '../../components/ResponsesModal';
interface Survey {
  id: string;
  title: string;
  status: string;
  created_at: string;
  questions?: any[]; // El '?'
}
function CopyLinkButton({ surveyId }: { surveyId: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const url = `${window.location.origin}/survey/${surveyId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700"
      }`}
      title="Copiar enlace público"
    >
      {copied ? "✓ Copiado" : "🔗 Compartir"}
    </button>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  draft: "Borrador",
  completed: "Finalizada",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-600",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, supabase, signOut, loading: authLoading } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "draft">("all");
  const [signingOut, setSigningOut] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [responsesFor, setResponsesFor] = useState<{ id: string; title: string } | null>(null);

  const fetchSurveys = useCallback(async () => {
    if (!supabase || !user) return;
    setFetchLoading(true);
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("id, title, status, created_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSurveys(data ?? []);
    } catch (err) {
      console.error("Error al cargar encuestas:", err);
    } finally {
      setFetchLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading && user && supabase) {
      fetchSurveys();
    } else if (!authLoading && !user) {
      setFetchLoading(false);
    }
  }, [authLoading, user, supabase, fetchSurveys]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push("/");
    router.refresh();
  };

  const handleSurveyCreated = (newSurvey: Survey) => {
    setSurveys((prev) => [newSurvey, ...prev]);
    setSuccessMsg(`"${newSurvey.title}" publicada con éxito`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const displayEmail = user?.email ?? "";

  const filtered = surveys.filter((s) => {
    if (activeTab === "active") return s.status === "active";
    if (activeTab === "draft") return s.status === "draft";
    return true;
  });

  const summaryStats = [
    { label: "Encuestas Activas", value: surveys.filter((s) => s.status === "active").length, sub: "en curso" },
    { label: "Borradores", value: surveys.filter((s) => s.status === "draft").length, sub: "pendientes" },
    { label: "Finalizadas", value: surveys.filter((s) => s.status === "completed").length, sub: "completadas" },
    { label: "Total", value: surveys.length, sub: "encuestas" },
  ];

  const isLoading = authLoading || fetchLoading;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="text-xl font-bold text-blue-900">OpinBot</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          {[
            { label: "Dashboard", icon: "▪", active: true },
            { label: "Mis Encuestas", icon: "☰", active: false },
            { label: "Respuestas", icon: "◎", active: false },
            { label: "Análisis", icon: "▲", active: false },
            { label: "Configuración", icon: "⚙", active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-xs opacity-70">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-bold text-xs uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-2 w-full text-center text-xs text-gray-400 hover:text-red-500 transition-colors py-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">
        {/* Success toast */}
        {successMsg && (
          <div className="fixed top-6 right-6 z-40 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fade-in">
            <span className="text-lg">✅</span>
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mb-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Solo usuarios autenticados
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
            <p className="text-gray-500 text-sm mt-1">
              Bienvenido, {displayName}. Aquí está tu resumen.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Nueva Encuesta
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryStats.map((s) => (
            <div key={s.label} className="card p-5">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              {isLoading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mb-1">{s.value}</p>
              )}
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Mis Encuestas</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(["all", "active", "draft"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "all" ? "Todas" : tab === "active" ? "Activas" : "Borradores"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Cargando encuestas...
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-600 font-medium mb-1">
                  {activeTab === "all" ? "No tienes encuestas aún" : "No hay encuestas en esta categoría"}
                </p>
                {activeTab === "all" && (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Crea tu primera encuesta conversacional
                    </p>
                    <button
                      onClick={() => setModalOpen(true)}
                      className="btn-primary text-sm"
                    >
                      + Crear primera encuesta
                    </button>
                  </>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Encuesta
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((survey) => (
                    <tr key={survey.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{survey.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLE[survey.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABEL[survey.status] ?? survey.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {new Date(survey.created_at).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setResponsesFor({ id: survey.id, title: survey.title })}
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-700 transition-colors"
                          >
                            📊 Ver respuestas
                          </button>
                          <CopyLinkButton surveyId={survey.id} />
                          <Link
                            href={`/survey/${survey.id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Ver →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* New Survey Modal */}
      {modalOpen && supabase && user && (
        <NewSurveyModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={handleSurveyCreated}
          supabase={supabase}
          user={user}
        />
      )}

      {/* Responses Modal */}
      {responsesFor && supabase && (
        <ResponsesModal
          open={!!responsesFor}
          surveyId={responsesFor.id}
          surveyTitle={responsesFor.title}
          onClose={() => setResponsesFor(null)}
          supabase={supabase}
        />
      )}
    </div>
  );
}
