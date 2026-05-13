import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="text-xl font-bold text-blue-900">OpinBot</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Plataforma Inteligente de Encuestas
          </div>

          <h1 className="text-5xl font-extrabold text-blue-900 leading-tight mb-6">
            OpinBot —{" "}
            <span className="text-blue-600">Encuestas Conversacionales</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Transforma la manera en que recolectas opiniones. OpinBot crea
            encuestas dinámicas e inteligentes que se adaptan a cada respuesta,
            ofreciendo una experiencia conversacional única.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              Iniciar Encuesta
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3">
              Ver Demo
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
          {[
            {
              icon: "💬",
              title: "Conversacional",
              desc: "Las encuestas fluyen como una conversación natural, aumentando la tasa de respuesta.",
            },
            {
              icon: "🤖",
              title: "Inteligente",
              desc: "Lógica adaptativa que personaliza las preguntas según las respuestas anteriores.",
            },
            {
              icon: "📊",
              title: "Analítica Avanzada",
              desc: "Dashboard en tiempo real con visualizaciones claras y exportación de datos.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="card p-8 text-center hover:shadow-md transition-shadow duration-200"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-blue-600 rounded-2xl p-10 mt-16 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { value: "+10k", label: "Encuestas Creadas" },
              { value: "98%", label: "Tasa de Satisfacción" },
              { value: "+500", label: "Empresas Activas" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-extrabold mb-1">{stat.value}</div>
                <div className="text-blue-200 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-400 text-sm py-10">
        © 2024 OpinBot. Todos los derechos reservados.
      </footer>
    </div>
  );
}
