// Grocery / nutrition list for the Sport tab. Prices are ESTIMATES for
// Carrefour Market Kennedy (Rennes) — to verify in store.

export type Who = "toi" | "copine" | "commun";

export interface GroceryItem {
  id: string;
  name: string;
  qty: string;
  price: number; // € estimate (Carrefour Market Kennedy, Rennes)
  who: Who;
  bought?: boolean;
  // Whey to buy: only show it when the user does NOT already have protein powder.
  onlyIfNoProtein?: boolean;
}

// Default weekly list. Muscle-building bias for "toi", normal for "copine".
export const DEFAULT_GROCERIES: GroceryItem[] = [
  // ── Toi (prise de muscle : protéines + calories) ──
  { id: "oeufs", name: "Œufs (boîte de 12)", qty: "×12", price: 2.6, who: "toi" },
  { id: "poulet", name: "Blancs de poulet", qty: "1 kg", price: 8.5, who: "toi" },
  { id: "steak", name: "Steak haché 5%", qty: "5 × 100 g", price: 6.0, who: "toi" },
  { id: "thon", name: "Thon en boîte", qty: "×4", price: 4.5, who: "toi" },
  { id: "skyr", name: "Skyr nature", qty: "1 kg", price: 3.2, who: "toi" },
  { id: "fromageblanc", name: "Fromage blanc 0%", qty: "1 kg", price: 2.2, who: "toi" },
  { id: "flocons", name: "Flocons d'avoine", qty: "1 kg", price: 1.6, who: "toi" },
  { id: "banane", name: "Bananes", qty: "1 kg", price: 1.9, who: "toi" },
  { id: "pdc", name: "Beurre de cacahuète", qty: "500 g", price: 3.5, who: "toi" },
  { id: "amandes", name: "Amandes", qty: "200 g", price: 2.8, who: "toi" },
  { id: "miel", name: "Miel", qty: "1 pot", price: 3.0, who: "toi" },
  { id: "whey", name: "Protéine en poudre (whey)", qty: "1 kg", price: 20.0, who: "toi", onlyIfNoProtein: true },

  // ── Copine (alimentation normale, 64 kg / 1m63) ──
  { id: "yaourts", name: "Yaourts nature", qty: "×8", price: 1.8, who: "copine" },
  { id: "poisson", name: "Filet de poisson blanc", qty: "2 filets", price: 5.0, who: "copine" },
  { id: "muesli", name: "Muesli / céréales", qty: "1 paquet", price: 3.0, who: "copine" },
  { id: "fruits", name: "Fruits (pommes, clémentines)", qty: "1,5 kg", price: 4.0, who: "copine" },
  { id: "salade", name: "Salade / crudités", qty: "1", price: 1.8, who: "copine" },

  // ── Commun (foyer) ──
  { id: "riz", name: "Riz basmati", qty: "1 kg", price: 2.5, who: "commun" },
  { id: "pates", name: "Pâtes complètes", qty: "1 kg", price: 1.5, who: "commun" },
  { id: "pain", name: "Pain complet", qty: "1", price: 1.3, who: "commun" },
  { id: "legumes", name: "Légumes surgelés (brocoli, haricots)", qty: "1 kg", price: 3.0, who: "commun" },
  { id: "legumesfrais", name: "Légumes frais (courgettes, tomates)", qty: "~1 kg", price: 4.0, who: "commun" },
  { id: "huile", name: "Huile d'olive", qty: "1 L", price: 6.0, who: "commun" },
  { id: "lait", name: "Lait", qty: "2 × 1 L", price: 2.0, who: "commun" },
  { id: "oignonail", name: "Oignons + ail", qty: "1", price: 2.0, who: "commun" },
];

export interface Meal {
  id: string;
  when: string;
  title: string;
  detail: (hasProtein: boolean) => string;
}

export const MEALS: Meal[] = [
  {
    id: "shaker",
    when: "Matin",
    title: "Shaker",
    detail: (p) =>
      p
        ? "300 ml lait + 30 g whey + 60 g flocons + 1 banane + 1 c. à s. beurre de cacahuète (~40 g protéines)."
        : "300 ml lait + 80 g flocons + 1 banane + 1 c. à s. beurre de cacahuète + skyr (~30 g protéines). Ajoute la whey dès que tu en as.",
  },
  {
    id: "collation",
    when: "Après-midi",
    title: "Collation",
    detail: () => "Skyr + poignée d'amandes + fruit, OU boîte de thon + pain complet.",
  },
];

export const WHO_LABEL: Record<Who, string> = {
  toi: "Pour toi (muscle)",
  copine: "Pour ta copine",
  commun: "Commun (foyer)",
};

export function visibleItems(items: GroceryItem[], hasProtein: boolean): GroceryItem[] {
  return items.filter((i) => !(i.onlyIfNoProtein && hasProtein));
}

export function coursesUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

export const fmtEur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
