import { useRouter } from 'expo-router'
import { CaretRight, Check, Fire, Moon, Plus, Target } from '../icons.js'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import PlanForm from '../components/forms/PlanForm.jsx'
import FinanceScoreCard from '../components/finance/FinanceScoreCard.jsx'
import TrendAreaChart, { ChartLegend } from '../components/charts/TrendAreaChart.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx'
import QuickAsk from '../components/ui/QuickAsk.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import { USER } from '../data/constants.js'
import { useData } from '../data/store.jsx'
import { usePrivacy } from '../data/privacy.jsx'
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
import { financeScore, financeScoreHistory } from '../lib/finance.js'
import { greeting, money, moneyAbs } from '../lib/format.js'
import { reportError } from '../lib/alerts.js'
import { creditBalance, dueMeta, sortProjects } from '../lib/projects.js'
import { sleepCreditScore } from '../lib/sleep.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

const TODAY = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})

function AvatarButton() {
  const { c, fonts } = useTheme()
  const router = useRouter()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={() => router.push('/settings')}
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
      <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: 14, color: c.primaryFg }}>
        {USER.initials}
      </Text>
    </Pressable>
  )
}

function Today({ entries, onToggle, onAdd }) {
  const { c, fonts, text } = useTheme()
  const done = entries.filter((entry) => entry.done).length

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
          {entries.map((entry, index) => (
            <Pressable
              key={entry.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: entry.done }}
              onPress={() => onToggle(entry.id, !entry.done).catch(reportError)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: index === 0 ? StyleSheet.hairlineWidth : StyleSheet.hairlineWidth,
                borderTopColor: c.line,
                backgroundColor: pressed ? c.overline : 'transparent',
              })}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: entry.done ? c.primary : c.border,
                  backgroundColor: entry.done ? c.primary : 'transparent',
                }}
              >
                {entry.done ? <Check size={13} weight="bold" color={c.onPrimary} /> : null}
              </View>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontFamily: fonts.sansMedium,
                  fontSize: text.body,
                  color: entry.done ? c.mutedForeground : c.foreground,
                  textDecorationLine: entry.done ? 'line-through' : 'none',
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
          ))}
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
  const { hidden, accountsHidden } = usePrivacy()
  const router = useRouter()
  const [range, setRange] = useState(12)
  const [formOpen, setFormOpen] = useState(false)

  const trend = useMemo(() => buildTrend(data.transactions, 12).slice(-range), [data.transactions, range])

  if (loading) {
    return (
      <Screen title={`${greeting()}, ${USER.name}`} subtitle={TODAY}>
        <Loading label="Loading your workspace" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title={`${greeting()}, ${USER.name}`} subtitle={TODAY}>
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
  const moneyScoreHistory = financeScoreHistory(data)

  return (
    <Screen
      title={`${greeting()}, ${USER.name}`}
      subtitle={TODAY}
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

      <FinanceScoreCard
        compact
        result={moneyScore}
        history={moneyScoreHistory}
        privacy={{ hidden, accountsHidden }}
        onPress={() => router.push('/finances')}
      />

      <Today entries={today} onToggle={togglePlanEntry} onAdd={() => setFormOpen(true)} />

      <Section
        title="Spending vs income"
        action={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[6, 12].map((months) => {
              const active = range === months
              return (
                <Pressable
                  key={months}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setRange(months)}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    backgroundColor: active ? c.primary : 'transparent',
                  }}
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
        <Card padded={data.transactions.length > 0}>
          {data.transactions.length ? (
            <View style={{ gap: 12 }}>
              <ChartLegend />
              <TrendAreaChart data={trend} />
            </View>
          ) : (
            <EmptyState
              title="No activity yet"
              description="Log income and spending in Money and your trend appears here."
            />
          )}
        </Card>
      </Section>

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
