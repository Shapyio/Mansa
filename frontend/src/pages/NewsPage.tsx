import PageHeader from "../components/layout/PageHeader";
import Badge from "../components/ui/Badge";

const mockNews = [
  { title: "Tech stocks rally on AI demand",       source: "Reuters",   tone: "up",   time: "2h ago" },
  { title: "Federal Reserve signals rate pause",   source: "Bloomberg", tone: "warn", time: "5h ago" },
  { title: "Nvidia leads semiconductor gains",     source: "CNBC",      tone: "up",   time: "1d ago" },
] as const;

export default function News() {
  return (
    <>
      <PageHeader title="News" subtitle="Headlines + sentiment (mock data)" />
      <div className="card" style={{ overflow: "hidden" }}>
        {mockNews.map((n, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: "var(--s-4)",
              padding: "var(--s-4) var(--s-5)",
              borderBottom: i < mockNews.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--fs-md)", fontWeight: 500, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                {n.source} · {n.time}
              </div>
            </div>
            <Badge tone={n.tone}>{n.tone}</Badge>
          </div>
        ))}
      </div>
    </>
  );
}
