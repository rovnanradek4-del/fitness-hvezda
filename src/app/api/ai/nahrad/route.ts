import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(request: Request) {
  const { exerciseName, sectionTitle, clientSlug } = await request.json()

  const prompt = `Navrhni náhradu za cvik "${exerciseName}" v sekci "${sectionTitle}".
Podmínky:
- Cvik musí být dostupný v běžném fitku (činka, osa, stroje, bradla, TRX)
- Musí procvičovat stejné nebo podobné svalové skupiny
- Odpověz POUZE tímto JSON objektem bez dalšího textu:
{"name":"název náhrady v angličtině","reason":"krátké zdůvodnění v češtině, max 1 věta"}`

  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-5'),
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 150,
    })

    const match = result.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Nevalidní odpověď')
    const json = JSON.parse(match[0])
    if (!json.name) throw new Error('Chybí název náhrady')

    return Response.json({ name: json.name, reason: json.reason || '' })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
