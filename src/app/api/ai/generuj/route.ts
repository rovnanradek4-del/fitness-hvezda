import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getClientBySlug, getClientProfile, getRecentTrainings } from '@/lib/obsidian'
import { getDefaultSections } from '@/lib/markdown'

function volumeGuide(durationMin: number): string {
  if (durationMin >= 120) return '5–6 sekcí, 25–30 cviků celkem'
  if (durationMin >= 90)  return '5 sekcí, 20–25 cviků celkem'
  if (durationMin >= 60)  return '4 sekce, 15–20 cviků celkem'
  return '3 sekce, 12–15 cviků celkem'
}

export async function POST(request: Request) {
  const { clientSlug, trainingDate, customPrompt, duration } = await request.json()

  const client = await getClientBySlug(clientSlug)
  if (!client) return Response.json({ error: 'Klient nenalezen' }, { status: 404 })

  const [profileContent, recentTrainings] = await Promise.all([
    getClientProfile(client.folder),
    getRecentTrainings(client.folder, 3),
  ])

  const systemPrompt = `Jsi profesionální osobní trenér. Generuješ tréninkové plány ve strukturovaném formátu JSON.
Vždy odpovídej pouze validním JSON objektem, bez dalšího textu nebo markdown fences.
Trénink musí respektovat zdravotní omezení klienta a navazovat logicky na předchozí tréninky.
Názvy cviků piš PRIMÁRNĚ V ANGLIČTINĚ (např. "Barbell Back Squat", "Push-up", "Romanian Deadlift").
Poznámky a ostatní texty (trainerNotes, progression, focus) piš vždy v češtině.`

  const durationMin = parseInt(String(duration || '60'), 10) || 60
  const guide = volumeGuide(durationMin)

  const userPrompt = `Klient: ${client.name}

PROFIL KLIENTA:
${profileContent}

POSLEDNÍ TRÉNINKY:
${recentTrainings.join('\n\n---\n\n') || 'Žádné předchozí tréninky'}

Datum nového tréninku: ${trainingDate}
Délka tréninku: ${durationMin} minut
POVINNÝ OBJEM: ${guide} — MUSÍŠ vygenerovat přesně tolik sekcí a cviků, jinak je trénink neplatný.
${customPrompt ? `Speciální požadavky: ${customPrompt}` : ''}

Vygeneruj kompletní tréninkový plán jako JSON v tomto přesném formátu:
{
  "focus": "stručný popis zaměření tréninku",
  "duration": "délka v minutách jako string",
  "sections": [
    {
      "title": "název sekce",
      "exercises": [
        {
          "name": "název cviku",
          "sets": "počet sérií",
          "reps": "počet opakování nebo čas",
          "weight": "váha nebo 'vlastní váha'",
          "notes": "stručná poznámka pro klienta"
        }
      ]
    }
  ],
  "trainerNotes": "delší trenérská poznámka pro klienta",
  "progression": "co trénovat příště a jak navázat"
}`

  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-5'),
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxOutputTokens: 4096,
    })

    const rawText = result.text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI nevrátila validní JSON')

    const aiTraining = JSON.parse(jsonMatch[0])
    const uid = () => Math.random().toString(36).slice(2, 9)

    type AIExercise = { name: string; sets: string; reps: string; weight: string; notes: string }
    type AISection = { title: string; exercises: AIExercise[] }

    const training = {
      focus: aiTraining.focus || '',
      duration: String(aiTraining.duration || '60'),
      sections: (aiTraining.sections as AISection[] || getDefaultSections()).map((s) => ({
        id: uid(),
        title: s.title,
        exercises: (s.exercises || []).map((e) => ({
          id: uid(),
          name: e.name || '',
          sets: String(e.sets || ''),
          reps: String(e.reps || ''),
          weight: e.weight || '',
          notes: e.notes || '',
          youtubeUrl: '',
        })),
      })),
      trainerNotes: aiTraining.trainerNotes || '',
      progression: aiTraining.progression || '',
    }

    return Response.json({ training })
  } catch (err) {
    return Response.json({ error: `Chyba AI: ${String(err)}` }, { status: 500 })
  }
}
