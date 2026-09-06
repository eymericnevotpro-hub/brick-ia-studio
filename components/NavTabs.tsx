import Link from "next/link";

const TABS = [
  { id: "rythme", label: "Rythme", href: "/rythme", icon: "🌱" },
  { id: "dashboard", label: "Revenus", href: "/", icon: "💶" },
  { id: "tournage", label: "Tournage", href: "/tournage", icon: "🎬" },
  { id: "budget", label: "Budget", href: "/budget", icon: "💳" },
  { id: "factures", label: "Factures", href: "/factures", icon: "🧾" },
  { id: "goals", label: "Objectifs", href: "/goals", icon: "🎯" },
] as const;

export type NavTabId = (typeof TABS)[number]["id"];

// Top pill row on desktop; fixed bottom bar with icons on phones.
// `current` is loose so non-tab pages (like /install) can render without an
// active tab.
export default function NavTabs({ current }: { current?: NavTabId | string }) {
  return (
    <>
      <nav className="nav-top">
        <div className="nav-top-inner">
          {TABS.map((t) => (
            <Link key={t.id} href={t.href} className={`nav-pill${current === t.id ? " active" : ""}`}>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <nav className="nav-bottom">
        {TABS.map((t) => (
          <Link key={t.id} href={t.href} className={`nav-btm-item${current === t.id ? " active" : ""}`}>
            <span className="nav-btm-ico">{t.icon}</span>
            <span className="nav-btm-lbl">{t.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
