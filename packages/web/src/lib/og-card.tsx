interface OgCardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  stats?: string[];
  footer?: string;
}

export function OgCard({
  eyebrow,
  title,
  subtitle,
  stats = [],
  footer = "From what you learn to what your agent does.",
}: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#f3eadc",
        color: "#201c18",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#c75337",
          }}
        >
          fondof
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#7b7065",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 1000,
            fontSize: 64,
            lineHeight: 1.05,
            fontWeight: 700,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 900,
            fontSize: 26,
            lineHeight: 1.3,
            color: "#6f655c",
          }}
        >
          {subtitle}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {stats.length > 0 && (
          <div style={{ display: "flex", gap: 16 }}>
            {stats.map((stat) => (
              <div
                key={stat}
                style={{
                  display: "flex",
                  padding: "12px 18px",
                  borderRadius: 999,
                  background: "#e6d8c6",
                  color: "#4c4239",
                  fontSize: 20,
                }}
              >
                {stat}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 20, color: "#8f8276" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}
