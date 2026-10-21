import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CaretLeft, CaretRight, Sparkle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import Chip from '../ui/Chip.jsx'
import StatCard from '../ui/StatCard.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { describeGeminiError, inCooldown, sleepRecap } from '../../lib/gemini.js'
import {
  creditPointsForLog,
  dailyScoreOf,
  formatDuration,
  periodBounds,
  sleepNotes,
  sleepSummary,
  totalSleepMinutes,
} from '../../lib/sleep.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function signed(value) {
  return value > 0 ? `+${value}` : String(value)
}

function barColor(day, c) {
  if (!day.log) return c.muted
  if (day.score === null) return c.border
  if (day.score >= 80) return c.success
  if (day.score >= 60) return c.primary
  if (day.score >= 40) return c.accent
  return c.destructive
}

function shortDay(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })
}

function dayNumber(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric' })
}

function SleepChart({ summary, period }) {
  const { c, fonts, radius, text } = useTheme()
  const maxMinutes = Math.max(8 * 60, ...summary.days.map((day) => day.minutes))

  if (!summary.nights) {
    return (
      <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
        No sleep logged in this period.
      </Text>
    )
  }

  if (period === 'week') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 104 }}>
        {summary.days.map((day) => (
          <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
              {day.score === null ? '' : day.score}
            </Text>
            <View
              style={{
                width: '100%',
                height: 64,
                justifyContent: 'flex-end',
                borderRadius: radius.sm,
                backgroundColor: c.muted,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: Math.max(3, Math.round((day.minutes / maxMinutes) * 64)),
                  backgroundColor: barColor(day, c),
                  opacity: day.log ? 1 : 0.35,
                }}
              />
            </View>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.mutedForeground }}>
              {shortDay(day.date)}
            </Text>
          </View>
        ))}
      </View>
    )
  }

  const leading = (new Date(`${summary.start}T00:00:00`).getDay() + 6) % 7
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: fonts.sansMedium,
              fontSize: text.micro,
              color: c.mutedForeground,
            }}
          >
            {label}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: leading }, (_, index) => (
          <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 48 }} />
        ))}
        {summary.days.map((day) => (
          <View
            key={day.date}
            accessibilityLabel={`${day.date}, ${day.log ? formatDuration(day.minutes) : 'no sleep'}`}
            style={{ width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}
          >
            <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
              {dayNumber(day.date)}
            </Text>
            <View
              style={{
                width: 8,
                height: Math.max(3, Math.round((day.minutes / maxMinutes) * 24)),
                borderRadius: radius.pill,
                backgroundColor: barColor(day, c),
                opacity: day.log ? 1 : 0.3,
              }}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

function recapContext(summary) {
  const lines = summary.logs
    .map((log) => {
      const score = dailyScoreOf(log)
      const notes = sleepNotes(log)
        .map((note) => note.text)
        .join(' | ')
      return [
        log.log_date,
        formatDuration(totalSleepMinutes(log)),
        score === null ? 'not scored' : `${score}/100`,
        log.rating ? `${log.rating}/5` : 'not rated',
        signed(creditPointsForLog(log)),
        notes || 'no notes',
      ].join('; ')
    })
    .join('\n')

  return [
    `Period: ${summary.label}`,
    `Nights logged: ${summary.nights}`,
    `Average sleep: ${summary.averageMinutes === null ? 'none' : formatDuration(summary.averageMinutes)}`,
    `Average daily score: ${summary.averageScore === null ? 'none' : `${summary.averageScore}/100`}`,
    `Average quality: ${summary.averageRating === null ? 'none' : `${summary.averageRating}/5`}`,
    `Points from these nights: ${signed(summary.points)}`,
    `Assessments needing update: ${summary.stale}`,
    `Daily records:\n${lines}`,
  ]
    .join('\n')
    .slice(0, 4000)
}

export default function SleepSummary({ logs }) {
  const { c, fonts, text } = useTheme()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [period, setPeriod] = useState('week')
  const [offset, setOffset] = useState(0)
  const [recap, setRecap] = useState(null)
  const [recapBusy, setRecapBusy] = useState(false)
  const [recapError, setRecapError] = useState(null)
  const summary = sleepSummary(logs, period, offset)
  const bounds = periodBounds(period, offset)
  const updatedAt = summary.logs.reduce(
    (latest, log) => (String(log.updated_at ?? '') > latest ? String(log.updated_at) : latest),
    '',
  )
  const recapKey = `${period}:${offset}:${summary.nights}:${updatedAt}`
  const canRecap = aiEnabled && summary.assessed > 0 && !inCooldown()
  const visibleRecap = recap?.key === recapKey ? recap.text : null
  const visibleError = recapError?.key === recapKey ? recapError.text : null

  const setPeriodAndReset = (next) => {
    setPeriod(next)
    setOffset(0)
  }

  const move = (nextOffset) => {
    if (nextOffset > 0) return
    setOffset(nextOffset)
  }

  const generateRecap = async () => {
    if (!canRecap || recapBusy) return
    setRecapBusy(true)
    setRecapError(null)
    try {
      const result = await sleepRecap({
        periodLabel: bounds.label,
        context: recapContext(summary),
      })
      recordUsage({ remaining: result.remaining, cap: result.cap, model: result.model })
      setRecap({ key: recapKey, text: result.text })
    } catch (cause) {
      setRecapError({ key: recapKey, text: describeGeminiError(cause) })
    } finally {
      setRecapBusy(false)
    }
  }

  return (
    <Card padded>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip active={period === 'week'} onPress={() => setPeriodAndReset('week')}>
            Week
          </Chip>
          <Chip active={period === 'month'} onPress={() => setPeriodAndReset('month')}>
            Month
          </Chip>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous period"
            onPress={() => move(offset - 1)}
            hitSlop={8}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <CaretLeft size={16} weight="bold" color={c.foreground} />
          </Pressable>
          <Text style={{ minWidth: 92, textAlign: 'center', fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.foreground }}>
            {bounds.label}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next period"
            accessibilityState={{ disabled: offset >= 0 }}
            onPress={() => move(offset + 1)}
            disabled={offset >= 0}
            hitSlop={8}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', opacity: offset >= 0 ? 0.3 : 1 }}
          >
            <CaretRight size={16} weight="bold" color={c.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <StatCard
          label="Average sleep"
          value={summary.averageMinutes === null ? '—' : formatDuration(summary.averageMinutes)}
          hint={`${summary.nights} ${summary.nights === 1 ? 'night' : 'nights'} logged`}
        />
        <StatCard
          label="Average score"
          value={summary.averageScore === null ? '—' : `${summary.averageScore}/100`}
          hint={`${summary.assessed} assessed`}
        />
        <StatCard
          label="Average quality"
          value={summary.averageRating === null ? '—' : `${summary.averageRating}/5`}
          hint={summary.stale ? `${summary.stale} need update` : 'Up to date'}
        />
        <StatCard
          label="Points"
          value={signed(summary.points)}
          hint="From these nights"
        />
      </View>

      <SleepChart summary={summary} period={period} />

      {summary.nights ? (
        <View style={{ gap: 8 }}>
          {visibleRecap ? (
            <View
              style={{
                borderLeftWidth: 2,
                borderLeftColor: c.accent,
                paddingLeft: 10,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkle size={13} weight="bold" color={c.accent} />
                <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                  AI · Gemini
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 19, color: c.body }}>
                {visibleRecap}
              </Text>
            </View>
          ) : null}
          {visibleError ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
              {visibleError}
            </Text>
          ) : null}
          {canRecap ? (
            <Button variant="secondary" size="sm" icon={Sparkle} onPress={generateRecap} loading={recapBusy}>
              {visibleRecap ? 'Recap again' : 'Recap with Gemini'}
            </Button>
          ) : aiEnabled ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              {summary.assessed
                ? 'Gemini is cooling down after its free limit. You can try again shortly.'
                : 'Assess at least one night to generate a recap.'}
            </Text>
          ) : (
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              Turn on AI in Settings for a Gemini recap.
            </Text>
          )}
        </View>
      ) : null}
    </Card>
  )
}
