Implement the VitalSync backend according to BACKEND.md.
Treat VitalSync - FeatureContractMatrix_REVISED_v2.xlsx as the feature source of truth, with WORKFLOW.md and ARCHITECTURE.md as supporting specifications.
Build only the interview-ready MVP backend defined in BACKEND.md. Do not add unapproved features or production-scale infrastructure.
Before implementing any unresolved decision marked “Decision needed,” flag it to us rather than inventing a requirement.
The backend must provide authenticated role isolation, persistent shared data between Doctor Dashboard and Patient Portal, server-enforced patient visibility, lifestyle logs, provider/personal goal separation, messaging, follow-ups, archive/reactivation, and the required API/service layer described in BACKEND.md.
Keep the existing frontend workflows intact and coordinate API/data contracts with the frontend team.
Start by setting up the backend foundation and data model, then implement the MVP endpoints incrementally. Verify each major stage before moving on.