import { Nav, type StepProps } from '../components'
import { formatMoney } from '../lib/money'

export function AssignStep({ bill, update, onNext, onBack }: StepProps) {
  const fmt = (c: number) => formatMoney(c, bill.currency)
  const everyone = bill.people.map((p) => p.id)
  const unassigned = bill.items.filter((i) => i.assignees.length === 0)
  const single = bill.items.length === 1

  const setAssignees = (itemId: string, assignees: string[]) =>
    update((b) => ({ ...b, items: b.items.map((i) => (i.id === itemId ? { ...i, assignees } : i)) }))

  function toggle(itemId: string, personId: string) {
    const item = bill.items.find((i) => i.id === itemId)!
    const has = item.assignees.includes(personId)
    // Keep people in list order so splits are stable.
    setAssignees(itemId, has ? item.assignees.filter((a) => a !== personId) : everyone.filter((id) => id === personId || item.assignees.includes(id)))
  }

  return (
    <section className="step">
      <h2>{single ? 'Who shares this bill?' : "Whose order is it?"}</h2>
      <p className="muted">
        {single
          ? 'Select everyone splitting it — the amount is divided equally between them.'
          : 'Tap the people who had each item. Pick more than one to split that item equally between them.'}
      </p>

      {!single && (
        <p className="progress-text">
          {bill.items.length - unassigned.length} of {bill.items.length} items assigned
        </p>
      )}

      <ul className="assign-list">
        {bill.items.map((item) => {
          const n = item.assignees.length
          const allSelected = n === everyone.length
          return (
            <li key={item.id} className={`assign-card ${n === 0 ? 'pending' : ''}`}>
              <div className="row space">
                <strong>
                  {item.quantity > 1 && <span className="qty-badge">{item.quantity}×</span>}
                  {item.name || 'Unnamed item'}
                </strong>
                <span className="price-tag">{fmt(item.price)}</span>
              </div>
              <div className="chips">
                {bill.people.map((p) => {
                  const on = item.assignees.includes(p.id)
                  return (
                    <button key={p.id} className={`chip person ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(item.id, p.id)}>
                      {p.name}
                    </button>
                  )
                })}
                {everyone.length > 1 && (
                  <button className="chip subtle" onClick={() => setAssignees(item.id, allSelected ? [] : everyone)}>
                    {allSelected ? 'Clear' : 'Everyone'}
                  </button>
                )}
              </div>
              <p className="small muted">
                {n === 0 ? 'Not assigned yet' : n === 1 ? `${bill.people.find((p) => p.id === item.assignees[0])?.name} pays ${fmt(item.price)}` : `Split ${n} ways · about ${fmt(Math.round(item.price / n))} each`}
              </p>
            </li>
          )
        })}
      </ul>

      {unassigned.length > 0 && everyone.length > 1 && (
        <button
          className="btn ghost block"
          onClick={() => update((b) => ({ ...b, items: b.items.map((i) => (i.assignees.length ? i : { ...i, assignees: everyone })) }))}
        >
          Split the {unassigned.length === 1 ? 'remaining item' : `${unassigned.length} remaining items`} with everyone
        </button>
      )}

      <Nav
        onBack={onBack}
        onNext={onNext}
        nextLabel="See who owes what"
        nextDisabled={unassigned.length > 0}
        hint={unassigned.length > 0 ? `Assign ${unassigned.length === 1 ? 'the last item' : `the remaining ${unassigned.length} items`} to continue.` : undefined}
      />
    </section>
  )
}
