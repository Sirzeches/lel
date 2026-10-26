import { useState } from 'react'
import { Nav, type StepProps } from '../components'
import { uid } from '../lib/state'

export function PeopleStep({ bill, update, onNext, onBack }: StepProps) {
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const duplicate = bill.people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())

  function add() {
    if (!trimmed || duplicate) return
    update((b) => ({ ...b, people: [...b.people, { id: uid(), name: trimmed }] }))
    setName('')
  }

  function remove(id: string) {
    update((b) => ({
      ...b,
      people: b.people.filter((p) => p.id !== id),
      items: b.items.map((i) => ({ ...i, assignees: i.assignees.filter((a) => a !== id) })),
    }))
  }

  return (
    <section className="step">
      <h2>Who's splitting?</h2>
      <p className="muted">Add everyone who shared this bill, including yourself.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input className="grow" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Person's name" />
        <button className="btn primary" type="submit" disabled={!trimmed || duplicate}>
          Add
        </button>
      </form>
      {duplicate && trimmed && <p className="error small">{trimmed} is already on the list.</p>}

      {bill.people.length === 0 ? (
        <p className="empty">Nobody added yet.</p>
      ) : (
        <ul className="people">
          {bill.people.map((p) => (
            <li key={p.id}>
              <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
              <input
                className="grow plain"
                value={p.name}
                onChange={(e) => update((b) => ({ ...b, people: b.people.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) }))}
                aria-label="Rename"
              />
              <button className="icon-btn" title={`Remove ${p.name}`} onClick={() => remove(p.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <Nav
        onBack={onBack}
        onNext={onNext}
        nextDisabled={bill.people.length === 0}
        hint={bill.people.length === 0 ? 'Add at least one person.' : undefined}
      />
    </section>
  )
}
