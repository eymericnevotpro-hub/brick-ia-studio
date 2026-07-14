// Daily expense tracking for the Budget page. Everything lives in
// localStorage; expenses are a flat list filtered by month for display.

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number; // €
  note?: string;
  who?: "brick" | "suzy" | "commun";
}

export interface ExpenseCategory {
  name: string;
  emoji: string;
  color: string;
}

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { name: "Nourriture", emoji: "🍔", color: "#FF6A1A" },
  { name: "Courses", emoji: "🛒", color: "#F2A900" },
  { name: "Restaurant", emoji: "🍽️", color: "#E5571A" },
  { name: "Loisirs", emoji: "🎉", color: "#FF4F9D" },
  { name: "Abonnements", emoji: "📺", color: "#7C5CFF" },
  { name: "Transport", emoji: "🚗", color: "#19A36A" },
  { name: "Shopping", emoji: "🛍️", color: "#00A5B5" },
  { name: "Santé", emoji: "💊", color: "#0C8B8B" },
  { name: "Autre", emoji: "💸", color: "#8A857D" },
];

export function budgetMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function budgetTodayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function budgetUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

export function expensesForMonth(all: Expense[], monthKey: string): Expense[] {
  return all.filter((e) => e.date.startsWith(monthKey));
}

export interface CategoryTotal {
  category: string;
  emoji: string;
  color: string;
  total: number;
  count: number;
  pct: number; // share of the month's total
}

export function totalsByCategory(expenses: Expense[], categories: ExpenseCategory[]): CategoryTotal[] {
  const grand = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const map = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const cur = map.get(e.category) ?? { total: 0, count: 0 };
    cur.total += e.amount || 0;
    cur.count += 1;
    map.set(e.category, cur);
  }
  const findCat = (name: string) => categories.find((c) => c.name === name);
  return [...map.entries()]
    .map(([category, { total, count }]) => {
      const cat = findCat(category);
      return {
        category,
        emoji: cat?.emoji ?? "💸",
        color: cat?.color ?? "#8A857D",
        total,
        count,
        pct: grand > 0 ? total / grand : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export const fmtEur2 = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

export function budgetMonthLabel(d = new Date()): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
