import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — Paid Media Analyzer",
  description: "Política de privacidad de Paid Media Analyzer, herramienta de análisis de campañas de Meta Ads.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Política de Privacidad</h1>
      <p className="text-xs text-gray-500 mb-10">Última actualización: mayo de 2026</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">1. Qué es esta aplicación</h2>
        <p>
          <strong>Paid Media Analyzer</strong> es una herramienta interna de análisis de campañas
          publicitarias de Meta Ads (Facebook / Instagram). Permite a los usuarios autorizados
          conectar sus cuentas de Meta Business y visualizar métricas de rendimiento de sus
          campañas publicitarias.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">2. Datos que recopilamos</h2>
        <p className="mb-3">
          Esta aplicación accede a los siguientes datos <strong>únicamente con tu consentimiento
          explícito</strong> mediante el flujo de autenticación de Meta (OAuth):
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Token de acceso de Meta Ads (almacenado solo en tu navegador, nunca en nuestros servidores).</li>
          <li>Lista de cuentas publicitarias a las que tenés acceso en Meta Business Manager.</li>
          <li>Métricas de rendimiento de campañas: impresiones, clics, gasto, conversiones, leads, CPM, CPC, CTR.</li>
          <li>Estructura de campañas, conjuntos de anuncios y anuncios (nombre, estado, presupuesto, targeting).</li>
        </ul>
        <p className="mt-3">
          <strong>No recopilamos ni almacenamos</strong> datos personales de los usuarios finales de
          tus campañas (audiencias, clientes o prospectos de tu negocio).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">3. Cómo usamos los datos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Para mostrar dashboards y análisis de rendimiento dentro de la herramienta.</li>
          <li>Para calcular métricas derivadas (CPL, ROAS, frecuencia, etc.).</li>
          <li>Los datos se obtienen en tiempo real desde la API de Meta y se procesan solo en tu navegador y en nuestro servidor de API proxy (sin persistencia en base de datos).</li>
        </ul>
        <p className="mt-3">
          <strong>No compartimos, vendemos ni transferimos</strong> tus datos a terceros.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">4. Permisos de Meta que solicitamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><code>ads_read</code> — Lectura de campañas, conjuntos de anuncios y anuncios.</li>
          <li><code>ads_management</code> — Acceso a métricas detalladas de rendimiento.</li>
          <li><code>business_management</code> — Acceso a cuentas publicitarias del Business Manager.</li>
        </ul>
        <p className="mt-3">
          Estos permisos se usan exclusivamente para leer datos de tus cuentas publicitarias.
          No realizamos publicaciones, modificaciones de campañas ni acciones en nombre del usuario.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">5. Almacenamiento y seguridad</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>El token de acceso de Meta se guarda en el <code>localStorage</code> de tu navegador y nunca abandona tu dispositivo hacia nuestros servidores.</li>
          <li>Las llamadas a la API de Meta se realizan directamente desde tu navegador o a través de un proxy API seguro (HTTPS).</li>
          <li>No mantenemos bases de datos de usuarios ni registros de sesiones.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">6. Retención de datos</h2>
        <p>
          No almacenamos datos de Meta Ads de forma persistente. Cada vez que usás la herramienta,
          los datos se obtienen frescos desde la API de Meta. Al cerrar sesión o limpiar el
          almacenamiento local del navegador, se eliminan todos los tokens guardados.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">7. Tus derechos</h2>
        <p>
          Podés revocar el acceso de esta aplicación a tu cuenta de Meta en cualquier momento
          desde{" "}
          <a
            href="https://www.facebook.com/settings?tab=business_tools"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-500"
          >
            Configuración de Meta → Aplicaciones y sitios web
          </a>
          . Una vez revocado, la aplicación ya no podrá acceder a tus datos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">8. Uso de cookies</h2>
        <p>
          Esta aplicación <strong>no utiliza cookies de seguimiento</strong> ni herramientas de
          analítica de terceros. El único almacenamiento local usado es <code>localStorage</code>
          para guardar tu token de Meta y preferencias de la interfaz (rangos de fechas, métricas
          seleccionadas).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">9. Cambios en esta política</h2>
        <p>
          Podemos actualizar esta política ocasionalmente. Los cambios se publicarán en esta
          misma página con la fecha de actualización. El uso continuado de la aplicación implica
          la aceptación de los cambios.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">10. Contacto</h2>
        <p>
          Para cualquier consulta sobre esta política de privacidad, podés contactarnos en:{" "}
          <a href="mailto:info@tbrein.com" className="underline text-blue-500">
            info@tbrein.com
          </a>
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-12 border-t pt-6">
        Esta política aplica exclusivamente a la aplicación Paid Media Analyzer y su integración
        con la API de Meta Ads. No es aplicable a los productos o servicios de Meta Platforms, Inc.
      </p>
    </main>
  );
}
