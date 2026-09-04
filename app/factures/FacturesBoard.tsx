"use client";

import { useEffect, useState } from "react";
import { Btn, useLS } from "@/components/discipline-ui";
import {
  DEFAULT_ISSUER,
  DEFAULT_TEMPLATES,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  InvoiceTemplate,
  Issuer,
  STATUS_COLOR,
  STATUS_LABEL,
  addDays,
  buildNumber,
  fmtDate,
  fmtEur,
  invUid,
  invoiceTotal,
  lineTotal,
  monthPrefix,
  newInvoice,
  nextNumber,
} from "@/lib/invoice-store";

export default function FacturesBoard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  return <Inner />;
}

function Inner() {
  const [invoices, setInvoices] = useLS<Invoice[]>("disc.invoices.v1", []);
  const [issuer, setIssuer] = useLS<Issuer>("disc.issuer.v1", DEFAULT_ISSUER);
  const [templates, setTemplates] = useLS<InvoiceTemplate[]>("disc.invoiceTemplates.v1", DEFAULT_TEMPLATES);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = invoices.find((i) => i.id === openId) || null;
  const update = (id: string, patch: Partial<Invoice>) =>
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const create = (tpl?: InvoiceTemplate) => {
    const inv = newInvoice(invoices, tpl);
    setInvoices((prev) => [inv, ...prev]);
    setOpenId(inv.id);
  };

  const duplicate = (inv: Invoice) => {
    const copy: Invoice = {
      ...inv,
      id: invUid(),
      number: nextNumber(inv.dateIso, invoices),
      status: "brouillon",
      lines: inv.lines.map((l) => ({ ...l, id: invUid() })),
    };
    setInvoices((prev) => [copy, ...prev]);
    setOpenId(copy.id);
  };

  const remove = (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    if (openId === id) setOpenId(null);
  };

  const saveAsTemplate = (inv: Invoice) => {
    const name = window.prompt("Nom du modèle ?", inv.lines[0]?.label?.slice(0, 40) || "Nouveau modèle");
    if (!name) return;
    setTemplates((prev) => [...prev, { id: invUid(), name, lines: inv.lines.map((l) => ({ ...l, id: invUid() })), notes: inv.notes }]);
  };

  if (open) {
    return (
      <InvoiceEditor
        invoice={open}
        issuer={issuer}
        setIssuer={setIssuer}
        onUpdate={(p) => update(open.id, p)}
        onBack={() => setOpenId(null)}
        onDuplicate={() => duplicate(open)}
        onRemove={() => remove(open.id)}
        onSaveTemplate={() => saveAsTemplate(open)}
        allInvoices={invoices}
      />
    );
  }

  return (
    <InvoiceList
      invoices={invoices}
      templates={templates}
      onOpen={setOpenId}
      onCreate={create}
      onDuplicate={duplicate}
      onRemove={remove}
      onSetStatus={(id, status) => update(id, { status })}
      onRemoveTemplate={(id) => setTemplates((prev) => prev.filter((t) => t.id !== id))}
    />
  );
}

/* ══════════════════════════════ LIST ══════════════════════════════ */

function InvoiceList({
  invoices,
  templates,
  onOpen,
  onCreate,
  onDuplicate,
  onRemove,
  onSetStatus,
  onRemoveTemplate,
}: {
  invoices: Invoice[];
  templates: InvoiceTemplate[];
  onOpen: (id: string) => void;
  onCreate: (tpl?: InvoiceTemplate) => void;
  onDuplicate: (inv: Invoice) => void;
  onRemove: (id: string) => void;
  onSetStatus: (id: string, s: InvoiceStatus) => void;
  onRemoveTemplate: (id: string) => void;
}) {
  const total = invoices.reduce((s, i) => s + invoiceTotal(i), 0);
  const paid = invoices.filter((i) => i.status === "payee").reduce((s, i) => s + invoiceTotal(i), 0);
  const waiting = total - paid;

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "18px 20px 60px", maxWidth: 760, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)", fontSize: 20 }}>🧾</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Factures</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{invoices.length} facture{invoices.length > 1 ? "s" : ""}</div>
          </div>
        </div>
        <Btn kind="primary" size="md" icon="plus" onClick={() => onCreate()}>Nouvelle facture</Btn>
      </header>

      {invoices.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Stat label="Total facturé" value={fmtEur(total)} />
          <Stat label="Encaissé" value={fmtEur(paid)} color="var(--green)" />
          <Stat label="En attente" value={fmtEur(waiting)} color="var(--orange)" />
        </div>
      )}

      {/* Templates */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
          Modèles — créer en 1 clic
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {templates.map((t) => (
            <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--bg-2)", borderRadius: 999, padding: "4px 4px 4px 12px" }}>
              <button onClick={() => onCreate(t)} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "transparent" }}>
                {t.name}
              </button>
              <button onClick={() => onRemoveTemplate(t.id)} title="Supprimer le modèle" style={{ width: 20, height: 20, borderRadius: "50%", background: "transparent", color: "var(--ink-3)", fontSize: 12, display: "grid", placeItems: "center" }}>✕</button>
            </span>
          ))}
          {templates.length === 0 && <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Aucun modèle. Ouvre une facture → « Enregistrer comme modèle ».</span>}
        </div>
      </div>

      {/* Invoice rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {invoices.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 18, padding: 26, textAlign: "center", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Aucune facture. Clique <b>« Nouvelle facture »</b> ou choisis un modèle.<br />
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Ton 1<sup>er</sup> numéro sera <span className="mono">{buildNumber(new Date().toISOString().slice(0, 10), 1)}</span>.</span>
          </div>
        )}
        {invoices.map((inv) => (
          <div key={inv.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => onOpen(inv.id)} style={{ flex: 1, minWidth: 160, textAlign: "left", background: "transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{inv.number}</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: STATUS_COLOR[inv.status] }}>{STATUS_LABEL[inv.status]}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{inv.client.name || "Client à renseigner"} · {fmtDate(inv.dateIso)}</div>
            </button>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{fmtEur(invoiceTotal(inv))}</div>
            <select
              value={inv.status}
              onChange={(e) => onSetStatus(inv.id, e.target.value as InvoiceStatus)}
              style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 8px", fontSize: 12, color: "var(--ink)" }}
            >
              <option value="brouillon">Brouillon</option>
              <option value="envoyee">Envoyée</option>
              <option value="payee">Payée</option>
            </select>
            <button onClick={() => onDuplicate(inv)} title="Dupliquer" style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-2)", color: "var(--ink-2)", fontSize: 13, display: "grid", placeItems: "center" }}>⧉</button>
            <button onClick={() => onRemove(inv.id)} title="Supprimer" style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 13, display: "grid", placeItems: "center" }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55, marginTop: 16 }}>
        Numérotation automatique <span className="mono">MMAA + n°</span> — ex. <span className="mono">0926002</span> = 2<sup>e</sup> facture de septembre 2026. Le compteur repart à 001 chaque mois.
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: color || "var(--ink)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

/* ══════════════════════════ EDITOR / SHEET ══════════════════════════ */

function InvoiceEditor({
  invoice,
  issuer,
  setIssuer,
  onUpdate,
  onBack,
  onDuplicate,
  onRemove,
  onSaveTemplate,
  allInvoices,
}: {
  invoice: Invoice;
  issuer: Issuer;
  setIssuer: (fn: (prev: Issuer) => Issuer) => void;
  onUpdate: (patch: Partial<Invoice>) => void;
  onBack: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onSaveTemplate: () => void;
  allInvoices: Invoice[];
}) {
  const [showIssuer, setShowIssuer] = useState(false);
  const total = invoiceTotal(invoice);

  const setLine = (id: string, patch: Partial<InvoiceLine>) =>
    onUpdate({ lines: invoice.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLine = () => onUpdate({ lines: [...invoice.lines, { id: invUid(), label: "", qty: 1, unitPrice: 0 }] });
  const removeLine = (id: string) => onUpdate({ lines: invoice.lines.filter((l) => l.id !== id) });

  // Changing the date re-suggests a number for that month (only if untouched).
  const setDate = (dateIso: string) => {
    const others = allInvoices.filter((i) => i.id !== invoice.id);
    const stillDefault = invoice.number.startsWith(monthPrefix(invoice.dateIso));
    onUpdate({
      dateIso,
      dueIso: addDays(dateIso, 30),
      number: stillDefault ? nextNumber(dateIso, others) : invoice.number,
    });
  };

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "14px 16px 60px", maxWidth: 860, margin: "0 auto" }}>
      {/* Toolbar */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Btn kind="ghost" size="sm" onClick={onBack}>← Retour</Btn>
        <div style={{ flex: 1 }} />
        <Btn kind="soft" size="sm" onClick={() => setShowIssuer((v) => !v)}>Mes infos</Btn>
        <Btn kind="soft" size="sm" onClick={onSaveTemplate}>Enregistrer comme modèle</Btn>
        <Btn kind="soft" size="sm" onClick={onDuplicate}>Dupliquer</Btn>
        <Btn kind="primary" size="sm" onClick={() => window.print()}>Imprimer / PDF</Btn>
        <button onClick={onRemove} title="Supprimer" style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 14, display: "grid", placeItems: "center" }}>✕</button>
      </div>

      {/* Issuer settings */}
      {showIssuer && (
        <div className="no-print" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 16, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {([
            ["name", "Ton nom"],
            ["business", "Nom commercial"],
            ["siret", "SIRET"],
            ["address", "Adresse"],
            ["email", "Email"],
            ["phone", "Téléphone"],
            ["iban", "IBAN"],
            ["bic", "BIC"],
          ] as [keyof Issuer, string][]).map(([k, label]) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</span>
              <input
                value={issuer[k]}
                onChange={(e) => setIssuer((prev) => ({ ...prev, [k]: e.target.value }))}
                style={{ background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", color: "var(--ink)" }}
              />
            </label>
          ))}
        </div>
      )}

      {/* ── The invoice sheet (this is what prints) ── */}
      <div className="print-sheet" style={{ background: "white", border: "1px solid var(--line)", borderRadius: 18, padding: "34px 32px", boxShadow: "var(--shadow-sm)", color: "#1A1208" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>{issuer.business || issuer.name || "Ton entreprise"}</div>
            <div style={{ fontSize: 12.5, color: "#6B5D4D", lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-line" }}>
              {[issuer.name, issuer.address, issuer.email, issuer.phone].filter(Boolean).join("\n")}
              {issuer.siret ? `\nSIRET : ${issuer.siret}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A89684", fontWeight: 700 }}>Facture</div>
            <SheetInput
              value={invoice.number}
              onChange={(v) => onUpdate({ number: v })}
              mono
              style={{ fontSize: 23, fontWeight: 700, textAlign: "right", width: 150 }}
            />
            <div style={{ fontSize: 12, color: "#6B5D4D", marginTop: 6, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
              <span>Date : <SheetDate value={invoice.dateIso} onChange={setDate} /></span>
              <span>Échéance : <SheetDate value={invoice.dueIso} onChange={(v) => onUpdate({ dueIso: v })} /></span>
            </div>
          </div>
        </div>

        {/* Client */}
        <div style={{ background: "#FBF6EF", borderRadius: 12, padding: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A89684", fontWeight: 700, marginBottom: 5 }}>Facturé à</div>
          <SheetInput value={invoice.client.name} onChange={(v) => onUpdate({ client: { ...invoice.client, name: v } })} placeholder="Nom du client / société" style={{ fontSize: 15, fontWeight: 600, width: "100%" }} />
          <SheetArea value={invoice.client.address} onChange={(v) => onUpdate({ client: { ...invoice.client, address: v } })} placeholder="Adresse" rows={2} style={{ fontSize: 12.5, color: "#6B5D4D", width: "100%" }} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <SheetInput value={invoice.client.email} onChange={(v) => onUpdate({ client: { ...invoice.client, email: v } })} placeholder="Email" style={{ fontSize: 12.5, color: "#6B5D4D", width: 200 }} />
            <SheetInput value={invoice.client.siret} onChange={(v) => onUpdate({ client: { ...invoice.client, siret: v } })} placeholder="SIRET / TVA (si pro)" style={{ fontSize: 12.5, color: "#6B5D4D", width: 200 }} />
          </div>
        </div>

        {/* Lines */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid #E9DFD2" }}>
              <th style={{ textAlign: "left", padding: "0 0 7px", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A89684", fontWeight: 700 }}>Désignation</th>
              <th style={{ textAlign: "right", padding: "0 0 7px", width: 54, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A89684", fontWeight: 700 }}>Qté</th>
              <th style={{ textAlign: "right", padding: "0 0 7px", width: 92, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A89684", fontWeight: 700 }}>P.U.</th>
              <th style={{ textAlign: "right", padding: "0 0 7px", width: 96, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A89684", fontWeight: 700 }}>Total</th>
              <th className="no-print" style={{ width: 26 }} />
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid #F2EAE0" }}>
                <td style={{ padding: "8px 0" }}>
                  <SheetInput value={l.label} onChange={(v) => setLine(l.id, { label: v })} placeholder="Description de la prestation" style={{ width: "100%", fontSize: 13 }} />
                </td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>
                  <SheetNumber value={l.qty} onChange={(v) => setLine(l.id, { qty: v })} width={44} />
                </td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>
                  <SheetNumber value={l.unitPrice} onChange={(v) => setLine(l.id, { unitPrice: v })} width={78} suffix=" €" />
                </td>
                <td className="mono" style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>{fmtEur(lineTotal(l))}</td>
                <td className="no-print" style={{ textAlign: "right" }}>
                  <button onClick={() => removeLine(l.id)} title="Retirer la ligne" style={{ width: 22, height: 22, borderRadius: 6, background: "#FBF0E8", color: "#C44A00", fontSize: 11, display: "grid", placeItems: "center" }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="no-print" onClick={addLine} style={{ marginTop: 10, padding: "7px 14px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange)", fontSize: 12.5, fontWeight: 600, border: "1px dashed var(--orange-100)" }}>
          + Ajouter une ligne
        </button>

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <div style={{ minWidth: 232 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B5D4D", padding: "5px 0" }}>
              <span>Total HT</span><span className="mono">{fmtEur(total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#A89684", padding: "3px 0" }}>
              <span>TVA</span><span>Non applicable</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, borderTop: "1.5px solid #E9DFD2", marginTop: 6, paddingTop: 9 }}>
              <span>Net à payer</span><span className="mono" style={{ color: "#FF6A1A" }}>{fmtEur(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment + legal */}
        {(issuer.iban || issuer.bic) && (
          <div style={{ marginTop: 22, fontSize: 12, color: "#6B5D4D", lineHeight: 1.6 }}>
            <b style={{ color: "#1A1208" }}>Règlement par virement</b>
            {issuer.iban ? <><br />IBAN : <span className="mono">{issuer.iban}</span></> : null}
            {issuer.bic ? <><br />BIC : <span className="mono">{issuer.bic}</span></> : null}
          </div>
        )}

        <SheetArea
          value={invoice.notes}
          onChange={(v) => onUpdate({ notes: v })}
          placeholder="Mentions légales / conditions"
          rows={4}
          style={{ marginTop: 20, width: "100%", fontSize: 11, color: "#8A7A68", lineHeight: 1.6 }}
        />
      </div>

      <div className="no-print" style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55, marginTop: 14 }}>
        Tout se modifie directement sur la facture. <b>Imprimer / PDF</b> → dans la fenêtre d&apos;impression, choisis <b>« Enregistrer au format PDF »</b>.
        {!issuer.siret && <><br /><span style={{ color: "#C44A00" }}>⚠️ Ajoute ton SIRET et ton adresse dans « Mes infos » — c&apos;est obligatoire sur une facture.</span></>}
      </div>
    </div>
  );
}

/* ── document-style inputs (look like text, print clean) ── */

function SheetInput({ value, onChange, placeholder, style, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties; mono?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={mono ? "mono sheet-in" : "sheet-in"}
      style={{ background: "transparent", border: "none", outline: "none", padding: "2px 0", color: "inherit", ...style }}
    />
  );
}

function SheetArea({ value, onChange, placeholder, rows, style }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; style?: React.CSSProperties }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="sheet-in"
      style={{ background: "transparent", border: "none", outline: "none", padding: "2px 0", resize: "vertical", fontFamily: "inherit", color: "inherit", ...style }}
    />
  );
}

function SheetDate({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="sheet-in"
      style={{ background: "transparent", border: "none", outline: "none", color: "inherit", fontSize: 12, fontFamily: "inherit", padding: 0 }}
    />
  );
}

function SheetNumber({ value, onChange, width, suffix }: { value: number; onChange: (v: number) => void; width: number; suffix?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
      <input
        type="number"
        min={0}
        step="0.01"
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mono sheet-in"
        style={{ width, textAlign: "right", background: "transparent", border: "none", outline: "none", fontSize: 13, color: "inherit", padding: "2px 0" }}
      />
      {suffix && <span className="mono" style={{ fontSize: 13 }}>{suffix}</span>}
    </span>
  );
}
