import { useState } from 'react'
import type { Patient } from '../types/patient'

export function PatientMessagesView({ patients, selected, onSelect }: { patients: Patient[]; selected: Patient; onSelect: (id: number) => void }) {
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [conversationStatus, setConversationStatus] = useState('Messages are private and recorded in the patient’s communication history.')
  const [pinned, setPinned] = useState(false)
  const [notificationPreference, setNotificationPreference] = useState('All messages')
  const [patientInfoOpen, setPatientInfoOpen] = useState(false)
  const [importantNext, setImportantNext] = useState(false)
  const [messages, setMessages] = useState<Record<number, { text: string; side: 'doctor' | 'patient'; time: string; important?: boolean }[]>>({
    1: [{ text: 'Good morning, Maria. How are you feeling today?', side: 'doctor', time: '9:02 AM', important: true }, { text: 'Good morning, Doctor. I am feeling better, but I was unable to sleep well last night.', side: 'patient', time: '9:08 AM', important: false }, { text: 'Thank you for letting me know. Please try to complete your sleep log when you can.', side: 'doctor', time: '9:10 AM', important: false }],
    2: [{ text: 'I have submitted my breakfast and walk today.', side: 'patient', time: '8:14 AM', important: false }, { text: 'Great work, John. Keep it up.', side: 'doctor', time: '8:20 AM', important: true }],
    3: [{ text: 'My activity has been lower this week.', side: 'patient', time: 'Yesterday', important: false }, { text: 'Thank you for sharing. Let us review this during your check-in.', side: 'doctor', time: 'Yesterday', important: true }],
    4: [{ text: 'I completed my sleep log this morning.', side: 'patient', time: '7:42 AM', important: true }],
    5: [{ text: 'Nice walk today, Bianca!', side: 'doctor', time: '7:25 AM', important: false }],
  })
  const current = messages[selected.id] ?? []
  const filteredMessages = notificationPreference === 'Important only' ? current.filter((message) => message.important) : notificationPreference === 'Muted' ? current.filter((message) => !message.important) : current
  const send = () => {
    if (!draft.trim()) return
    const nextMessage = { text: draft.trim(), side: 'doctor' as const, time: 'Just now', important: importantNext }
    setMessages((all) => ({ ...all, [selected.id]: [...(all[selected.id] ?? []), nextMessage] }))
    setDraft('')
    setImportantNext(false)
  }

  return <>
    <header className="patients-header"><div><p className="eyebrow">SECURE COMMUNICATION</p><h1>Messages</h1><p className="header-copy">Private conversations between you and your assigned patients.</p></div></header>
    <div className="messages-layout"><aside className="message-directory"><div className="directory-heading"><strong>Conversations</strong><span>{patients.length}</span></div><div className="directory-list">{patients.map((patient) => <button key={patient.id} className={selected.id === patient.id ? 'directory-item selected' : 'directory-item'} onClick={() => onSelect(patient.id)}><span className="avatar" style={{ background: patient.color }}>{patient.initials}</span><span><strong>{patient.name}</strong><small>{patient.id === 1 ? 'Sleep log follow-up' : patient.id === 2 ? 'Great work, John...' : patient.id === 3 ? 'Activity has been lower...' : patient.id === 4 ? 'Sleep log submitted' : 'Nice walk today!'}</small></span>{patient.id === 1 && <i className="unread-dot" />}</button>)}</div></aside>
      <section className="chat-panel"><header className="chat-header"><span className="avatar" style={{ background: selected.color }}>{selected.initials}</span><div><h2>{selected.name}</h2><p><i className="online-dot" />Active today</p></div><div className="conversation-menu-wrap"><button type="button" aria-label="Conversation settings" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>•••</button>{menuOpen && <div className="conversation-menu"><button type="button" onClick={() => { setPinned(!pinned); setConversationStatus(pinned ? 'Conversation unpinned.' : 'Conversation pinned for quick access.'); setMenuOpen(false) }}>{pinned ? 'Unpin conversation' : 'Pin conversation'}</button><label className="notification-choice">Notifications<select aria-label="Notification preference" value={notificationPreference} onChange={(event) => { const value = event.target.value; setNotificationPreference(value); setConversationStatus(value === 'Important only' ? 'Showing only important messages.' : value === 'Muted' ? 'Showing non-priority messages.' : 'Showing all messages in this conversation.') }}><option>All messages</option><option>Important only</option><option>Muted</option></select></label><button type="button" onClick={() => { setPatientInfoOpen(true); setMenuOpen(false) }}>View patient information</button></div>}</div></header>
        <div className="chat-notice">{conversationStatus}</div><div className="messages">{filteredMessages.map((message, index) => <div className={`bubble-row ${message.side}`} key={`${message.time}-${index}`}><div className={`bubble ${message.important ? 'important' : ''}`} title={message.important ? 'Important message' : undefined} tabIndex={message.important ? 0 : undefined}>{message.text}<small>{message.time}</small></div></div>)}</div><div className="message-compose"><button type="button" className={importantNext ? 'important-toggle active' : 'important-toggle'} onClick={() => setImportantNext((value) => !value)}>Important</button><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder={`Message ${selected.name.split(' ')[0]}...`} /><button type="button" onClick={send}>Send ↑</button></div>
      </section>
    </div>
    {patientInfoOpen && <div className="modal-backdrop" onMouseDown={() => setPatientInfoOpen(false)}><section className="modal contact-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>{selected.name}</h2><p>Patient contact information</p></div><button type="button" onClick={() => setPatientInfoOpen(false)}>×</button></div><dl className="confirmation-details"><div><dt>Unique ID</dt><dd>{selected.uniqueId || 'Not available'}</dd></div><div><dt>Email</dt><dd>{selected.email || 'Not available'}</dd></div><div><dt>Phone</dt><dd>{selected.phone || 'Not available'}</dd></div><div><dt>Care focus</dt><dd>{selected.care}</dd></div></dl></section></div>}
  </>
}
