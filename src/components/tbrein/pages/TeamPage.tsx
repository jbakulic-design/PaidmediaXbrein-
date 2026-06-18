"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, Users, Plus, Trash2, Check, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface Client {
  id: string;
  name: string;
}

interface UserClient {
  user_id: string;
  client_id: string;
}

interface Props {
  isSuperAdmin?: boolean;
}

export function TeamPage({ isSuperAdmin = false }: Props) {
  const supabase = createClient();
  const [profiles, setProfiles]     = useState<Profile[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);
  const [userClients, setUserClients] = useState<UserClient[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<string | null>(null);
  const [newClient, setNewClient]   = useState("");
  const [addingClient, setAddingClient] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadAll();
  }, [isSuperAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true);
    const [p, c, uc] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("clients").select("*").order("name"),
      supabase.from("user_clients").select("*"),
    ]);
    setProfiles(p.data ?? []);
    setClients(c.data ?? []);
    setUserClients(uc.data ?? []);
    setLoading(false);
  }

  function hasAccess(userId: string, clientId: string) {
    return userClients.some(uc => uc.user_id === userId && uc.client_id === clientId);
  }

  async function toggleAccess(userId: string, clientId: string) {
    const key = `${userId}-${clientId}`;
    setSaving(key);
    if (hasAccess(userId, clientId)) {
      await supabase.from("user_clients").delete()
        .eq("user_id", userId).eq("client_id", clientId);
      setUserClients(prev => prev.filter(uc => !(uc.user_id === userId && uc.client_id === clientId)));
    } else {
      await supabase.from("user_clients").insert({ user_id: userId, client_id: clientId });
      setUserClients(prev => [...prev, { user_id: userId, client_id: clientId }]);
    }
    setSaving(null);
  }

  async function handleAddClient() {
    if (!newClient.trim()) return;
    setAddingClient(true);
    const { data } = await supabase.from("clients").insert({ name: newClient.trim() }).select().single();
    if (data) setClients(prev => [...prev, data]);
    setNewClient("");
    setAddingClient(false);
  }

  async function handleDeleteClient(clientId: string) {
    if (!confirm("¿Eliminar este cliente? Se quitará el acceso a todos los usuarios.")) return;
    await supabase.from("clients").delete().eq("id", clientId);
    setClients(prev => prev.filter(c => c.id !== clientId));
    setUserClients(prev => prev.filter(uc => uc.client_id !== clientId));
  }

  // Vista para usuarios no-admin
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <h2 className="text-lg font-bold">Equipo</h2>
        <div className="rounded-xl border px-5 py-4 flex items-start gap-3"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <Shield className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Solo el administrador puede gestionar usuarios y accesos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Gestión de usuarios</h2>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Asigna clientes a cada usuario. Solo tú ves esta sección.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted-foreground)" }} />
          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>Cargando…</span>
        </div>
      ) : (
        <>
          {/* Matriz de permisos */}
          <div className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}>

            <div className="px-5 py-3 border-b flex items-center gap-2"
              style={{ borderColor: "var(--border)" }}>
              <Users className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <span className="text-sm font-semibold">Acceso por cliente</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left px-5 py-3 font-medium text-xs"
                      style={{ color: "var(--muted-foreground)" }}>
                      Usuario
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-xs"
                      style={{ color: "var(--muted-foreground)" }}>
                      Rol
                    </th>
                    {clients.map(c => (
                      <th key={c.id} className="text-center px-4 py-3 font-medium text-xs min-w-[120px]"
                        style={{ color: "var(--muted-foreground)" }}>
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                            {(p.full_name ?? p.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-xs">{p.full_name ?? "—"}</p>
                            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          p.role === "super_admin"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {p.role === "super_admin" ? "Super Admin" : "Usuario"}
                        </span>
                      </td>
                      {clients.map(c => {
                        const key = `${p.id}-${c.id}`;
                        const active = hasAccess(p.id, c.id);
                        const isLoading = saving === key;
                        return (
                          <td key={c.id} className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleAccess(p.id, c.id)}
                              disabled={!!saving}
                              className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition ${
                                active
                                  ? "bg-emerald-500/15 border border-emerald-500/30 hover:bg-red-500/10 hover:border-red-500/30"
                                  : "border hover:bg-blue-500/10 hover:border-blue-500/30"
                              }`}
                              style={{ borderColor: active ? undefined : "var(--border)" }}
                              title={active ? "Quitar acceso" : "Dar acceso"}
                            >
                              {isLoading
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--muted-foreground)" }} />
                                : active
                                  ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  : <Plus className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                              }
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agregar cliente */}
          <div className="rounded-xl border px-5 py-4 flex flex-col gap-3"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <p className="text-sm font-semibold">Clientes</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newClient}
                onChange={e => setNewClient(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddClient()}
                placeholder="Nombre del nuevo cliente…"
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <button
                onClick={handleAddClient}
                disabled={!newClient.trim() || addingClient}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {addingClient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Agregar
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-1">
              {clients.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
                  style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
                  {c.name}
                  <button onClick={() => handleDeleteClient(c.id)}
                    className="hover:text-red-400 transition ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
