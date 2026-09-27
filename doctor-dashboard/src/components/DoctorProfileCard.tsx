import { useEffect, useRef, useState } from 'react'

type DoctorProfileCardProps = {
  name: string
  specialty: string
  initials: string
  onProfile?: () => void
  onSettings?: () => void
  onLogout?: () => void
}

export function DoctorProfileCard({ name, specialty, initials, onProfile, onSettings, onLogout }: DoctorProfileCardProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (ref.current && !ref.current.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [open])

  const toggle = () => setOpen(!open)
  const select = (callback?: () => void) => { setOpen(false); callback?.() }

  return (
    <div className="doctor-card" ref={ref} onClick={toggle}>
      <div className="avatar dark">{initials}</div>
      <div>
        <strong>{name}</strong>
        <span>{specialty}</span>
      </div>
      <button className="profile-dropdown-btn" aria-label="Account options" aria-haspopup="menu" aria-expanded={open}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d={open ? "M2 8L6 4L10 8" : "M2 4L6 8L10 4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="doctor-menu" onClick={(event) => event.stopPropagation()}>
          <button className="doctor-menu-item" onClick={() => select(onProfile)}>Profile</button>
          <button className="doctor-menu-item" onClick={() => select(onSettings)}>Settings</button>
          <button className="doctor-menu-item" onClick={() => select(onLogout)}>Logout</button>
        </div>
      )}
    </div>
  )
}
