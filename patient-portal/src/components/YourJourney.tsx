import React from 'react';
import { StressClassification, getNlpObservation } from '../lib/journey';

interface YourJourneyProps {
  observations: string[];
  stressClassification?: StressClassification;
  isDoctor?: boolean;
  patientName?: string;
}

export default function YourJourney({ observations, stressClassification = null, isDoctor = false, patientName = 'Patient' }: YourJourneyProps) {
  const nlpText = getNlpObservation(stressClassification, isDoctor, patientName);

  return (
    <section className="journey-card">
      <div className="section-header" style={{ marginBottom: '14px' }}>
        <div>
          <h3>🌱 Your Journey</h3>
          <p>{isDoctor ? "Personalized observations and reflections based on recent activity." : "Personalized observations and reflections based on your recent activity."}</p>
        </div>
      </div>
      <div className="journey-items">
        {observations.map((o, i) => (
          <div key={i} className="journey-item">
            <span className="journey-icon">✦</span>
            <p>{o}</p>
          </div>
        ))}
        {nlpText && (
          <div className="journey-item journey-item--nlp" style={{ borderLeft: stressClassification === 'HIGH_STRESS' ? '3px solid #e11d48' : '3px solid #0284c7', background: 'var(--bg-subtle, rgba(0,0,0,0.02))', padding: '10px 12px', borderRadius: '6px', marginTop: '8px' }}>
            <span className="journey-icon">🤖</span>
            <p style={{ margin: 0, fontWeight: 500 }}>{nlpText}</p>
          </div>
        )}
      </div>
    </section>
  );
}
