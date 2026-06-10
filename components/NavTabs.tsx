import Link from "next/link";

const TABS = [
  { id: "dashboard", label: "Discipline", href: "/" },
  { id: "planche", label: "Planche", href: "/training" },
  { id: "miniature", label: "Miniature", href: "/miniature" },
] as const;

export type NavTabId = (typeof TABS)[number]["id"];

export default function NavTabs({ current }: { current: NavTabId }) {
  return (
    <nav style={{ display: "flex", justifyContent: "center", padding: "18px 28px 0" }}>
      <div style={{ display: "inline-flex", gap: 4, background: "var(--bg-2)", padding: 4, borderRadius: 999, border: "1px solid var(--line)" }}>
        {TABS.map((t) => {
          const active = current === t.id;
          return (
            <Link
              key={t.id}
              href={t.href}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                background: active ? "white" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-2)",
                boxShadow: active ? "var(--shadow-sm)" : "none",
                textDecoration: "none",
                transition: "all 220ms var(--ease-out)",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
