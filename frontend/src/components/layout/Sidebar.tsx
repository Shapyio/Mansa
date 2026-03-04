type Props = {
  isOpen: boolean;
};

export default function Sidebar({ isOpen }: Props) {
  if (!isOpen) return null;

  return (
    <div style={{
      width: "220px",
      background: "#1b2635",
      color: "white",
      height: "100%",
      padding: "1rem"
    }}>
      <h3>Navigation</h3>
      <ul>
        <li>Dashboard</li>
        <li>Tools</li>
        <li>Performance</li>
        <li>News</li>
        <li>Stocks</li>
      </ul>
    </div>
  );
}