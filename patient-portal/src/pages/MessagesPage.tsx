import { useEffect, useRef, useState } from 'react';
import { patientApi, type ConversationMessage, type PatientProvider } from '../lib/api';

export function MessagesPage() {
  const [providers, setProviders] = useState<PatientProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [messagesMap, setMessagesMap] = useState<Record<number, ConversationMessage[]>>({});
  const [selectedId, setSelectedId] = useState(0);
  const [mobileChatOpen, setMobileChatOpen] = useState<boolean>(false);
  const [input, setInput] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [providerQuery, setProviderQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [notificationPreference, setNotificationPreference] = useState('All messages');
  const [providerInfoOpen, setProviderInfoOpen] = useState(false);
  const [importantNext, setImportantNext] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    patientApi.getProviders()
      .then(({ providers: availableProviders }) => {
        if (!active) return;
        setProviders(availableProviders);
        setSelectedId(availableProviders[0]?.id ?? 0);
      })
      .catch((error) => { if (active) setMessageError(error instanceof Error ? error.message : 'Could not load assigned providers.'); })
      .finally(() => { if (active) setProvidersLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setMessagesLoading(true);
    setMessageError('');
    patientApi.getMessages(selectedId)
      .then(({ messages }) => { if (active) setMessagesMap((current) => ({ ...current, [selectedId]: messages })); })
      .catch((error) => { if (active) setMessageError(error instanceof Error ? error.message : 'Could not load messages.'); })
      .finally(() => { if (active) setMessagesLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setPinned(false);
    setNotificationPreference('All messages');
    patientApi.getConversationPreferences(selectedId)
      .then(({ preferences }) => {
        if (!active) return;
        setPinned(preferences.pinned);
        setNotificationPreference(preferences.notificationPreference);
      })
      .catch((error) => { if (active) setMessageError(error instanceof Error ? error.message : 'Could not load conversation preferences.'); });
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => { setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current?.scrollHeight ?? 0, behavior: 'smooth' }), 50); }, [messagesMap, selectedId, mobileChatOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setMessageError('');
    try {
      const { message } = await patientApi.sendMessage(selectedId, text, importantNext);
      setMessagesMap((current) => ({ ...current, [selectedId]: [...(current[selectedId] ?? []), message] }));
      setInput('');
      setImportantNext(false);
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const updateConversationPreferences = async (changes: { pinned?: boolean; notificationPreference?: 'All messages' | 'Important only' | 'Muted' }) => {
    try {
      const { preferences } = await patientApi.updateConversationPreferences(selectedId, changes);
      setPinned(preferences.pinned);
      setNotificationPreference(preferences.notificationPreference);
      setMessageError('');
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Could not save conversation preferences.');
    }
  };

  const convs = providers;
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

  if (providersLoading) return <section className="messages-page"><p>Loading assigned providers...</p></section>;
  if (!selectedProvider) return <section className="messages-page"><header className="section-header message-title"><div><p className="eyebrow">Messages</p><h2>Assigned Healthcare Team</h2></div></header><p className="directory-empty">{messageError || 'No providers are currently available for messaging.'}</p></section>;

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
              <div className="conversation-actions"><button className="icon-button" aria-label="Conversation options" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>•••</button>{menuOpen && <div className="conversation-menu"><button type="button" onClick={() => { void updateConversationPreferences({ pinned: !pinned }); setMenuOpen(false); }}>{pinned ? 'Unpin conversation' : 'Pin conversation'}</button><label className="notification-choice">Notifications<select aria-label="Notification preference" value={notificationPreference} onChange={event => { void updateConversationPreferences({ notificationPreference: event.target.value as 'All messages' | 'Important only' | 'Muted' }); }}><option>All messages</option><option>Important only</option><option>Muted</option></select></label><button type="button" onClick={() => { setProviderInfoOpen(true); setMenuOpen(false); }}>See Profile</button><small className="conversation-privacy">Private conversation between you and your assigned provider.</small></div>}</div>
            </div>
          </header>

          <div className="chat-thread" ref={threadRef}>
            {messagesLoading && <p className="muted">Loading messages...</p>}
            {messageError && <p className="login-error" role="alert">{messageError}</p>}
            {grouped.map((group, gi) => (
              <div key={gi} className={`message-group ${group.sender === 'doctor' || group.sender === 'nurse' ? 'left' : 'right'}`}>
                {(group.sender === 'doctor' || group.sender === 'nurse') && <div className="doctor-header"><div className="doctor-avatar small">{selectedProvider.initials}</div><div><strong>{selectedProvider.name}</strong></div></div>}
                <div className="group-items">{group.items.map((m:any) => <div key={m.id} className={`bubble-row ${m.sender}`}><div className={`bubble ${m.sender} ${m.important ? 'important' : ''}`}><p>{m.text}</p>{m.important && <small className="important-badge">Important</small>}<small className="time">{m.time}</small></div></div>)}</div>
              </div>
            ))}
          </div>

          <div className="message-compose">
            <button type="button" className={importantNext ? 'important-toggle active' : 'important-toggle'} onClick={() => setImportantNext(v => !v)}>Important</button>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Message ${selectedProvider.name.split(' ')[0]}...`} onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }} />
            <button className="primary-button" onClick={sendMessage} disabled={sending || !input.trim()}>{sending ? 'Sending...' : 'Send'}</button>
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
