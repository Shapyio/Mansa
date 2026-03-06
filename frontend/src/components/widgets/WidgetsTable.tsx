import WidgetBox from "../grid/WidgetBox";

export default function StocksTableWidget() {
  return (
    <WidgetBox title="Stocks Table">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>AAPL</td>
            <td>190</td>
          </tr>
        </tbody>
      </table>
    </WidgetBox>
  );
}