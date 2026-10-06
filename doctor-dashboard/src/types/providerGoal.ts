import type { EvaluationType, GoalFrequency } from '../../../shared/goalEvaluator'

export type ProviderGoal = {
  id: number
  patientUniqueId: string
  title: string
  category: string
  target: string
  frequency: GoalFrequency
  startDate: string
  reviewDate: string
  instructions: string
  status: 'Active' | 'Paused' | 'Completed' | 'Cancelled'
  progressPercent: number
  assignedBy: string
  evaluationType?: EvaluationType
  targetValue?: number
  targetUnit?: string
  metricKey?: string
}
