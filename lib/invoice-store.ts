// Invoice creation for a French autoentrepreneur (micro-entreprise).
// Numbering: MMYY + 3-digit sequence within that month.
// e.g. 2nd invoice of September 2026 → "0926002".

export interface InvoiceLine {
  id: string;
  label: string;
  qty: number;
  unitPrice: number; // € HT
}

export type InvoiceStatus = "brouillon" | "envoyee" | "payee";

export interface Client {
  name: string;
  address: string;
  email: string;
  siret: string;
}

export interface Invoice {
  id: string;
  number: string;
  dateIso: string; // YYYY-MM-DD (issue date)
  dueIso: string; // YYYY-MM-DD (due date)
  client: Client;
  lines: InvoiceLine[];
  notes: string;
  status: InvoiceStatus;
}

// Your own details, printed at the top of every invoice.
export interface Issuer {
  name: string;
  business: string;
  address: string;
  email: string;
  phone: string;
  siret: string;
  iban: string;
  bic: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  lines: InvoiceLine[];
  notes: string;
}

export function invUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

export function isoToday(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return isoToday(d);
}

// "0926" for September 2026 — the month prefix of an invoice number.
export function monthPrefix(iso: string): string {
  const [y, m] = iso.split("-");
  return `${m}${y.slice(2)}`;
}

export function buildNumber(iso: string, seq: number): string {
  return `${monthPrefix(iso)}${String(seq).padStart(3, "0")}`;
}

// Next sequence for the month of `iso`, based on existing invoices.
export function nextNumber(iso: string, invoices: Invoice[]): string {
  const prefix = monthPrefix(iso);
  const used = invoices
    .filter((i) => i.number.startsWith(prefix))
    .map((i) => parseInt(i.number.slice(prefix.length), 10) || 0);
  const seq = used.length ? Math.max(...used) + 1 : 1;
  return buildNumber(iso, seq);
}

export function lineTotal(l: InvoiceLine): number {
  return (l.qty || 0) * (l.unitPrice || 0);
}

export function invoiceTotal(inv: Invoice): number {
  return inv.lines.reduce((s, l) => s + lineTotal(l), 0);
}

export const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Legal mentions required on a micro-entreprise invoice (editable).
export const DEFAULT_NOTES = `TVA non applicable, art. 293 B du CGI.
Paiement à réception de facture, par virement.
En cas de retard : pénalités au taux de 3 × l'intérêt légal + indemnité forfaitaire de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce). Pas d'escompte pour paiement anticipé.`;

export const DEFAULT_ISSUER: Issuer = {
  name: "Eymeric Nevot",
  business: "Brick IA Academy",
  address: "",
  email: "eymeric.nevot.pro@gmail.com",
  phone: "",
  siret: "",
  iban: "",
  bic: "",
};

export const DEFAULT_TEMPLATES: InvoiceTemplate[] = [
  {
    id: "tpl-short",
    name: "Vidéo courte (marque)",
    notes: DEFAULT_NOTES,
    lines: [{ id: "l1", label: "Vidéo courte format vertical — création & montage", qty: 1, unitPrice: 80 }],
  },
  {
    id: "tpl-long",
    name: "Vidéo longue (marque)",
    notes: DEFAULT_NOTES,
    lines: [{ id: "l1", label: "Vidéo longue — script, tournage & montage", qty: 1, unitPrice: 150 }],
  },
  {
    id: "tpl-pack",
    name: "Pack 4 vidéos courtes",
    notes: DEFAULT_NOTES,
    lines: [{ id: "l1", label: "Pack 4 vidéos courtes — création & montage", qty: 4, unitPrice: 80 }],
  },
  {
    id: "tpl-presta",
    name: "Prestation / accompagnement IA",
    notes: DEFAULT_NOTES,
    lines: [{ id: "l1", label: "Accompagnement / consulting IA", qty: 1, unitPrice: 0 }],
  },
];

export function emptyClient(): Client {
  return { name: "", address: "", email: "", siret: "" };
}

export function newInvoice(invoices: Invoice[], tpl?: InvoiceTemplate): Invoice {
  const dateIso = isoToday();
  return {
    id: invUid(),
    number: nextNumber(dateIso, invoices),
    dateIso,
    dueIso: addDays(dateIso, 30),
    client: emptyClient(),
    lines: tpl
      ? tpl.lines.map((l) => ({ ...l, id: invUid() }))
      : [{ id: invUid(), label: "", qty: 1, unitPrice: 0 }],
    notes: tpl ? tpl.notes : DEFAULT_NOTES,
    status: "brouillon",
  };
}

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
};

export const STATUS_COLOR: Record<InvoiceStatus, string> = {
  brouillon: "var(--ink-3)",
  envoyee: "var(--orange)",
  payee: "var(--green)",
};
