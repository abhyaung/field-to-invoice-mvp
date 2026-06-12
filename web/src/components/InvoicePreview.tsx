import type { Invoice } from '../types'

const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

export function InvoicePreview({ invoice }: { invoice: Invoice | null }) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Invoice</h2>
        {invoice && <InvoiceActions invoice={invoice} />}
      </div>

      {!invoice ? (
        <EmptyState />
      ) : (
        <div className="flex flex-1 flex-col">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 font-medium">Part</th>
                <th className="pb-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {invoice.parts_used.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-3 text-slate-400">No parts recorded yet.</td>
                </tr>
              ) : (
                invoice.parts_used.map((p, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{p.description}</td>
                    <td className="py-2 text-right tabular-nums text-slate-700">{money(p.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Labor hours" value={`${invoice.labor_hours} h`} />
            <Row label="Total parts" value={money(invoice.total_parts_cost)} />
            <Row label="Total labor" value={money(invoice.total_labor_cost)} />
          </dl>

          <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-sm font-medium text-slate-500">Grand total</span>
            <span className="text-2xl font-bold tabular-nums text-violet-600">
              {money(invoice.grand_total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="tabular-nums text-slate-700">{value}</dd>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-400">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
      </svg>
      <p className="mt-3 max-w-[12rem] text-sm">
        Describe the job in chat or by voice — the invoice builds here as you talk.
      </p>
    </div>
  )
}

function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const json = JSON.stringify(invoice, null, 2)

  const copy = () => navigator.clipboard?.writeText(json)
  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoice.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2 text-xs">
      <button onClick={copy} className="rounded-lg px-2.5 py-1 text-slate-500 hover:bg-slate-100">
        Copy JSON
      </button>
      <button onClick={download} className="rounded-lg px-2.5 py-1 text-slate-500 hover:bg-slate-100">
        Download
      </button>
    </div>
  )
}
