import React from 'react';

interface YourJourneyProps {
  observations: string[];
  isDoctor?: boolean;
  patientName?: string;
}

export default function YourJourney({ observations, isDoctor = false }: YourJourneyProps) {
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
      </div>
    </section>
  );
}
