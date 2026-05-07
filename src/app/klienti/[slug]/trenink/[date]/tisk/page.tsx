import { getClientBySlug, getTrainingMarkdown, getRecentExerciseHistory } from '@/lib/obsidian'
import { parseTraining, formatCzechDate } from '@/lib/markdown'
import { getTrainingTimeForDate } from '@/lib/calendar'
import PrintTrigger from '@/components/PrintTrigger'
import { notFound } from 'next/navigation'

function formatHistory(h: { sets: string; reps: string; weight: string }): string {
  const parts: string[] = []
  if (h.sets && h.reps) parts.push(`${h.sets}× ${h.reps} opak.`)
  else if (h.sets) parts.push(`${h.sets}×`)
  else if (h.reps) parts.push(`${h.reps} opak.`)
  if (h.weight) parts.push(`${h.weight} kg`)
  if (!parts.length) return ''
  return `Poslední: ${parts.join(' / ')}`
}

export default async function TiskPage({
  params,
}: {
  params: Promise<{ slug: string; date: string }>
}) {
  const { slug, date } = await params
  const client = await getClientBySlug(slug)
  if (!client) notFound()

  const markdown = await getTrainingMarkdown(client.folder, date)
  if (!markdown) notFound()

  const training = parseTraining(markdown, date)
  const [calendarTime, history] = await Promise.all([
    getTrainingTimeForDate(date),
    getRecentExerciseHistory(client.folder, date),
  ])

  const startTime = training.startTime || calendarTime.startTime
  const endTime = training.endTime || calendarTime.endTime
  const timeStr = startTime ? `${startTime}${endTime ? ` – ${endTime}` : ''}` : ''

  return (
    <html lang="cs">
      <head>
        <title>{`Trénink ${date} — ${client.name}`}</title>
        <meta name="viewport" content="width=210mm" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { width: 210mm; }
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            color: #1e293b;
            padding: 12mm 14mm 10mm;
            line-height: 1.4;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .header-left h1 { font-size: 15px; font-weight: 700; }
          .header-left .subtitle { color: #64748b; font-size: 11px; margin-top: 1px; }
          .header-right { text-align: right; }
          .logo { font-size: 12px; font-weight: 700; color: #000; }
          .logo-red { color: #E30613; }
          .time-badge {
            display: inline-block;
            background: #fff7ed;
            color: #c2410c;
            border: 1px solid #fed7aa;
            border-radius: 4px;
            padding: 2px 7px;
            font-size: 10px;
            font-weight: 600;
            margin-top: 4px;
          }

          .meta { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
          .pill {
            background: #f1f5f9;
            color: #475569;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: 500;
          }
          .pill-blue { background: #eff6ff; color: #1d4ed8; }

          .section { margin-bottom: 8px; page-break-inside: avoid; }
          .section-title {
            font-size: 10px;
            font-weight: 700;
            background: #f8fafc;
            border-left: 3px solid #E30613;
            padding: 3px 8px;
            margin-bottom: 3px;
            color: #1e293b;
          }

          table { width: 100%; border-collapse: collapse; font-size: 9px; }
          thead tr { background: #f1f5f9; }
          th {
            text-align: left;
            padding: 3px 6px;
            font-weight: 600;
            color: #64748b;
            border-bottom: 1px solid #e2e8f0;
            white-space: nowrap;
          }
          td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          td.name { font-weight: 500; }
          td.num { color: #475569; text-align: center; font-family: monospace; }
          td.note { color: #64748b; font-size: 8.5px; }
          td.cb { width: 18px; text-align: center; }

          .checkbox {
            display: inline-block;
            width: 11px;
            height: 11px;
            border: 1.5px solid #94a3b8;
            border-radius: 2px;
            vertical-align: middle;
          }

          .blank { color: #cbd5e1; }
          .hist { font-size: 7px; color: #94a3b8; margin-top: 1px; font-weight: 400; }

          .notes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
          .notes-box { border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; background: #f8fafc; }
          .notes-label { font-size: 7.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
          .notes-text { font-size: 9px; color: #475569; white-space: pre-line; }

          @media print {
            @page { size: A4; margin: 0; }
            html, body { width: 210mm; height: 297mm; }
            body { padding: 12mm 14mm 10mm; }
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <div className="header-left">
            <h1>{client.name}</h1>
            <div className="subtitle">{formatCzechDate(date)}</div>
            {timeStr && <div className="time-badge">🕐 {timeStr}</div>}
          </div>
          <div className="header-right">
            <div className="logo">Fitness <span className="logo-red">Hvězda</span></div>
            {training.focus && (
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', maxWidth: '120px', textAlign: 'right' }}>
                {training.focus}
              </div>
            )}
          </div>
        </div>

        {training.duration && (
          <div className="meta">
            <span className="pill pill-blue">{training.duration} min</span>
            {training.dayName && <span className="pill" style={{ textTransform: 'capitalize' }}>{training.dayName}</span>}
          </div>
        )}

        {training.sections.map((section) => {
          const exercises = section.exercises.filter((e) => e.name)
          if (!exercises.length) return null
          return (
            <div key={section.id} className="section">
              <div className="section-title">{section.title}</div>
              <table>
                <thead>
                  <tr>
                    <th className="cb"></th>
                    <th style={{ width: '33%' }}>Exercise</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Sets</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Reps</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Weight</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.map((ex, i) => {
                    const hist = history.get(ex.name.trim().toLowerCase())
                    return (
                      <tr key={ex.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td className="cb"><span className="checkbox" /></td>
                        <td className="name">
                          {ex.name}
                          {hist && formatHistory(hist) && <div className="hist">{formatHistory(hist)}</div>}
                        </td>
                        <td className="num"></td>
                        <td className="num"></td>
                        <td className="num"></td>
                        <td className="note">{ex.notes.replace(/\[YT\]\([^)]+\)/g, '').trim()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}

        {(training.trainerNotes || training.progression) && (
          <div className="notes-grid">
            {training.trainerNotes && (
              <div className="notes-box">
                <div className="notes-label">Trenérské poznámky</div>
                <div className="notes-text">{training.trainerNotes}</div>
              </div>
            )}
            {training.progression && (
              <div className="notes-box">
                <div className="notes-label">Progrese</div>
                <div className="notes-text">{training.progression}</div>
              </div>
            )}
          </div>
        )}

        <PrintTrigger />
      </body>
    </html>
  )
}
