const REPORTS: [string, string, string][] = [
  ["stock", "Stock summary", "Item, unit, quantity, average cost, value, minimum, low flag"],
  ["money-flow", "Money flow", "Day, money in, money out, net (uses the dates)"],
  ["purchases", "Purchases", "Number, date, vendor, total, paid, due"],
  ["sales", "Sales", "Number, date, customer, total, received, due, gross profit"],
  ["customer-dues", "Customer dues", "Party, billed, paid, balance"],
  ["vendor-dues", "Vendor dues", "Party, billed, paid, balance"],
  ["labour", "Labour payments", "Date, worker, amount, batch, note"],
  ["production", "Production cost", "Batch, product, date, material, labour, other, good units, cost per unit"],
];

export default function Reports() {
  return (
    <>
      <h1>Reports (CSV)</h1>
      <form method="get" className="form inline" id="f" action="#">
        <p className="muted" style={{ flexBasis: "100%" }}>Optional date filter. Leave empty for everything. Stock summary and dues ignore the dates.</p>
        <label>From<input type="date" name="from" id="from" /></label>
        <label>To<input type="date" name="to" id="to" /></label>
      </form>
      {REPORTS.map(([k, t, d]) => (
        <div className="card" key={k}><b>{t}</b><div className="muted">{d}</div>
          <a className="btn" href={`/api/csv/${k}`} data-report={k}>Download CSV</a></div>
      ))}
      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelectorAll('[data-report]').forEach(function(a){
          a.addEventListener('click',function(e){
            var q=new URLSearchParams(); var f=document.getElementById('from').value, t=document.getElementById('to').value;
            if(f) q.set('from',f); if(t) q.set('to',t);
            a.setAttribute('href','/api/csv/'+a.dataset.report+(q.toString()?'?'+q:''));
          });
        });` }} />
    </>
  );
}
