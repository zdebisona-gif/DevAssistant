import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { CaretRight, Fire, Moon, Plus, Target } from '../icons.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Button from '../components/ui/Button.jsx'
import CheckBox from '../components/ui/CheckBox.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import FadeSwap from '../components/ui/FadeSwap.jsx'
import Loading from '../components/ui/Loading.jsx'
import PlanForm from '../components/forms/PlanForm.jsx'
import TrendAreaChart, { ChartLegend } from '../components/charts/TrendAreaChart.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx'
import QuickAsk from '../components/ui/QuickAsk.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import { USER } from '../data/constants.js'
import { useData } from '../data/store.jsx'
import {
  buildTrend,
  budgetsForMonth,
  currentStreak,
  entriesOn,
  entryTimeLabel,
  netTotal,
  percentChange,
  todayISO,
  totalsForMonth,
  totalsForPrevMonth,
} from '../lib/analytics.js'
import { financeScore } from '../lib/finance.js'
import { greeting, money, moneyAbs } from '../lib/format.js'
import { reportError } from '../lib/alerts.js'
import { creditBalance, dueMeta, sortProjects } from '../lib/projects.js'
import { sleepCreditScore } from '../lib/sleep.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function AvatarButton() {
  const { c, fonts, text } = useTheme()
  const router = useRouter()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={() => router.push('/settings')}
      hitSlop={2}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: c.primarySoft,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: text.body, color: c.primaryFg }}>
        {USER.initials}
      </Text>
    </Pressable>
  )
}

function FinanceScoreRing({ result, onPress }) {
  const { c, fonts, text } = useTheme()
  const size = 76
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const rawScore = Number(result?.score)
  const hasScore = Number.isFinite(rawScore)
  const value = hasScore ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0
  const tone =
    hasScore && (result.label === 'At risk' || result.label === 'Tight')
      ? c.accent
      : hasScore
        ? c.primary
        : c.mutedForeground
  const offset = circumference - (value / 100) * circumference
  const label = hasScore ? result.label : 'No data'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        hasScore
          ? `Finance score ${value} out of 100, ${label}. Open Money.`
          : 'Finance score not available. Open Money.'
      }
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={c.muted} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tone}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 8,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: c.mutedForeground,
          includeFontPadding: false,
        }}
      >
        Score
      </Text>
      <Text
        style={{
          fontFamily: fonts.monoSemiBold,
          fontSize: text.title,
          lineHeight: 25,
          color: c.foreground,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        }}
      >
        {hasScore ? value : '--'}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          maxWidth: size - 20,
          fontFamily: fonts.sansMedium,
          fontSize: 9,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: tone,
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function Today({ entries, pending, onToggle, onAdd }) {
  const { c, fonts, text } = useTheme()
  const done = entries.filter((entry) => (pending[entry.id] ?? entry.done)).length

  return (
    <Card padded={!entries.length}>
      <CardHeader
        title="Today"
        subtitle={entries.length ? `${done} of ${entries.length} done` : 'Nothing scheduled'}
        action={
          <Button size="sm" variant="ghost" icon={Plus} onPress={onAdd} accessibilityLabel="Add plan entry" />
        }
      />
      {entries.length ? (
        <CardBody style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 0 }}>
          <FadeSwap swapKey={entries.map((entry) => entry.id).join('|')}>
            {entries.map((entry, index) => {
              const checked = pending[entry.id] ?? entry.done
              const isPending = pending[entry.id] !== undefined
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${entry.title}, ${checked ? 'done' : 'not done'}, ${entryTimeLabel(entry.start_time)}`}
                  accessibilityState={{ checked, disabled: isPending }}
                  disabled={isPending}
                  onPress={() => onToggle(entry.id, !checked)}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: c.line,
                    backgroundColor: pressed ? c.overline : 'transparent',
                    opacity: isPending ? 0.7 : 1,
                  })}
                >
                  <CheckBox checked={checked} />
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontFamily: fonts.sansMedium,
                      fontSize: text.body,
                      color: checked ? c.mutedForeground : c.foreground,
                      textDecorationLine: checked ? 'line-through' : 'none',
                    }}
                  >
                    {entry.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: text.micro,
                      color: c.mutedForeground,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {entryTimeLabel(entry.start_time)}
                  </Text>
                </Pressable>
              )
            })}
          </FadeSwap>
        </CardBody>
      ) : (
        <EmptyState
          title="Your day is clear"
          description="Add a time block and it will show up here."
          action={
            <Button size="sm" variant="primary" onPress={onAdd}>
              Add a plan entry
            </Button>
          }
        />
      )}
    </Card>
  )
}

function MoreRow({ icon: Icon, label, value, to }) {
  const { c, fonts, text } = useTheme()
  const router = useRouter()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={() => router.push(to)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: c.muted,
        }}
      >
        <Icon size={17} color={c.foreground} />
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: text.caption,
          color: c.mutedForeground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <CaretRight size={14} weight="bold" color={c.mutedForeground} />
    </Pressable>
  )
}

function DueRow({ project }) {
  const { c, fonts, text } = useTheme()
  const router = useRouter()
  const meta = dueMeta(project)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${project.title}, ${meta.overdue ? 'overdue, was due' : 'due'} ${meta.label}`}
      onPress={() => router.push('/projects')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: c.muted,
        }}
      >
        <Target size={17} color={c.foreground} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
        {project.title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: text.micro,
          color: meta.overdue ? c.destructiveText : c.mutedForeground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {meta.overdue ? 'Overdue' : meta.label}
      </Text>
    </Pressable>
  )
}

export default function Dashboard() {
  const { c, fonts, radius, text } = useTheme()
  const { data, loading, error, reload, togglePlanEntry } = useData()
  const router = useRouter()
  const [range, setRange] = useState(12)
  const [rangeLayouts, setRangeLayouts] = useState({})
  const [rangeSlide] = useState(() => new Animated.Value(0))
  const rangeInitialized = useRef(false)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingToday, setPendingToday] = useState({})
  const dateLabel = todayLabel()

  const trend = useMemo(() => buildTrend(data.transactions, 12).slice(-range), [data.transactions, range])

  useEffect(() => {
    const sixMonths = rangeLayouts[6]
    const twelveMonths = rangeLayouts[12]
    if (!sixMonths || !twelveMonths) return undefined

    const distance = twelveMonths.x - sixMonths.x
    const target = range === 12 ? distance : 0
    if (!rangeInitialized.current) {
      rangeSlide.setValue(target)
      rangeInitialized.current = true
      return undefined
    }

    const animation = Animated.timing(rangeSlide, {
      toValue: target,
      duration: 220,
      easing: Easing.bezier(0.22, 0, 0, 1),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [range, rangeLayouts, rangeSlide])

  const toggleToday = async (id, done) => {
    Haptics.selectionAsync().catch(() => {})
    setPendingToday((prev) => ({ ...prev, [id]: done }))
    try {
      await togglePlanEntry(id, done)
    } catch (cause) {
      reportError(cause)
    } finally {
      setPendingToday((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  if (loading) {
    return (
      <Screen title={`${greeting()}, ${USER.name}`} subtitle={dateLabel}>
        <Loading label="Loading your workspace" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title={`${greeting()}, ${USER.name}`} subtitle={dateLabel}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const { spend } = totalsForMonth(data.transactions)
  const spendDelta = percentChange(spend, totalsForPrevMonth(data.transactions).spend)
  const net = netTotal(data.transactions)
  const budgetTotal = budgetsForMonth(data.budgets).reduce(
    (sum, budget) => sum + (Number(budget.limit_amount) || 0),
    0,
  )
  const remaining = budgetTotal - spend
  const today = entriesOn(data.planner, todayISO())
  const streak = currentStreak(data.sessions)
  const activeProjects = sortProjects(data.projects).filter((project) => project.status === 'active')
  const credits = creditBalance(data.penalties)
  const sleep = sleepCreditScore(data.sleepCreditEvents)
  const moneyScore = financeScore(data)

  return (
    <Screen
      title={`${greeting()}, ${USER.name}`}
      subtitle={dateLabel}
      right={
        <>
          <ThemeToggle />
          <AvatarButton />
        </>
      }
    >
      <QuickAsk />

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard
          label="Net balance"
          value={money(net)}
        />
        <StatCard
          label="Spent this month"
          value={money(spend, 0)}
          delta={spendDelta}
          deltaIsGood={false}
          hint={
            budgetTotal > 0
              ? remaining < 0
                ? `${moneyAbs(remaining, 0)} over budget`
                : `${money(remaining, 0)} left of ${money(budgetTotal, 0)}`
              : 'Add a budget to track this'
          }
        />
      </View>

      <Section
        title="Spending vs income"
        action={
          <View
            style={{
              position: 'relative',
              flexDirection: 'row',
              padding: 2,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              borderRadius: radius.pill,
              backgroundColor: c.muted,
            }}
          >
            {rangeLayouts[6] ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: rangeLayouts[6].x,
                  top: StyleSheet.hairlineWidth + 2,
                  width: rangeLayouts[6].width,
                  height: 44,
                  borderRadius: radius.pill,
                  backgroundColor: c.primary,
                  transform: [{ translateX: rangeSlide }],
                }}
              />
            ) : null}
            {[6, 12].map((months) => {
              const active = range === months
              return (
                <Pressable
                  key={months}
                  accessibilityRole="button"
                  accessibilityLabel={`Show the last ${months} months`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setRange(months)}
                  onLayout={({ nativeEvent }) => {
                    const { x, width } = nativeEvent.layout
                    setRangeLayouts((previous) => {
                      const current = previous[months]
                      if (current?.x === x && current?.width === width) return previous
                      return { ...previous, [months]: { x, width } }
                    })
                  }}
                  hitSlop={2}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    minWidth: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 10,
                    borderRadius: radius.pill,
                    backgroundColor: 'transparent',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: text.caption,
                      color: active ? c.onPrimary : c.mutedForeground,
                    }}
                  >
                    {months}M
                  </Text>
                </Pressable>
              )
            })}
          </View>
        }
      >
        <Card padded>
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              {data.transactions.length ? <ChartLegend /> : <View style={{ flex: 1 }} />}
              <FinanceScoreRing result={moneyScore} onPress={() => router.push('/finances')} />
            </View>
            {data.transactions.length ? (
              <TrendAreaChart data={trend} />
            ) : (
              <EmptyState
                title="No activity yet"
                description="Log income and spending in Money and your trend appears here."
                style={{ paddingHorizontal: 0, paddingVertical: 8 }}
              />
            )}
          </View>
        </Card>
      </Section>

      <Today entries={today} pending={pendingToday} onToggle={toggleToday} onAdd={() => setFormOpen(true)} />

      {activeProjects.length ? (
        <Section
          title="Due soon"
          action={
            <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
              {credits} credits
            </Text>
          }
        >
          <Card>
            {activeProjects.slice(0, 3).map((project, index) => (
              <View key={project.id}>
                {index ? (
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 62 }} />
                ) : null}
                <DueRow project={project} />
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      <Section title="More">
        <Card>
          <MoreRow
            icon={Fire}
            label="Learning"
            value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
            to="/learning"
          />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 62 }} />
          <MoreRow
            icon={Target}
            label="Projects"
            value={`${activeProjects.length} active`}
            to="/projects"
          />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 62 }} />
          <MoreRow
            icon={Moon}
            label="Sleep"
            value={
              data.sleepLogs.length || data.sleepCreditEvents.length
                ? `${sleep > 0 ? '+' : ''}${sleep} points`
                : 'No logs'
            }
            to="/sleep"
          />
        </Card>
      </Section>

      <PlanForm visible={formOpen} onClose={() => setFormOpen(false)} />
    </Screen>
  )
}
