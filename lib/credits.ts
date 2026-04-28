// Client-side credits system (localStorage)
// Replace with server-side DB when you add user auth

const KEY = "brick-ia-credits";
const DEFAULT_CREDITS = 100;

export function getCredits(): number {
  if (typeof window === "undefined") return DEFAULT_CREDITS;
  const stored = localStorage.getItem(KEY);
  if (stored === null) {
    localStorage.setItem(KEY, String(DEFAULT_CREDITS));
    return DEFAULT_CREDITS;
  }
  return parseInt(stored, 10) || 0;
}

export function deductCredits(amount: number): boolean {
  const current = getCredits();
  if (current < amount) return false;
  localStorage.setItem(KEY, String(current - amount));
  return true;
}

export function addCredits(amount: number): void {
  const current = getCredits();
  localStorage.setItem(KEY, String(current + amount));
}

export function resetCredits(): void {
  localStorage.setItem(KEY, String(DEFAULT_CREDITS));
}

// Cost per generation (in credits)
export const CREDIT_COSTS = {
  image: 2,  // ~$0.003-0.025 real cost
  video: 10, // ~$0.02-0.05 real cost
} as const;
