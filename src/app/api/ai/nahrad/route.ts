import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(request: Request) {
  const { exerciseName, sectionTitle, clientSlug: _clientSlug } = await request.json()

  const prompt = `Navrhni 5 různých alternativních cviků místo "${exerciseName}" pro sekci "${sectionTitle}".
Cviky musí být dostupné v běžném fitku (činka, osa, stroje, bradla, TRX) a cílit na stejnou svalovou skupinu.
Vrať POUZE toto JSON pole bez dalšího textu:
[{"name":"název cviku v angličtině","reason":"krátké vysvětlení v češtině proč je vhodná náhrada, max 1 věta"}]`

  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-5'),
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 600,
    })

    const match = result.text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Nevalidní odpověď od AI')

    const parsed = JSON.parse(match[0]) as { name: string; reason: string }[]
    const suggestions = parsed
      .filter((s) => s.name)
      .slice(0, 5)
      .map((s) => ({ name: s.name, reason: s.reason || '' }))

    if (!suggestions.length) throw new Error('AI nevrátila žádné návrhy')

    return Response.json({ suggestions })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
