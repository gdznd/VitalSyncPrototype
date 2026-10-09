import { useEffect, useState } from 'react';
import { patientApi, type PatientLog, type PersonalGoalDto, type ProviderGoal } from '../lib/api';
import { evaluateGoal, GoalFrequency } from '../../../shared/goalEvaluator';

type PersonalGoal = PersonalGoalDto;

const goalTemplates = [
  { id: 'eat-veg', title: 'Eat more vegetables', category: 'Nutrition', target: '5 servings', frequency: 'Daily' as GoalFrequency },
  { id: 'drink-water', title: 'Drink more water', category: 'Nutrition', target: '8 glasses', frequency: 'Daily' as GoalFrequency },
  { id: 'walk-every-day', title: 'Walk every day', category: 'Physical Activity', target: '30 minutes', frequency: 'Daily' as GoalFrequency },
  { id: 'improve-sleep', title: 'Improve sleep schedule', category: 'Sleep', target: '7 hours', frequency: 'Daily' as GoalFrequency },
  { id: 'stress-management', title: 'Practice stress management', category: 'Stress', target: '10 minutes', frequency: 'Daily' as GoalFrequency },
  { id: 'social-time', title: 'Spend quality time', category: 'Social Connectedness', target: '3 times', frequency: 'Weekly' as GoalFrequency },
  { id: 'custom', title: 'Build My Own Goal', category: 'Other', target: '', frequency: 'Daily' as GoalFrequency },
];

export function GoalsPage() {
  const [providerGoals, setProviderGoals] = useState<ProviderGoal[]>([]);
  const [logs, setLogs] = useState<PatientLog[]>([]);
  const [personalGoals, setPersonalGoals] = useState<PersonalGoal[]>([]);
  const [providerGoalsLoading, setProviderGoalsLoading] = useState(true);
  const [personalGoalsLoading, setPersonalGoalsLoading] = useState(true);
  const [providerGoalsError, setProviderGoalsError] = useState('');
  const [personalGoalsError, setPersonalGoalsError] = useState('');

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof goalTemplates[number] | null>(null);
  const [editingGoal, setEditingGoal] = useState<PersonalGoal | null>(null);
  const [detailsGoal, setDetailsGoal] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([patientApi.getProviderGoals(), patientApi.getLogs()])
      .then(([providerResponse, logResponse]) => {
        if (!active) return;
        setProviderGoals(providerResponse.goals);
        setLogs(logResponse.logs);
      })
      .catch((error) => {
        if (active) setProviderGoalsError(error instanceof Error ? error.message : 'Could not load goals.');
      })
      .finally(() => { if (active) setProviderGoalsLoading(false); });
    patientApi.getPersonalGoals()
      .then(({ goals }) => { if (active) setPersonalGoals(goals); })
      .catch((error) => { if (active) setPersonalGoalsError(error instanceof Error ? error.message : 'Could not load personal goals.'); })
      .finally(() => { if (active) setPersonalGoalsLoading(false); });
    return () => { active = false; };
  }, []);

  const activeProviderGoals = providerGoals.filter((pg) => pg.status !== 'Cancelled');

  const activePersonalGoals = personalGoals.filter(
    (g) => g.status !== 'Cancelled'
  );

  const handleSavePersonalGoal = async (goalData: PersonalGoal) => {
    setPersonalGoalsError('');
    try {
      const response = editingGoal
        ? await patientApi.updatePersonalGoal(editingGoal.id, goalData)
        : await patientApi.createPersonalGoal(goalData);
      setPersonalGoals((current) => editingGoal
        ? current.map((goal) => goal.id === response.goal.id ? response.goal : goal)
        : [response.goal, ...current]);
      setSelectedTemplate(null);
      setEditingGoal(null);
    } catch (error) {
      setPersonalGoalsError(error instanceof Error ? error.message : 'Could not save your personal goal.');
    }
  };

  const cancelPersonalGoal = async (id: number) => {
    try {
      const { goal } = await patientApi.updatePersonalGoal(id, { status: 'Cancelled' });
      setPersonalGoals((current) => current.map((item) => item.id === id ? goal : item));
    } catch (error) {
      setPersonalGoalsError(error instanceof Error ? error.message : 'Could not cancel your personal goal.');
    }
  };

  const updatePersonalGoalStatus = async (id: number, status: PersonalGoal['status']) => {
    try {
      const { goal } = await patientApi.updatePersonalGoal(id, { status });
      setPersonalGoals((current) => current.map((item) => item.id === id ? goal : item));
    } catch (error) {
      setPersonalGoalsError(error instanceof Error ? error.message : 'Could not update your personal goal.');
    }
  };

  return (
    <section className="goals-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Goals</p>
          <h2>Wellness Targets & Personal Goals</h2>
          <p>Track targets assigned by your care team alongside goals you set for yourself.</p>
        </div>
      </div>

      {/* Section 1: Provider-Assigned Goals */}
      <div className="goal-section-heading">
        <div className="goal-heading-icon provider-icon">✦</div>
        <div>
          <h3>Assigned Wellness Targets</h3>
          <p>Goals assigned by your clinical care team to guide your lifestyle monitoring plan.</p>
        </div>
      </div>

      {providerGoalsError && <p className="login-error" role="alert">{providerGoalsError}</p>}
      {providerGoalsLoading ? (
        <div className="goals-empty"><p>Loading assigned goals...</p></div>
      ) : activeProviderGoals.length === 0 ? (
        <div className="goals-empty">
          <div className="select-icon">✦</div>
          <p style={{ fontWeight: 700, color: 'var(--text-ink)', fontSize: '14px', margin: '0 0 4px' }}>No assigned goals yet.</p>
          <p style={{ margin: 0 }}>Your healthcare provider will assign wellness goals as part of your monitoring plan.</p>
        </div>
      ) : (
        <div className="goals-grid">
          {activeProviderGoals.map((pg) => {
            const evaluation = evaluateGoal({ ...pg, targetValue: pg.targetValue ?? undefined }, logs);
            return (
              <div key={pg.id} className="goal-card provider">
                <div className="goal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p className="goal-title">{pg.title}</p>
                    <span className="badge category">{pg.category} · {pg.status}</span>
                  </div>
                  <button type="button" className="details-button" onClick={() => setDetailsGoal({ ...pg, type: 'provider', evaluation })}>Details →</button>
                </div>
                <div className="goal-meta-row" style={{ marginTop: '6px' }}>
                  <span><strong>Target:</strong> {pg.target || 'Not specified'}</span>
                  <span><strong>Frequency:</strong> {pg.frequency}</span>
                </div>
                <div className="goal-footer-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', alignItems: 'center' }}>
                  {evaluation.evaluable ? <><div className="progress-bar-bg" style={{ marginTop: '6px', flex: 1 }}><div className="progress-bar-fill" style={{ width: `${evaluation.percentage}%` }} /></div><span>{evaluation.progressText}</span></> : <span>Progress not automatically evaluated</span>}
                  <small className="assigned">Assigned by {pg.assignedBy}</small>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section 2: Personal Wellness Goals */}
      <div className="goal-section-heading personal-heading">
        <div className="goal-heading-icon personal-icon">🌱</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3>Personal Wellness Goals</h3>
            <button className="secondary-button" onClick={() => { setEditingGoal(null); setTemplateModalOpen(true); }} style={{ padding: '6px 12px', fontSize: '11px' }}>+ Create Personal Goal</button>
          </div>
          <p>Goals you've created for yourself. These are private and managed solely by you.</p>
        </div>
      </div>

      {activePersonalGoals.length === 0 ? (
        <div className="goals-empty personal-empty">
          <div className="select-icon">🌱</div>
          {personalGoalsLoading ? <p>Loading your personal goals...</p> : <p style={{ fontWeight: 700, color: 'var(--text-ink)', fontSize: '14px', margin: '0 0 4px' }}>No personal goals yet.</p>}
          <p style={{ margin: '0 0 10px' }}>Create a personal lifestyle goal to keep yourself motivated and on track.</p>
          <button className="primary-button" onClick={() => { setEditingGoal(null); setTemplateModalOpen(true); }}>+ Create Personal Goal</button>
        </div>
      ) : (
        <div className="goals-grid">
          {activePersonalGoals.map((g) => (
            <div key={g.id} className="goal-card personal">
              <div className="goal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <p className="goal-title">{g.title}</p>
                  <span className="badge category">{g.category} · {g.status}</span>
                </div>
                <button type="button" className="details-button" onClick={() => setDetailsGoal({ ...g, type: 'personal' })}>Details →</button>
              </div>
              <div className="goal-meta-row" style={{ marginTop: '6px' }}>
                <span><strong>Target:</strong> {g.target || 'Not specified'}</span>
                <span><strong>Frequency:</strong> {g.frequency}</span>
              </div>
              <div className="progress-bar-bg" style={{ marginTop: '6px' }}>
                <div className="progress-bar-fill" style={{ width: `${g.progressPercent}%` }} />
              </div>
              <div className="goal-footer-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', alignItems: 'center' }}>
                <span>{g.progressPercent}% complete</span>
                <div className="goal-actions" style={{ marginTop: 0 }}>
                  <button className="text-button" onClick={() => { setEditingGoal(g); setSelectedTemplate({ id: 'custom', title: g.title, category: g.category, target: g.target, frequency: g.frequency }); }}>Edit</button>
                  <button className="text-button" onClick={() => updatePersonalGoalStatus(g.id, g.status === 'Active' ? 'Paused' : 'Active')}>{g.status === 'Active' ? 'Pause' : 'Resume'}</button>
                  <button className="text-button" style={{ color: '#b76359' }} onClick={() => cancelPersonalGoal(g.id)}>Cancel</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {personalGoalsError && <p className="login-error" role="alert">{personalGoalsError}</p>}

      {templateModalOpen && (
        <GoalTemplateModal
          onClose={() => setTemplateModalOpen(false)}
          onSelect={(template) => {
            setTemplateModalOpen(false);
            setSelectedTemplate(template);
          }}
        />
      )}

      {(selectedTemplate || editingGoal) && (
        <GoalConfigurationModal
          template={selectedTemplate}
          goal={editingGoal}
          onClose={() => { setSelectedTemplate(null); setEditingGoal(null); }}
          onSave={handleSavePersonalGoal}
        />
      )}

      {detailsGoal && (
        <GoalDetailsModal
          goal={detailsGoal}
          onClose={() => setDetailsGoal(null)}
        />
      )}
    </section>
  );
}

function GoalTemplateModal({ onClose, onSelect }: { onClose: () => void; onSelect: (template: typeof goalTemplates[number]) => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="health-modal goal-template-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Personal Wellness</p>
            <h2>Choose a goal template</h2>
            <p className="goal-template-subtitle">Start with a focused lifestyle goal for yourself.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="templates-grid">
          {goalTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`template-card ${template.id === 'custom' ? 'custom-template' : ''}`}
              onClick={() => onSelect(template)}
            >
              <div className="tpl-icon">
                {template.id === 'eat-veg' ? '🥗' : template.id === 'drink-water' ? '💧' : template.id === 'walk-every-day' ? '🚶' : template.id === 'improve-sleep' ? '😴' : template.id === 'stress-management' ? '🧘' : template.id === 'social-time' ? '🤝' : '✦'}
              </div>
              <div className="template-copy">
                <strong>{template.title}</strong>
                <small>{template.category} · {template.frequency}</small>
              </div>
              <span className="template-arrow">›</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function GoalConfigurationModal({ template, goal, onClose, onSave }: { template: typeof goalTemplates[number] | null; goal: PersonalGoal | null; onClose: () => void; onSave: (goal: PersonalGoal) => void }) {
  const [title, setTitle] = useState(goal?.title ?? template?.title ?? '');
  const [category, setCategory] = useState(goal?.category ?? template?.category ?? 'Other');
  const [target, setTarget] = useState(goal?.target ?? template?.target ?? '');
  const [frequency, setFrequency] = useState<GoalFrequency>(goal?.frequency ?? template?.frequency ?? 'Daily');
  const [startDate, setStartDate] = useState(goal?.startDate ?? new Date().toISOString().slice(0, 10));
  const [reviewDate, setReviewDate] = useState(goal?.reviewDate ?? '');
  const [instructions, setInstructions] = useState(goal?.instructions ?? '');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({
      id: goal?.id ?? Date.now(),
      title,
      category,
      target,
      frequency,
      startDate,
      reviewDate,
      instructions,
      status: goal?.status ?? 'Active',
      progressPercent: goal?.progressPercent ?? 0
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="health-modal goal-template-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Personal Wellness</p>
            <h2>{goal ? 'Edit Personal Goal' : 'Configure Personal Goal'}</h2>
            <p className="goal-template-subtitle">Set your targets and timeline for self-guided wellness.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="log-form">
          <label>Goal Title
            <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Morning stretching" />
          </label>
          <label>Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Nutrition</option>
              <option>Physical Activity</option>
              <option>Sleep</option>
              <option>Stress</option>
              <option>Social Connectedness</option>
              <option>Medication</option>
              <option>Other</option>
            </select>
          </label>
          <div className="field-grid">
            <label>Target
              <input required value={target} onChange={(event) => setTarget(event.target.value)} placeholder="e.g. 8 glasses/day" />
            </label>
            <label>Frequency
              <select value={frequency} onChange={(event) => setFrequency(event.target.value as GoalFrequency)}>
                <option>Daily</option>
                <option>Weekdays</option>
                <option>Weekly</option>
              </select>
            </label>
          </div>
          <div className="field-grid">
            <label>Start date
              <input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>Review date
              <input required type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} />
            </label>
          </div>
          <label className="full-width">Notes / Motivations
            <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Why is this goal important to you?" />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">{goal ? 'Save changes' : 'Create Personal Goal'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function GoalDetailsModal({ goal, onClose }: { goal: any; onClose: () => void }) {
  if (!goal) return null;
  const evaluation = goal.evaluation;
  const progressStr = evaluation
    ? evaluation.evaluable ? `${evaluation.progressText} (${evaluation.percentage}% complete)` : 'Progress not automatically evaluated'
    : `${goal.progressPercent}% complete`;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="health-modal goal-template-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{goal.type === 'provider' ? 'Assigned Wellness Target' : 'Personal Wellness Goal'}</p>
            <h2>{goal.title}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="log-form" style={{ gap: '14px' }}>
          <div className="field-grid">
            <div className="profile-value-field"><span>Category</span><strong>{goal.category}</strong></div>
            <div className="profile-value-field"><span>Status</span><strong>{goal.status}</strong></div>
          </div>
          <div className="field-grid">
            <div className="profile-value-field"><span>Target</span><strong>{goal.target || 'Not specified'}</strong></div>
            <div className="profile-value-field"><span>Frequency</span><strong>{goal.frequency}</strong></div>
          </div>
          <div className="field-grid">
            <div className="profile-value-field"><span>Start Date</span><strong>{goal.startDate}</strong></div>
            <div className="profile-value-field"><span>Review Date</span><strong>{goal.reviewDate || 'Not specified'}</strong></div>
          </div>
          {goal.assignedBy && (
            <div className="profile-value-field"><span>Assigned By</span><strong>{goal.assignedBy}</strong></div>
          )}
          {goal.instructions && (
            <div className="profile-value-field"><span>Description & Instructions</span><strong>{goal.instructions}</strong></div>
          )}
          <div className="profile-value-field"><span>Progress</span><strong>{progressStr}</strong></div>
          <div className="modal-actions" style={{ marginTop: '10px' }}>
            <button type="button" className="secondary-button" onClick={onClose} style={{ width: '100%' }}>Close Details</button>
          </div>
        </div>
      </section>
    </div>
  );
}
