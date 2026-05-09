export type TrainingStatus = 'probehlo' | 'zruseno' | 'prelozeno'

export interface Exercise {
  id: string
  name: string
  sets: string
  reps: string
  weight: string
  notes: string
  youtubeUrl: string
  completed: boolean
}

export interface TrainingSection {
  id: string
  title: string
  exercises: Exercise[]
}

export interface Training {
  date: string
  dayName: string
  focus: string
  duration: string
  startTime: string
  endTime: string
  sections: TrainingSection[]
  trainerNotes: string
  progression: string
  status?: TrainingStatus
}

export interface ClientInfo {
  name: string
  slug: string
  folder: string
  trainingCount: number
  lastTraining?: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
}
