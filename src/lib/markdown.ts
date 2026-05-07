import type { Training, TrainingSection, Exercise } from './types'

const CZECH_DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota']
const CZECH_MONTHS = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
]

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function parseTableRow(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim())
}

function isTableSeparator(line: string): boolean {
  return /^\|[-|:\s]+\|$/.test(line.trim())
}

export function getEmptyExercise(): Exercise {
  return { id: uid(), name: '', sets: '', reps: '', weight: '', notes: '', youtubeUrl: '', completed: false }
}

export function getDefaultSections(): TrainingSection[] {
  return [
    { id: uid(), title: 'Warm-up / Aktivace', exercises: [getEmptyExercise()] },
    { id: uid(), title: 'Hlavní část', exercises: [getEmptyExercise()] },
    { id: uid(), title: 'Cool-down', exercises: [getEmptyExercise()] },
  ]
}

export function parseTraining(markdown: string, dateStr: string): Training {
  const lines = markdown.split('\n')
  let focus = ''
  let duration = '60'
  let startTime = ''
  let endTime = ''
  let trainerNotes = ''
  let progression = ''
  const sections: TrainingSection[] = []

  let currentSection: TrainingSection | null = null
  let inTrainerNotes = false
  let inProgression = false
  let inTable = false
  let skipSeparator = false

  for (const line of lines) {
    if (line.startsWith('**Zaměření:**')) {
      focus = line.replace('**Zaměření:**', '').trim()
      inTrainerNotes = false; inProgression = false
      continue
    }
    if (line.startsWith('**Délka:**')) {
      duration = line.replace('**Délka:**', '').replace('min', '').trim()
      inTrainerNotes = false; inProgression = false
      continue
    }
    if (line.startsWith('**Čas:**')) {
      const timeStr = line.replace('**Čas:**', '').trim()
      const parts = timeStr.split(/\s*[–-]\s*/)
      startTime = parts[0]?.trim() || ''
      endTime = parts[1]?.trim() || ''
      inTrainerNotes = false; inProgression = false
      continue
    }

    if (line.startsWith('## ')) {
      const title = line.slice(3).trim()
      inTable = false
      if (title === 'Trenérské poznámky') {
        inTrainerNotes = true; inProgression = false; currentSection = null
      } else if (title === 'Progrese') {
        inProgression = true; inTrainerNotes = false; currentSection = null
      } else {
        inTrainerNotes = false; inProgression = false
        currentSection = { id: uid(), title, exercises: [] }
        sections.push(currentSection)
      }
      continue
    }

    if (line.startsWith('| Cvik') && currentSection) {
      inTable = true; skipSeparator = true; continue
    }
    if (skipSeparator) { skipSeparator = false; continue }

    if (inTable && line.startsWith('|') && currentSection) {
      if (isTableSeparator(line)) continue
      const cells = parseTableRow(line)
      if (cells[0]) {
        currentSection.exercises.push({
          id: uid(),
          name: cells[0] || '',
          sets: cells[1] || '',
          reps: cells[2] || '',
          weight: cells[3] || '',
          notes: cells[4] || '',
          youtubeUrl: '',
          completed: false,
        })
      }
      continue
    }
    if (!line.startsWith('|')) inTable = false

    if (inTrainerNotes && line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
      trainerNotes += (trainerNotes ? '\n' : '') + line
    }
    if (inProgression && line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
      progression += (progression ? '\n' : '') + line
    }
  }

  const date = new Date(dateStr + 'T12:00:00')
  return {
    date: dateStr,
    dayName: CZECH_DAYS[date.getDay()],
    focus,
    duration,
    startTime,
    endTime,
    sections: sections.length > 0 ? sections : getDefaultSections(),
    trainerNotes,
    progression,
  }
}

export function generateTrainingMarkdown(training: Training): string {
  const { date, focus, duration, startTime, endTime, sections, trainerNotes, progression } = training
  const d = new Date(date + 'T12:00:00')
  const czechDay = CZECH_DAYS[d.getDay()]
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()

  let md = `# Trénink — ${czechDay} ${day}. ${month}. ${year}\n\n`
  md += `**Zaměření:** ${focus}\n`
  md += `**Délka:** ${duration} min\n`
  if (startTime || endTime) md += `**Čas:** ${startTime} – ${endTime}\n`
  md += `\n---\n\n`

  for (const section of sections) {
    if (!section.title) continue
    md += `## ${section.title}\n\n`
    const validExercises = section.exercises.filter((e) => e.name.trim())
    if (validExercises.length > 0) {
      md += `| Cvik | Série | Opak. | Váha | Poznámka |\n`
      md += `|---|---|---|---|---|\n`
      for (const ex of validExercises) {
        const notes = ex.youtubeUrl
          ? `${ex.notes} [YT](${ex.youtubeUrl})`.trim()
          : ex.notes
        md += `| ${ex.name} | ${ex.sets} | ${ex.reps} | ${ex.weight} | ${notes} |\n`
      }
      md += '\n'
    }
  }

  if (trainerNotes.trim()) md += `## Trenérské poznámky\n\n${trainerNotes}\n\n`
  if (progression.trim()) md += `## Progrese\n\n${progression}\n\n`

  return md
}

export function formatCzechDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = CZECH_DAYS[d.getDay()]
  const month = CZECH_MONTHS[d.getMonth()]
  return `${day} ${d.getDate()}. ${month} ${d.getFullYear()}`
}
