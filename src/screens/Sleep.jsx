import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Moon, Plus } from '../icons.js'
import SleepDetailSheet from '../components/sleep/SleepDetailSheet.jsx'
import SleepNotes from '../components/sleep/SleepNotes.jsx'
import SleepSummary from '../components/sleep/SleepSummary.jsx'
import SleepForm from '../components/forms/SleepForm.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import FadeSwap from '../components/ui/FadeSwap.jsx'
import Loading from '../components/ui/Loading.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { todayISO } from '../lib/analytics.js'
import {
  creditPointsForLog,
  dailyScoreOf,
  formatDuration,
  isAssessmentStale,
  latestSleepLog,
  latestSleepNote,
  ratingLabel,
  recentAverageScore,
  sessionWindow,
  sleepCreditScore,
  totalSleepMinutes,
  wakeDayLabel,
} from '../lib/sleep.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

function dateLabel(iso, short = false) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString(
    undefined,
    short
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  )
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value)
}

function pointsLabel(points) {
  return `${points > 0 ? '+' : ''}${points} pts`
}

function SleepRow({ log, onPress }) {
  const { c, fonts, radius, text } = useTheme()
  const minutes = totalSleepMinutes(log)
  const points = creditPointsForLog(log)
  const score = dailyScoreOf(log)
  const note = latestSleepNote(log)
  const stale = isAssessmentStale(log)
  const scoreLabel = score === null ? 'Not scored' : `${score}/100`

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${wakeDayLabel(log.log_date)}, ${formatDuration(minutes)}, ${scoreLabel}${
        log.rating ? `, ${ratingLabel(log.rating)}, ${pointsLabel(points)}` : ', not rated'
      }`}
      onPress={() => onPress(log)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
          backgroundColor: c.muted,
        }}
      >
        <Moon size={18} color={c.foreground} />
      </View>
      <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
          {wakeDayLabel(log.log_date)}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          {formatDuration(minutes)} · {scoreLabel}
          {stale ? ' · Needs update' : note ? ` · ${note.text}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text
          style={{
            fontFamily: fonts.monoMedium,
            fontSize: text.caption,
            color: log.rating ? (points >= 0 ? c.success : c.destructiveText) : c.mutedForeground,
            fontVariant: ['tabular-nums'],
          }}
        >
          {log.rating ? pointsLabel(points) : 'Not rated'}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          {log.rating ? `${log.rating}/5 · ${ratingLabel(log.rating)}` : 'Tap to assess'}
        </Text>
      </View>
    </Pressable>
  )
}

export default function Sleep() {
  const { c, fonts, radius, text } = useTheme()
  const { data, loading, error, reload, deleteSleepLog } = useData()
  const [formOpen, setFormOpen] = useState(false)
  const [record, setRecord] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [detailKey, setDetailKey] = useState(0)
  const [showAllLogs, setShowAllLogs] = useState(false)

  if (loading) {
    return (
      <Screen title="Sleep" subtitle="Rest and recovery" left="back" tabbed={false}>
        <Loading label="Loading sleep logs" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Sleep" subtitle="Rest and recovery" left="back" tabbed={false}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const logs = [...data.sleepLogs].sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)))
  const recentLogs = showAllLogs ? logs : logs.slice(0, 7)
  const today = logs.find((log) => log.log_date === todayISO()) ?? null
  const last = latestSleepLog(logs)
  const credit = sleepCreditScore(data.sleepCreditEvents)
  const average = recentAverageScore(logs)
  const detailLog = detailId ? logs.find((log) => log.id === detailId) ?? null : null
  const overnight = Boolean(
    today?.sessions?.some((session) => sessionWindow(session, today.log_date)?.crosses),
  )

  const openNew = () => {
    setRecord(today)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  const openEdit = (log) => {
    setDetailId(null)
    setRecord(log)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  const openDetail = (log) => {
    setDetailId(log.id)
    setDetailKey((key) => key + 1)
  }

  const remove = (log) => {
    confirmDelete(`sleep on ${dateLabel(log.log_date, true)}`, async () => {
      try {
        await deleteSleepLog(log.id)
        setDetailId(null)
      } catch (error) {
        reportError(error)
      }
    })
  }

  return (
    <Screen
      title="Sleep"
      subtitle="Rest and recovery"
      left="back"
      tabbed={false}
      right={
        <Button size="sm" variant="primary" icon={Plus} onPress={openNew}>
          {today ? 'Edit sleep' : 'Log sleep'}
        </Button>
      }
    >
      <Reveal distance={8}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <StatCard
            label="Overall score"
            value={signed(credit)}
            hint="Cumulative · never resets"
          />
          <StatCard
            label="7-day score"
            value={average === null ? '—' : `${average}/100`}
            hint={last ? `Last: ${formatDuration(totalSleepMinutes(last))}` : 'No sleep logged yet'}
          />
        </View>
      </Reveal>

      <Reveal delay={40}>
        <Section
          title={today ? (overnight ? 'Last night' : 'Today’s sleep') : 'Last night'}
          action={
            today ? (
              <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                {formatDuration(totalSleepMinutes(today))}
              </Text>
            ) : null
          }
        >
          {today ? (
            <FadeSwap swapKey={`${today.id}:${today.updated_at ?? ''}`}>
              <View
                style={{
                  gap: 12,
                  borderRadius: radius.lg,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                  backgroundColor: c.card,
                  padding: 16,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open sleep log for ${dateLabel(today.log_date)}`}
                  onPress={() => openDetail(today)}
                  style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.9 : 1 })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}>
                        {formatDuration(totalSleepMinutes(today))} logged
                      </Text>
                      <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
                        {wakeDayLabel(today.log_date)}
                        {dailyScoreOf(today) === null ? '' : ` · ${dailyScoreOf(today)}/100 daily`}
                      </Text>
                    </View>
                    <View
                      style={{
                        borderRadius: radius.pill,
                        backgroundColor: today.rating ? c.primarySoft : c.muted,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.monoMedium,
                          fontSize: text.micro,
                          color: today.rating ? c.primaryFg : c.mutedForeground,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {today.rating ? pointsLabel(creditPointsForLog(today)) : 'Assess'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
                      {today.rating ? `${ratingLabel(today.rating)} quality (${today.rating}/5)` : 'Not rated yet'}
                    </Text>
                    {isAssessmentStale(today) ? (
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.accentText }}>
                        Needs update
                      </Text>
                    ) : null}
                  </View>
                  {latestSleepNote(today) ? (
                    <Text
                      numberOfLines={2}
                      style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}
                    >
                      {latestSleepNote(today).text}
                    </Text>
                  ) : (
                    <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
                      Add notes about your energy, focus, or naps below.
                    </Text>
                  )}
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.primaryFg }}>
                    Open, edit or assess
                  </Text>
                </Pressable>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />
                <SleepNotes log={today} />
              </View>
            </FadeSwap>
          ) : (
            <Card>
              <EmptyState
                icon={Moon}
                title="No sleep logged yet"
                description="Log last night’s sleep or a nap, then note how you felt."
                action={
                  <Button size="sm" variant="primary" onPress={openNew}>
                    Log sleep
                  </Button>
                }
              />
            </Card>
          )}
        </Section>
      </Reveal>

      <Reveal delay={80}>
        <Section title="Sleep summary">
          <SleepSummary logs={logs} />
        </Section>
      </Reveal>

      <Reveal delay={120}>
        <Section
          title="Recent days"
          action={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {logs.length ? (
                <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                  {logs.length}
                </Text>
              ) : null}
              {logs.length > 7 ? (
                <Button size="sm" variant="ghost" onPress={() => setShowAllLogs((value) => !value)}>
                  {showAllLogs ? 'Show less' : 'Show all'}
                </Button>
              ) : null}
            </View>
          }
        >
          <FadeSwap swapKey={`${showAllLogs}:${recentLogs.map((log) => log.id).join('|')}`}>
            {logs.length ? (
              <Card>
                {recentLogs.map((log, index) => (
                  <View key={log.id}>
                    {index ? (
                      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 66 }} />
                    ) : null}
                    <SleepRow log={log} onPress={openDetail} />
                  </View>
                ))}
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={Moon}
                  title="No sleep history yet"
                  description="Your daily scores and cumulative points will appear here."
                />
              </Card>
            )}
          </FadeSwap>
        </Section>
      </Reveal>

      <SleepForm
        key={`sleep-form-${formKey}`}
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        record={record}
        defaultDate={todayISO()}
        existingDates={logs.map((log) => log.log_date)}
      />
      <SleepDetailSheet
        key={`sleep-detail-${detailKey}`}
        visible={Boolean(detailLog)}
        log={detailLog}
        onClose={() => setDetailId(null)}
        onEdit={() => openEdit(detailLog)}
        onDelete={() => remove(detailLog)}
      />
    </Screen>
  )
}
