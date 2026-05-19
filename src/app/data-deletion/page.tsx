import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminación de datos — Paid Media Analyzer",
  description: "Instrucciones para solicitar la eliminación de tus datos en Paid Media Analyzer.",
};

export default function DataDeletionPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Eliminación de datos</h1>
      <p className="text-xs text-gray-500 mb-10">Última actualización: mayo de 2026</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">¿Qué datos guarda esta aplicación?</h2>
        <p>
          <strong>Paid Media Analyzer</strong> no almacena datos personales en servidores propios.
          El único dato que se guarda localmente (en tu navegador) es el token de acceso de Meta,
          que permanece exclusivamente en tu dispositivo.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">Cómo eliminar tus datos</h2>
        <p className="mb-4">
          Para eliminar completamente el acceso de esta aplicación a tu cuenta de Meta y revocar
          cualquier token emitido, seguí estos pasos:
        </p>

        <ol className="list-decimal pl-5 space-y-4">
          <li>
            <strong>Revocar acceso desde Meta:</strong>
            <br />
            Andá a{" "}
            <a
              href="https://www.facebook.com/settings?tab=business_tools"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500"
            >
              facebook.com/settings → Aplicaciones y sitios web
            </a>
            , buscá <em>ads manager</em> o <em>Paid Media Analyzer</em> y hacé clic en
            <strong> Eliminar</strong>. Esto revoca el token y Meta elimina los datos
            compartidos con la app.
          </li>

          <li>
            <strong>Limpiar datos locales del navegador:</strong>
            <br />
            En tu navegador, abrí las herramientas de desarrollo (F12) → pestaña
            <em> Application</em> → <em>Local Storage</em> → seleccioná el dominio de la app
            y borrá las entradas, o simplemente cerrá sesión desde el botón de la herramienta.
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">Solicitud de eliminación por email</h2>
        <p>
          Si querés confirmar que no existen datos tuyos almacenados o necesitás asistencia,
          enviá un email a{" "}
          <a href="mailto:info@tbrein.com" className="underline text-blue-500">
            info@tbrein.com
          </a>{" "}
          con el asunto <strong>"Solicitud de eliminación de datos"</strong> e indicando el
          correo asociado a tu cuenta de Meta. Respondemos en un plazo máximo de 30 días.
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-12 border-t pt-6">
        Para más información sobre cómo tratamos tus datos, consultá nuestra{" "}
        <a href="/privacy" className="underline text-blue-400">
          Política de Privacidad
        </a>
        .
      </p>
    </main>
  );
}
