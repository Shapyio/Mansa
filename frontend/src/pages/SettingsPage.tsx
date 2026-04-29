import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import { IconMoon, IconSun } from "../components/ui/Icons";
import { useTheme } from "../hooks/useTheme";

export default function Settings() {
  const [theme, setTheme] = useTheme();

  return (
    <>
      <PageHeader title="Settings" subtitle="Personalize your workspace" />

      <div className="card card--padded" style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)", maxWidth: 720 }}>

        <Section title="Appearance" desc="Switch between light and dark themes. Per-account preferences are coming with auth.">
          <div style={{ display: "flex", gap: "var(--s-2)" }}>
            <Button
              variant={theme === "dark" ? "primary" : "default"}
              icon={<IconMoon />}
              onClick={() => setTheme("dark")}
            >Dark</Button>
            <Button
              variant={theme === "light" ? "primary" : "default"}
              icon={<IconSun />}
              onClick={() => setTheme("light")}
            >Light</Button>
          </div>
        </Section>

        <Divider />

        <Section title="Dashboard" desc="Reset stored widget layout if things get tangled.">
          <Button onClick={() => {
            if (!confirm("Reset dashboard layout to defaults?")) return;
            localStorage.removeItem("dashboard.visible");
            localStorage.removeItem("dashboard.layouts");
            location.reload();
          }}>Reset Layout</Button>
        </Section>

        <Divider />

        <Section title="Account" desc="Sign-in, multi-user, and per-account preferences are not implemented yet.">
          <Button disabled>Coming soon</Button>
        </Section>

      </div>
    </>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--s-4)", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: "var(--fs-md)", fontWeight: 500, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>{desc}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Divider() { return <div style={{ height: 1, background: "var(--line)" }} />; }
