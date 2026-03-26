import PageHeader from "../components/layout/PageHeader"

export default function News() {

  const mockNews = [
    { title: "Tech stocks rally on AI demand", source: "Reuters" },
    { title: "Federal Reserve signals rate pause", source: "Bloomberg" },
    { title: "Nvidia leads semiconductor gains", source: "CNBC" }
  ];

  return (
    <>
    <PageHeader title="News" />
    <div style={{ padding: "20px" }}>

      <p>Market related headlines and sentiment analysis will appear here.</p>

      <ul>
        {mockNews.map((n, i) => (
          <li key={i} style={{ marginBottom: "10px" }}>
            <strong>{n.title}</strong>
            <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>
              {n.source}
            </div>
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}