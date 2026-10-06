import { useState, useMemo } from 'react'
import type { Doctor } from '../types/doctor'

export default function DoctorPicker({ doctors, selectedIds, onChange }: { doctors: Doctor[]; selectedIds: number[]; onChange: (ids: number[]) => void }) {
  const [query, setQuery] = useState('')
  const options = useMemo(() => doctors.filter(d => d.name.toLowerCase().includes(query.trim().toLowerCase())), [doctors, query])
  const toggle = (id: number) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id))
    else onChange([...selectedIds, id])
  }
  return <div className="search-select doctor-picker">
    <input placeholder="Search doctors by name" value={query} onChange={(e) => setQuery(e.target.value)} />
    <div className="search-options">
      {options.map((d) => <button key={d.id} className={`search-option ${selectedIds.includes(d.id) ? 'selected' : ''}`} onClick={() => toggle(d.id)}>
        <span className="avatar" style={{ background: d.color }}>{d.initials}</span>
        <div className="option-label"><strong>{d.name}</strong></div>
        <div className="option-action">{selectedIds.includes(d.id) ? 'Selected' : 'Select'}</div>
      </button>)}
      {options.length === 0 && <div className="search-empty">No doctors found.</div>}
    </div>
  </div>
}
