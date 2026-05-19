import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio — Paid Media Analyzer",
  description: "Términos y condiciones de uso de Paid Media Analyzer.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Términos de Servicio</h1>
      <p className="text-xs text-gray-500 mb-10">Última actualización: mayo de 2026</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">1. Aceptación de los términos</h2>
        <p>
          Al acceder y usar <strong>Paid Media Analyzer</strong>, aceptás estos Términos de
          Servicio en su totalidad. Si no estás de acuerdo con alguno de los términos, no debés
          usar esta aplicación.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">2. Descripción del servicio</h2>
        <p>
          Paid Media Analyzer es una herramienta de análisis de campañas publicitarias de Meta
          Ads. Permite a usuarios autorizados visualizar métricas de rendimiento, estructura de
          campañas y análisis comparativos conectando su cuenta de Meta Business mediante OAuth.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">3. Elegibilidad y acceso</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>El acceso a esta herramienta es por invitación y está reservado a usuarios autorizados.</li>
          <li>Debés tener una cuenta activa de Meta Business Manager con acceso a cuentas publicitarias.</li>
          <li>Sos responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">4. Uso aceptable</h2>
        <p className="mb-3">Al usar esta aplicación, aceptás:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Usar la herramienta solo para analizar cuentas publicitarias sobre las que tenés permiso legítimo.</li>
          <li>No intentar acceder a cuentas o datos de terceros sin autorización.</li>
          <li>No usar la herramienta para actividades ilegales o que violen las{" "}
            <a
              href="https://www.facebook.com/policies/ads/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500"
            >
              Políticas de Publicidad de Meta
            </a>.
          </li>
          <li>No realizar ingeniería inversa, copiar o redistribuir el software.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">5. Integración con Meta</h2>
        <p>
          Esta aplicación usa la API de Meta Ads. Al usar la herramienta, también aceptás los{" "}
          <a
            href="https://developers.facebook.com/terms/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-500"
          >
            Términos de la Plataforma de Meta para Desarrolladores
          </a>{" "}
          y las{" "}
          <a
            href="https://developers.facebook.com/policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-500"
          >
            Políticas de Uso de Datos de Meta
          </a>.
          La disponibilidad del servicio depende de la disponibilidad de la API de Meta y puede
          verse afectada por cambios en sus políticas o disponibilidad.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">6. Propiedad intelectual</h2>
        <p>
          Todos los derechos sobre la aplicación, su código y diseño pertenecen a sus
          desarrolladores. Los datos de Meta Ads pertenecen a sus respectivos anunciantes.
          Esta herramienta no reclama propiedad sobre ningún dato obtenido de la API de Meta.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">7. Limitación de responsabilidad</h2>
        <p>
          Esta herramienta se provee "tal cual" (<em>as is</em>). No garantizamos la exactitud,
          completitud o disponibilidad de los datos. No somos responsables de decisiones
          comerciales tomadas en base a la información mostrada. El uso de los datos para
          optimizar o modificar campañas es responsabilidad exclusiva del usuario.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">8. Disponibilidad del servicio</h2>
        <p>
          Nos reservamos el derecho de modificar, suspender o discontinuar el servicio en
          cualquier momento sin previo aviso. No somos responsables por interrupciones de
          servicio causadas por la API de Meta o factores fuera de nuestro control.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">9. Privacidad</h2>
        <p>
          El uso de tus datos está regido por nuestra{" "}
          <a href="/privacy" className="underline text-blue-500">
            Política de Privacidad
          </a>
          , que forma parte integral de estos términos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">10. Modificaciones</h2>
        <p>
          Podemos modificar estos términos en cualquier momento. Los cambios entran en vigencia
          al publicarse en esta página. El uso continuado de la aplicación constituye aceptación
          de los términos modificados.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">11. Contacto</h2>
        <p>
          Para consultas sobre estos términos:{" "}
          <a href="mailto:info@tbrein.com" className="underline text-blue-500">
            info@tbrein.com
          </a>
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-12 border-t pt-6">
        Paid Media Analyzer no está afiliado ni es producto oficial de Meta Platforms, Inc.
        Facebook, Instagram y Meta son marcas registradas de Meta Platforms, Inc.
      </p>
    </main>
  );
}
