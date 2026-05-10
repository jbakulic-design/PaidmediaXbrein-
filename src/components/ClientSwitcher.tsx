"use client";

import { useState } from "react";
import type { Workspace } from "@/lib/useWorkspace";
import { Plus, Check, Pencil, Trash2, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  workspaces: Workspace[];
  active: Workspace;
  onCreate: (name: string) => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function ClientSwitcher({ workspaces, active, onCreate, onSwitch, onRename, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    onRename(id, editName.trim());
    setEditId(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: active.color }}
        />
        <span>{active.name}</span>
        <Users className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-full left-0 mt-1 z-50 rounded-xl border shadow-xl overflow-hidden min-w-[220px]"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="p-2">
              <p className="text-xs font-semibold px-2 py-1 mb-1" style={{ color: "var(--muted-foreground)" }}>
                Clientes / Cuentas
              </p>
              {workspaces.map((w) => (
                <div key={w.id} className="flex items-center gap-1 rounded-lg hover:bg-accent transition">
                  {editId === w.id ? (
                    <div className="flex items-center gap-1 flex-1 px-2 py-1">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(w.id); if (e.key === "Escape") setEditId(null); }}
                        className="flex-1 text-xs rounded border px-1.5 py-1 outline-none"
                        style={{ background: "var(--accent)", borderColor: "var(--border)" }}
                      />
                      <button onClick={() => handleRename(w.id)} className="text-emerald-400"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setEditId(null)} style={{ color: "var(--muted-foreground)" }}><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { onSwitch(w.id); setOpen(false); }}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs text-left"
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: w.color }} />
                        <span className={cn("flex-1", w.id === active.id ? "font-semibold" : "")}>{w.name}</span>
                        {w.id === active.id && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </button>
                      <button
                        onClick={() => { setEditId(w.id); setEditName(w.name); }}
                        className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:opacity-100"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {w.id !== "default" && (
                        <button
                          onClick={() => { onDelete(w.id); if (w.id === active.id) setOpen(false); }}
                          className="p-1.5 rounded hover:text-red-400"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t p-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex gap-1">
                <input
                  placeholder="Nuevo cliente..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { handleCreate(); } }}
                  className="flex-1 text-xs rounded-lg border px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500/40"
                  style={{ background: "var(--accent)", borderColor: "var(--border)" }}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
