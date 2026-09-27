import { useEffect, useRef, useState } from 'react';

export function MessagesPage() {
  // Static provider roster: the prototype shows only providers assigned to the patient
  const allProviders = [
    {
      id: 101,
      name: 'Dr. Jamie Dizon',
      initials: 'JD',
      color: '#f9c6c6',
      role: 'Primary care',
      specialty: 'Lifestyle Medicine',
      clinic: 'VitalSync Clinic, Makati',
      about: 'Dr. Jamie Dizon is a Lifestyle Medicine specialist dedicated to supporting sustainable, evidence-based behavioral change. Her clinical focus is nutrition, physical activity, and sleep optimization to prevent and manage chronic conditions.',
      license: 'PRC License No. 12345 · Specialist, Lifestyle Medicine'
    },
    {
      id: 102,
      name: 'Nurse Rafael',
      initials: 'NR',
      color: '#c6e1f9',
      role: 'Nurse',
      specialty: 'Clinical Care & Monitoring',
      clinic: 'VitalSync Clinic, Makati',
      about: 'Nurse Rafael assists patients with daily health logging, medication adherence reminders, and ongoing vital sign monitoring.',
      license: 'RN License No. 67890 · Registered Nurse'
    },
    {
      id: 103,
      name: 'Dr. Ana Cruz',
      initials: 'AC',
      color: '#d6f9d6',
      role: 'Cardiology',
      specialty: 'Cardiovascular Health',
      clinic: 'VitalSync Clinic, Makati',
      about: 'Dr. Ana Cruz specializes in cardiology and heart-healthy lifestyle interventions, supporting patients through cardiac rehab and blood pressure management.',
      license: 'PRC License No. 54321 · Board-Certified Cardiologist'
    },
    {
      id: 104,
      name: 'Reception',
      initials: 'RC',
      color: '#efe3c6',
      role: 'Admin',
      specialty: 'Clinic Administration',
      clinic: 'VitalSync Clinic, Makati',
      about: 'Clinic reception and administrative support team assisting with appointments, scheduling, and portal inquiries.',
      license: 'Administrative Services Certification #301'
    }
  ];

  // For the prototype the assigned providers are a static subset (simulate assignment)
  const assignedProviderIds = [101, 102, 103];
  const convs = allProviders.filter(p => assignedProviderIds.includes(p.id));

  // messages keyed by conversation id
  const [messagesMap, setMessagesMap] = useState<Record<number, any[]>>(() => ({
    101: [ { id: 1, sender: 'doctor', text: 'Good morning — how did your sleep log go?', time: '9:02 AM', important: true }, { id: 2, sender: 'patient', text: 'Better, thank you — I did the breathing exercise.', time: '9:10 AM', important: false } ],
    102: [ { id: 10, sender: 'nurse', text: 'Don’t forget your med reminder at 6pm.', time: 'Yesterday', important: true } ],
    103: [ { id: 20, sender: 'doctor', text: 'Please book a follow-up if chest pain recurs.', time: 'Mon', important: true } ]
  }));

  const [selectedId, setSelectedId] = useState<number>(convs[0].id);
  const [mobileChatOpen, setMobileChatOpen] = useState<boolean>(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [providerQuery, setProviderQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [notificationPreference, setNotificationPreference] = useState('All messages');
  const [providerInfoOpen, setProviderInfoOpen] = useState(false);
  const [importantNext, setImportantNext] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current?.scrollHeight ?? 0, behavior: 'smooth' }), 50); }, [messagesMap, selectedId, typing, mobileChatOpen]);

  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg = { id: Date.now(), sender: 'patient', text: input.trim(), time: nowTime(), important: importantNext };
    setMessagesMap(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), msg] }));
    setInput('');
    setImportantNext(false);
    // simulate reply
    setTimeout(() => { setTyping(true); }, 400);
    setTimeout(() => { setTyping(false); const reply = { id: Date.now()+1, sender: 'doctor', text: 'Thanks — got it.', time: nowTime(), important: false }; setMessagesMap(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), reply] })); }, 1400);
  };

  const getLatestMessage = (id: number) => {
    const msgs = messagesMap[id] ?? [];
    if (msgs.length === 0) return { text: 'No messages yet', time: '' };
    const last = msgs[msgs.length - 1];
    return { text: last.text, time: last.time };
  };

  const currentMsgs = messagesMap[selectedId] ?? [];
  const visibleProviders = convs.filter(provider => provider.name.toLowerCase().includes(providerQuery.trim().toLowerCase()) || provider.role.toLowerCase().includes(providerQuery.trim().toLowerCase()));
  const selectedProvider = convs.find(provider => provider.id === selectedId) ?? convs[0];
  const filteredMsgs = notificationPreference === 'Important only' ? currentMsgs.filter(m => m.important) : notificationPreference === 'Muted' ? currentMsgs.filter(m => !m.important) : currentMsgs;
  // group consecutive messages by sender to reduce repeated headers
  const grouped: Array<{ sender: string; items: any[] }> = [];
  filteredMsgs.forEach((m:any) => { const last = grouped[grouped.length-1]; if (!last || last.sender !== m.sender) grouped.push({ sender: m.sender, items: [m] }); else last.items.push(m); });

  return (
    <section className="messages-page">
      <header className="section-header message-title"><div><p className="eyebrow">Messages</p><h2>Assigned Healthcare Team</h2><p className="header-copy">Only healthcare providers assigned by your managing doctor can communicate with you.</p></div></header>
      <div className={`messages-layout ${mobileChatOpen ? 'mobile-chat-active' : ''}`}>
          <aside className="message-directory">
          <div className="directory-heading"><strong>Assigned providers</strong><span>{convs.length}</span></div>
          <label className="directory-search"><span>⌕</span><input aria-label="Search assigned providers" type="search" placeholder="Search assigned providers" value={providerQuery} onChange={event => setProviderQuery(event.target.value)} /></label>
          <div className="directory-list">
            {visibleProviders.map(c => {
              const latest = getLatestMessage(c.id);
              return (
                <button key={c.id} className={selectedId === c.id ? 'directory-item selected' : 'directory-item'} onClick={() => { setSelectedId(c.id); setMobileChatOpen(true); }}>
                  <span className="avatar" style={{ background: c.color }}>{c.initials}</span>
                  <div className="directory-item-info">
                    <div className="directory-item-top">
                      <strong>{c.name}</strong>
                      <small className="directory-time">{latest.time}</small>
                    </div>
                    <small className="directory-role">{c.role}</small>
                    <p className="directory-preview">{latest.text}</p>
                  </div>
                  {messagesMap[c.id] && messagesMap[c.id].length > 0 && <i className="unread-dot" />}
                </button>
              );
            })}
          </div>
          {visibleProviders.length === 0 && <p className="directory-empty">No assigned providers match this search.</p>}
        </aside>

        <section className="chat-panel">
          <header className="chat-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
            {mobileChatOpen && (
              <button type="button" className="text-button mobile-back-button" onClick={() => setMobileChatOpen(false)}>
                ← Back to Messages
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <span className="avatar" style={{ background: selectedProvider.color }}>{selectedProvider.initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}><h2>{selectedProvider.name}</h2><p className="muted small">{selectedProvider.role}</p></div>
              <div className="conversation-actions"><button className="icon-button" aria-label="Conversation options" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>•••</button>{menuOpen && <div className="conversation-menu"><button type="button" onClick={() => { setPinned(value => !value); setMenuOpen(false); }}>{pinned ? 'Unpin conversation' : 'Pin conversation'}</button><label className="notification-choice">Notifications<select aria-label="Notification preference" value={notificationPreference} onChange={event => setNotificationPreference(event.target.value)}><option>All messages</option><option>Important only</option><option>Muted</option></select></label><button type="button" onClick={() => { setProviderInfoOpen(true); setMenuOpen(false); }}>See Profile</button><small className="conversation-privacy">Private conversation between you and your assigned provider.</small></div>}</div>
            </div>
          </header>

          <div className="chat-thread" ref={threadRef}>
            {grouped.map((group, gi) => (
              <div key={gi} className={`message-group ${group.sender === 'doctor' || group.sender === 'nurse' ? 'left' : 'right'}`}>
                {(group.sender === 'doctor' || group.sender === 'nurse') && <div className="doctor-header"><div className="doctor-avatar small">{selectedProvider.initials}</div><div><strong>{selectedProvider.name}</strong></div></div>}
                <div className="group-items">{group.items.map((m:any) => <div key={m.id} className={`bubble-row ${m.sender}`}><div className={`bubble ${m.sender} ${m.important ? 'important' : ''}`}><p>{m.text}</p>{m.important && <small className="important-badge">Important</small>}<small className="time">{m.time}</small></div></div>)}</div>
              </div>
            ))}
            {typing && <div className="typing-indicator"><div className="doctor-avatar small">{selectedProvider.initials}</div><div className="typing">Typing…</div></div>}
          </div>

          <div className="message-compose">
            <button type="button" className={importantNext ? 'important-toggle active' : 'important-toggle'} onClick={() => setImportantNext(v => !v)}>Important</button>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Message ${selectedProvider.name.split(' ')[0]}...`} onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }} />
            <button className="primary-button" onClick={sendMessage}>Send</button>
          </div>
        </section>
      </div>
      {providerInfoOpen && (
        <div className="modal-backdrop" onMouseDown={() => setProviderInfoOpen(false)}>
          <section className="health-modal provider-info-modal" onMouseDown={event => event.stopPropagation()} style={{ padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span className="avatar" style={{ width: '48px', height: '48px', borderRadius: '14px', background: selectedProvider.color, fontSize: '18px', display: 'grid', placeItems: 'center', fontWeight: '800' }}>
                  {selectedProvider.initials}
                </span>
                <div>
                  <h2 style={{ fontSize: '18px', margin: '0 0 2px' }}>{selectedProvider.name}</h2>
                  <p style={{ margin: '0 0 2px', fontSize: '13px', color: 'var(--primary)', fontWeight: '700' }}>{selectedProvider.specialty || selectedProvider.role}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)' }}>{selectedProvider.clinic}</p>
                </div>
              </div>
              <button className="modal-close" type="button" onClick={() => setProviderInfoOpen(false)}>×</button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', margin: '0 0 6px', fontWeight: '800' }}>About</h3>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text-ink)' }}>{selectedProvider.about}</p>
              </div>

              <div>
                <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', margin: '0 0 6px', fontWeight: '800' }}>Professional Credentials</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-ink)', fontWeight: '600' }}>{selectedProvider.license}</p>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="primary-button" onClick={() => setProviderInfoOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
