# VitalSync Software Architecture

This document serves as the permanent project handbook for future AI sessions and developers, outlining the architectural state, design principles, and technical debt of the VitalSync repository.

## Architectural Philosophy

The two VitalSync applications intentionally follow different architectural patterns.

The Doctor Dashboard is workflow-centric, coordinating complex clinician interactions around a selected patient.

The Patient Portal is route-centric, coordinating navigation between independent patient pages.

Future refactoring should preserve these architectural differences rather than forcing both applications into identical structures.

# Project Status

- Current iteration: Iteration 5 (Iteration 4 + S4 implementation)
- Feature Freeze Status: ACTIVE
- Prototype Completion Status: Core prototype substantially implemented; remaining approved feature gaps and backend/testing work are tracked in the Feature Contract Matrix.
- Current Development Phase: Approved-feature verification and architecture stabilization, followed by frontend refactoring in preparation for backend integration.

## Current Objectives

The project has entered Feature Freeze following stakeholder consultation and adviser approval.

Current priorities are:

1. Complete remaining UI polish.
2. Refactor the frontend architecture.
3. Prepare the project for backend integration.
4. Preserve all approved workflows.

No new features should be introduced without stakeholder approval.

# Repository Structure

- `doctor-dashboard/`: React application for clinicians. Centralized logic, uses extensive mock data.
- `patient-portal/`: React PWA for patients. Page-based structure, uses `react-router-dom`.
- Root directory: Contains top-level configuration.

Both applications are intentionally separated because they serve different user roles while sharing the same clinical workflow.

# Doctor Dashboard

- Navigation: Side navigation (`<aside>`), context-aware (`mode-nav`) based on whether a patient is selected.
- Component hierarchy: `App.tsx` acts as the root provider and orchestrator for all views.
- Major workflows: Patient registration, patient overview/workspace, message management, longitudinal history viewing.
- State management: Local React `useState` in `App.tsx`.
- Mock data: `initialPatients`, `doctors`, `activities`, and `monitoringHistory` (in `App.tsx`).
- Current implementation status: Highly functional, but logic is tightly coupled in `App.tsx`.

# Patient Portal

- Navigation: Uses `react-router-dom` for route management (LoginPage, HomePage, SummaryPage, etc.).
- Component hierarchy: `App.tsx` -> `BrowserRouter` -> `AppShell` -> Page components.
- Major workflows: Daily health logging (food, meds, activity, sleep), lifestyle reflections (stress, social, habits).
- State management: Local React `useState` and persistent storage via `src/lib/storage.ts`.
- Mock data: Driven by `lib/storage.ts` and component-local state.
- Current implementation status: Functional, mobile-first PWA, uses PWA plugins.

## Structured Lifestyle Logging and Provider Goal Evaluation MVP (PLogs1)

Patient lifestyle logs utilize structured fields where applicable:
- **Food:** Food items and structured food/hydration indicators.
- **Medication:** Medicine name and dosage.
- **Physical Activity:** Duration/time (rather than requiring calorie-burn estimates).
- **Sleep:** Duration/time.
- **Lifestyle reflections:** Optional entries by default that may become required monitoring tasks when assigned by a doctor.

### Provider Goal Evaluation MVP Rules
Provider-assigned goals may use automated progress and target-attainment evaluation when corresponding structured patient log data is available:
- **MVP Evaluation Types:**
  - Nutrition/Food → structured indicator
  - Physical Activity → duration
  - Sleep → duration
  - Medication → qualifying medication occurrence
  - Stress/Social/Habit → assigned reflection submission
  - Custom/unsupported goals → no automatic evaluation
- **Frequency Evaluation Rules:**
  - Daily goals evaluate expected days on which the target is met.
  - Weekdays goals evaluate Monday–Friday expected days.
  - Weekly goals evaluate against the applicable weekly aggregate target.
- **Progress Expression:** Expressed as measurable target attainment (e.g., 5/7 days and 71%).
- **Clinical Boundary:** The system must not determine clinical success or failure. Clinical interpretation remains solely with the doctor.
- **Source Data:** Automated evaluation uses the patient's structured lifestyle logs as the source data. The Doctor Dashboard mock summary-log store is not the source of truth for goal evaluation.

### Architectural Separation
To maintain a clean and maintainable architecture, strict separation is enforced between:
1. **Structured log persistence/storage** (e.g., `storage.ts` / persistence layer).
2. **Goal evaluation/business logic** (calculating progress and target attainment).
3. **UI presentation** (rendering the views and progress indicators).

Goal-evaluation business logic must not be placed inside individual logging UI components or within the storage layer.

## Patient Portal Root Architecture (`patient-portal/src/App.tsx`)

The Patient Portal follows a layered architecture where `App.tsx` serves as the application entry point rather than a business logic container.

Its primary responsibilities are:

- Initializing the React application.
- Configuring global routing.
- Managing application authentication state.
- Protecting authenticated routes.
- Mounting the application shell (`AppShell`).

`App.tsx` intentionally delegates page rendering and business logic to lower architectural layers.

It should never contain:

- Lifestyle logging logic.
- Storage or persistence logic.
- API interactions.
- Page-specific state.
- Component styling.

Unlike the Doctor Dashboard, `patient-portal/src/App.tsx` already demonstrates strong separation of concerns and requires minimal architectural refactoring.

Future backend integration should preserve these responsibility boundaries. Authentication services may replace the prototype authentication state, but routing and application composition should remain the responsibility of `App.tsx`.

## Architectural Responsibility

The Patient Portal intentionally follows a route-centric architecture.

Each layer has a single responsibility:

- `App.tsx` manages application routing and authentication.
- `AppShell.tsx` manages the persistent application layout and navigation.
- Individual pages implement patient workflows.
- `storage.ts` abstracts local persistence during the prototype phase.

Future refactoring should preserve this separation rather than moving responsibilities upward into `App.tsx`.

## Patient Portal Application Shell (`patient-portal/src/AppShell.tsx`)

`AppShell.tsx` defines the persistent user interface shared across the Patient Portal.

Its responsibilities are:

- Providing the application frame.
- Displaying the VitalSync patient branding.
- Rendering the persistent top bar.
- Managing primary navigation.
- Rendering page content through React Router's `<Outlet />`.

The application shell intentionally contains no business logic.

Patient workflows are delegated to individual pages rendered inside the shell.

### Architectural Layers

The Patient Portal follows a three-layer architecture:

Application (`App.tsx`)

↓

Application Shell (`AppShell.tsx`)

↓

Feature Pages

Each layer owns a single responsibility.

This separation should be preserved throughout future refactoring and backend integration.

## Patient Portal Storage Layer (`patient-portal/src/lib/storage.ts`)

The Patient Portal uses a lightweight storage abstraction to isolate application pages from the underlying persistence mechanism.

Current persistence is implemented using the browser's `localStorage`.

The storage layer currently provides operations for:

- Lifestyle Logs
- Goals

Responsibilities include:

- Reading persisted data.
- Writing persisted data.
- Clearing persisted data.
- Handling serialization and deserialization.
- Handling storage errors.

The storage layer intentionally contains no user interface, routing, or business logic.

### Architectural Role

The storage layer serves as a persistence adapter rather than a backend.

Current architecture:

Patient Pages

↓

Storage Layer (`storage.ts`)

↓

Browser `localStorage`

During backend integration, only the persistence implementation should change.

The storage interface should remain stable so that patient pages require minimal modification.

# Shared Workflows

Current shared workflows include:

- Patient Creation
- Patient Reactivation
- Daily Lifestyle Logging
- Goal Monitoring
- Follow-up Scheduling
- Longitudinal Monitoring
- Secure Messaging
- Lifestyle Progress Review

# Architectural Decisions

## Workflow-First Design

VitalSync is designed around the workflow of a Lifestyle Medicine clinic rather than around individual software features.

The software should always support the clinical workflow first.

---

## Clinic Context

Clinic-wide functions are available before a patient is selected.

Current clinic modules:

- Patient Registry
- Team

These modules operate independently of any individual patient.

---

## Patient Workspace

Selecting a patient transitions the dashboard into Patient Workspace.

The workspace contains:

- Overview
- Messages
- Goals
- History

All patient-specific monitoring occurs within this context.

---

## Goal Ownership and Authority

VitalSync has two distinct goal concepts:

### Provider-assigned goals

- Assigned by the doctor to the patient as part of the monitoring plan.
- The doctor controls the goal definition, target, frequency, dates, instructions, and status.
- The patient can view and track progress via automated evaluation against structured lifestyle logs (expressed as measurable target attainment) but cannot modify the provider-assigned goal definition or status.

### Personal Wellness Goals

- Created and managed by the patient for themselves.
- Personal Wellness Goals are separate from provider-assigned goals.
- Doctors cannot see Personal Wellness Goals.
- The patient may cancel a Personal Wellness Goal at any time.

The two goal types must remain separate in the data model and UI. The Feature Contract Matrix is the source of truth for their required behavior.

---

## Patient Lifecycle

Patients follow the lifecycle:

Create Patient

↓

Monitor

↓

Archive

↓

Reactivate

Patients are archived rather than deleted to preserve longitudinal monitoring history.

### Monitoring Status vs. Account Access

Patient monitoring status and patient account access are separate concepts.

- **Active monitoring:** the patient is under active clinical lifestyle monitoring and receives the full provider-connected workflow.
- **Inactive monitoring:** the patient's clinical monitoring episode has ended, but the patient's VitalSync account remains accessible.
- Inactive patients may continue using the Patient Portal for personal lifestyle self-management, including lifestyle logging, personal history, personal progress, and Personal Wellness Goals.
- Provider-controlled monitoring functions are suspended while inactive.
- Provider-assigned goals are no longer active monitoring tasks while inactive; the patient-facing Goals area should communicate the completion/transition state.
- Inactive patient messaging is limited to the patient's previous/established doctor conversation.
- Reactivation restores the active monitoring relationship and its provider-controlled functionality.

This distinction must be preserved during frontend refactoring and backend integration.

---

## Visibility Model

Patients may be shared using:

- Assigned Only
- Selected Doctors
- All Doctors

This visibility model is considered a core architectural decision.

---

## Progressive Web App

The patient application is implemented as a Progressive Web App (PWA).

Native Android and iOS applications were intentionally removed from scope in favor of a single maintainable platform.

---

## Feature Freeze

The prototype is currently under Feature Freeze.

Future work should focus on:

- UI improvements
- Refactoring
- Backend implementation

Feature additions require stakeholder approval.

# Design Principles

- Workflow before technology.
- Longitudinal monitoring over isolated consultations.
- Doctor workflow drives the dashboard.
- Patient workflow remains simple.
- Mock data should mimic future backend behavior.
- Refactoring must preserve workflows.

# Current Technical Debt

The current architecture is functionally correct but contains several areas requiring refactoring.

## Monolithic App.tsx

The largest source of technical debt is:

doctor-dashboard/src/App.tsx

This file currently owns multiple responsibilities including:

- Domain Model
- Mock Database
- Business Logic
- Navigation Controller
- Workflow Controller
- Modal Controller
- Patient Registry
- Patient Workspace
- Messaging
- Monitoring History
- Shared UI

These responsibilities should be separated into dedicated modules while preserving current behavior.

---

## Tight Coupling

Most application state is managed directly inside App.tsx.

Future refactoring should separate:

- State
- Business logic
- Presentation

---

## Mock Data

Both applications currently rely on mock data.

During backend implementation these should become service calls rather than local state.

---

## Duplicate Logic

Some UI concepts exist independently between the Doctor Dashboard and Patient Portal.

This duplication is intentional because both applications serve different user roles.

Shared UI components may be extracted where appropriate without merging application workflows.

# Refactor Readiness Report

## Overall Assessment

The existing architecture is workflow-driven and functionally stable.

The goal of the refactor is not to redesign the application.

The goal is to make the existing architecture explicit through better file organization.

---

## Current Architectural Layers

App.tsx currently contains:

- Domain Layer
- Mock Database
- Business Logic
- Navigation
- Workflow Management
- Modal Management
- Registry
- Patient Workspace
- Messaging
- Monitoring History
- Shared Components

These layers should become independent modules.

---

## Recommended Folder Structure

doctor-dashboard/src/

components/
    common/
    modals/
    patient/
    messaging/

views/
    Registry/
    Workspace/
    Team/

services/
    patientService.ts
    activityService.ts

types/
    patient.ts
    doctor.ts
    activity.ts

utils/
    followUpPriority.ts

hooks/
    usePatientRegistry.ts
    useWorkspace.ts

---

## Refactor Principles

The refactor must preserve all existing workflows.

No functionality should change.

No UI behavior should change.

No architectural decisions should be reversed.

The objective is maintainability rather than new functionality.

---

## Recommended Refactor Order

1. Centralize Types
2. Extract Utilities
3. Extract Shared Components
4. Extract Views
5. Create Services
6. Introduce Custom Hooks
7. Replace Mock Data with Backend Services

# Core Architectural Concepts

## Vision

VitalSync is a software implementation of a Lifestyle Medicine clinical workflow.

The software is designed around how clinicians manage longitudinal lifestyle monitoring rather than around isolated software features.

---

## Doctor Workflow

Patient Registry

↓

Select Patient

↓

Patient Workspace

↓

Overview

↓

Messages

↓

Goals

↓

History

↓

Archive or Continue Monitoring

---

## Patient Workflow

Login

↓

Home

↓

Daily Lifestyle Logging

↓

Summary

↓

Goals

↓

Messages

↓

Profile

---

## Monitoring Philosophy

Monitoring occurs over time rather than during isolated consultations.

Patient history represents longitudinal monitoring episodes instead of disconnected log entries.

---

## Design Principles

The following principles should always be preserved:

- Workflow before technology.
- Doctor workflow drives the dashboard.
- Patient workflow remains simple.
- Longitudinal history is never deleted.
- Visibility permissions remain doctor-controlled.
- Provider-assigned goals remain doctor-controlled (with automated progress evaluation against structured lifestyle logs).
- Personal Wellness Goals remain patient-owned and invisible to doctors.
- Patient Portal remains a Progressive Web App.
- Feature Freeze is respected.
- Inactive monitoring does not deactivate the patient's VitalSync account.
- Personal self-management remains available while clinical monitoring is inactive.

# Backend Integration Principles

Backend integration must preserve the existing workflow architecture.

The backend should replace only the persistence layer.

The following architectural layers should remain unchanged:

- Doctor Dashboard workflow
- Patient Portal routing
- Patient Portal application shell
- Patient workflows
- Visibility model
- Patient lifecycle

The backend should provide data to the existing architecture rather than requiring architectural redesign.

# Backend Readiness

- Frontend is ready for backend integration by modularizing data fetching into interfaces.
- Remaining: API contracts, authentication/authorization service (OAuth/JWT), database schemas.
Backend integration should replace the data layer only.

Existing UI workflows should remain unchanged.

# Future Folder Structure

```
/
├── shared/ (Types, Utils)
├── doctor-dashboard/
│   ├── src/
│   │   ├── components/
│   │   ├── services/ (API calls)
│   │   └── views/
├── patient-portal/
│   ├── src/
│   │   ├── components/
│   │   ├── services/ (API calls)
│   │   └── pages/
```

# Documentation Authority

The **Feature Contract Matrix is the authoritative feature contract** for required product features and behavior.

Derived project documents must remain consistent with it. If a discrepancy is found between the Matrix and another document, do not silently choose one, remove a feature, or redefine behavior. Flag the discrepancy and resolve it against the Feature Contract Matrix and explicit stakeholder/adviser decisions before implementation.

Approved functionality that is missing or was incorrectly removed is a correction to the implementation, not a new feature addition.

---

# AI Instructions

Before making any architectural changes:

1. Read this document completely.

2. Preserve the Feature Freeze.

3. Preserve all approved clinical workflows.

4. Do not introduce duplicate implementations.

5. Treat the Doctor Dashboard and Patient Portal as separate applications with different responsibilities.

6. Do not replace the Progressive Web App with native mobile applications.

7. Preserve the patient lifecycle:

Create → Monitor → Archive → Reactivate

8. Preserve the Clinic Context and Patient Workspace architecture.

9. Refactoring should improve maintainability without changing behavior.

10. Backend integration should replace mock data through service layers rather than modifying UI workflows.

11. Preserve both provider-assigned goals and Personal Wellness Goals as distinct workflows with their documented ownership and visibility rules.

# Future Features (Outside Feature Freeze)

The following features are intentionally outside the current MVP:

- Machine Learning (SVM)
- Offline Synchronization
- Advanced Analytics
- Compliance Dashboard

These features remain future work and should not be introduced during the current development phase.

# Executive Summary

VitalSync is a software implementation of a Lifestyle Medicine clinical workflow.

Rather than focusing on isolated software features, the system is organized around how clinicians monitor patients over time through lifestyle interventions.

The clinician dashboard supports patient management and longitudinal monitoring, while the patient portal enables structured lifestyle reporting through a Progressive Web App.

The current prototype has reached Feature Freeze and future development is focused on architectural refactoring and backend integration.
