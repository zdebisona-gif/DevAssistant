import { useState } from 'react'
import { Text, View } from 'react-native'
import { PencilSimple, Sparkle, Trash } from '../../icons.js'
import Button from '../ui/Button.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import Sheet from '../ui/Sheet.jsx'
import SleepNotes from './SleepNotes.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { useData } from '../../data/store.jsx'
import { assessSleep, describeGeminiError, inCooldown } from '../../lib/gemini.js'
import {
  SCORE_BREAKDOWN,
  creditPointsForLog,
  creditPointsForScore,
  dailyScoreOf,
  formatDuration,
  isAssessmentStale,
  ratingLabel,
  sleepHistoryContext,
  sleepNotes,
  sleepWindowLabel,
  totalSleepMinutes,
  wakeDayLabel,
} from '../../lib/sleep.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function ratingColor(c, rating) {
  if (rating >= 4) return c.success
  if (rating === 3) return c.accentText
  if (rating) return c.destructiveText
  return c.mutedForeground
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value)
}

function Metric({ label, value, tone }) {
  const { c, fonts, text } = useTheme()
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, minWidth: 0, gap: 3 }}>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.micro, letterSpacing: 0.6, textTransform: 'uppercase', color: c.mutedForeground }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: text.title, color: tone || c.foreground, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  )
}

export default function SleepDetailSheet({ visible, log, onClose, onEdit, onDelete }) {
  const { c, fonts, radius, text } = useTheme()
  const { data, updateSleepLog } = useData()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [assessing, setAssessing] = useState(false)
  const [error, setError] = useState(null)

  const minutes = totalSleepMinutes(log)
  const points = creditPointsForLog(log)
  const score = dailyScoreOf(log)
  const breakdown = log?.score_breakdown ?? null
  const canAssess = aiEnabled && !inCooldown()
  const tone = ratingColor(c, log?.rating)
  const stale = isAssessmentStale(log)

  const assess = async () => {
    if (!log || assessing || !aiEnabled || inCooldown()) return
    setAssessing(true)
    setError(null)

    let result
    try {
      result = await assessSleep({
        logDate: log.log_date,
        sessions: log.sessions ?? [],
        totalMinutes: minutes,
        notes: sleepNotes(log),
        history: sleepHistoryContext(data.sleepLogs, log.id),
      })
    } catch (cause) {
      setError(`${describeGeminiError(cause)} You can try again later.`)
      setAssessing(false)
      return
    }

    recordUsage({ remaining: result.remaining, cap: result.cap, model: result.model })
    try {
      await updateSleepLog(log.id, {
        rating: result.rating,
        feedback: result.feedback,
        assessed_by: 'gemini',
        assessed_at: new Date().toISOString(),
        daily_score: result.score,
        credit_points: creditPointsForScore(result.score),
        score_breakdown: result.breakdown,
        assessment_stale: false,
      })
    } catch (cause) {
      setError(cause.message || 'Could not save the assessment.')
    } finally {
      setAssessing(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={score !== null ? `Daily score ${score}/100` : log?.rating ? `${ratingLabel(log.rating)} sleep` : 'Sleep detail'}
      subtitle={log ? `${wakeDayLabel(log.log_date)} · ${formatDuration(minutes)}` : ''}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <Metric label="Total sleep" value={formatDuration(minutes)} />
        <Metric label="Daily score" value={score === null ? '—' : `${score}/100`} />
        <Metric label="Quality" value={log?.rating ? `${log.rating}/5` : '—'} tone={tone} />
        <Metric label="Score points" value={log?.rating ? signed(points) : '—'} tone={log?.rating ? (points >= 0 ? c.success : c.destructiveText) : c.mutedForeground} />
      </View>

      <View style={{ gap: 8 }}>
        {(log?.sessions ?? []).map((session, index) => (
          <View
            key={`${session.from}-${session.to}-${index}`}
            style={{
              gap: 3,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.background,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
              Sleep {index + 1}
            </Text>
            <Text style={{ fontFamily: fonts.monoMedium, fontSize: text.caption, lineHeight: 19, color: c.foreground, fontVariant: ['tabular-nums'] }}>
              {sleepWindowLabel(session, log?.log_date)}
            </Text>
          </View>
        ))}
      </View>

      {score !== null && breakdown ? (
        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.heading, color: c.foreground }}>
            Score breakdown
          </Text>
          {SCORE_BREAKDOWN.map((item) => (
            <ProgressBar
              key={item.key}
              label={item.label}
              value={Math.max(0, Math.min(item.max, Number(breakdown[item.key]) || 0))}
              limit={item.max}
            />
          ))}
        </View>
      ) : null}

      <SleepNotes log={log} />

      {stale ? (
        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: c.accent,
            paddingLeft: 10,
            gap: 3,
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.caption, color: c.accentText }}>
            Assessment outdated
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
            Sleep or notes changed after this score. Reassess to update the daily score and points.
          </Text>
        </View>
      ) : null}

      {log?.rating ? (
        <View
          style={{
            gap: 6,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: tone,
            backgroundColor: c.card,
            padding: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: tone }}>
              {ratingLabel(log.rating)}
            </Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
              {log.assessed_by === 'gemini' ? 'Gemini' : 'Assessed'}
            </Text>
          </View>
          {log.feedback ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
              {log.feedback}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}>
          {aiEnabled
            ? 'No AI assessment yet. Add notes about your day, then assess when you are ready.'
            : 'Turn on AI in Settings to assess sleep from your sessions, notes, and recent pattern.'}
        </Text>
      )}

      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructiveText }}>
          {error}
        </Text>
      ) : null}

      {canAssess ? (
        <Button variant={log?.rating ? 'secondary' : 'primary'} icon={Sparkle} onPress={assess} loading={assessing}>
          {log?.rating ? (stale ? 'Update assessment' : 'Assess again') : 'Assess with Gemini'}
        </Button>
      ) : aiEnabled ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          Gemini is cooling down after its free limit. You can try again shortly.
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="secondary" icon={PencilSimple} onPress={onEdit} style={{ flex: 1 }}>
          Edit
        </Button>
        <Button variant="ghost" icon={Trash} onPress={onDelete} style={{ flex: 1 }}>
          Delete
        </Button>
      </View>
    </Sheet>
  )
}
