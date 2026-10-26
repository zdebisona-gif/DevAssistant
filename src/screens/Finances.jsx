import * as Haptics from 'expo-haptics'
import { memo, useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bank,
  Check,
  Eye,
  EyeSlash,
  HandCoins,
  PencilSimple,
  Plus,
  Trash,
} from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import FadeSwap from '../components/ui/FadeSwap.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import AccountCard from '../components/ui/AccountCard.jsx'
import FinanceScoreCard from '../components/finance/FinanceScoreCard.jsx'
import AccountForm from '../components/forms/AccountForm.jsx'
import AdjustAccountSheet from '../components/forms/AdjustAccountSheet.jsx'
import BudgetForm from '../components/forms/BudgetForm.jsx'
import DebtForm from '../components/forms/DebtForm.jsx'
import GoalForm from '../components/finance/GoalForm.jsx'
import TxForm from '../components/forms/TxForm.jsx'
import Screen, { IconButton } from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { DEBT_DIRECTION_LABELS } from '../data/constants.js'
import { useData } from '../data/store.jsx'
import { usePrivacy } from '../data/privacy.jsx'
import { accountRows, debtDueLabel, openDebts, settledDebts, totalInAccounts } from '../lib/accounts.js'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { useRowActions } from '../lib/rowActions.jsx'
import {
  budgetProgress,
  formatDateShort,
  percentChange,
  totalsForMonth,
  totalsForPrevMonth,
} from '../lib/analytics.js'
import { financeScore, financeScoreHistory, goalProgress } from '../lib/finance.js'
import { money, moneyAbs, moneyOr } from '../lib/format.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

const TransactionRow = memo(function TransactionRow({ tx, first, onOpen, onMenu }) {
  const { c, fonts, text } = useTheme()
  const positive = Number(tx.amount) > 0

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tx.merchant}, ${positive ? 'income' : 'spend'} ${moneyAbs(tx.amount, 2)}`}
      onPress={() => onOpen(tx)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: c.line,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
          {tx.merchant}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          {[tx.category, formatDateShort(tx.occurred_on), tx.account].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.monoMedium,
          fontSize: text.body,
          color: positive ? c.success : c.foreground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {positive ? '+' : '−'}
        {moneyAbs(tx.amount, 2)}
      </Text>
      <RowMenuButton
        accessibilityLabel={`${tx.merchant}, more options`}
        onPress={() => onMenu(tx)}
      />
    </Pressable>
  )
})

const BudgetRow = memo(function BudgetRow({ budget, onOpen, onMenu }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${budget.category} budget`}
        onPress={() => onOpen(budget)}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 48,
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <ProgressBar label={budget.category} value={budget.spent} limit={budget.limit} tone="limit" />
      </Pressable>
      <RowMenuButton
        accessibilityLabel={`${budget.category} budget, more options`}
        onPress={() => onMenu(budget)}
      />
    </View>
  )
})

const DebtRow = memo(function DebtRow({ debt, first, hidden, onOpen, onMenu }) {
  const { c, fonts, text } = useTheme()
  const owing = debt.direction === 'i_owe'
  const due = debtDueLabel(debt)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${debt.counterparty}, ${DEBT_DIRECTION_LABELS[debt.direction]} ${moneyOr(debt.amount, hidden, 2)}`}
      onPress={() => onOpen(debt)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: c.line,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      {owing ? (
        <ArrowUpRight size={16} weight="bold" color={c.accentText} />
      ) : (
        <ArrowDownLeft size={16} weight="bold" color={c.mutedForeground} />
      )}
      <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
          {debt.counterparty}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          {[DEBT_DIRECTION_LABELS[debt.direction], due, debt.note].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.monoMedium,
          fontSize: text.body,
          color: owing ? c.accentText : c.foreground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {moneyOr(debt.amount, hidden, 2)}
      </Text>
      <RowMenuButton
        accessibilityLabel={`${debt.counterparty}, more options`}
        onPress={() => onMenu(debt)}
      />
    </Pressable>
  )
})

const SettledDebtRow = memo(function SettledDebtRow({ debt, first, hidden, onOpen, onMenu }) {
  const { c, fonts, text } = useTheme()
  const due = debtDueLabel(debt)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${debt.counterparty}, settled`}
      onPress={() => onOpen(debt)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: c.line,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      <Check size={16} weight="bold" color={c.mutedForeground} />
      <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.mutedForeground }}>
          {debt.counterparty}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          {[DEBT_DIRECTION_LABELS[debt.direction], due].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: text.caption,
          color: c.mutedForeground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {moneyOr(debt.amount, hidden, 2)}
      </Text>
      <RowMenuButton
        accessibilityLabel={`${debt.counterparty}, more options`}
        onPress={() => onMenu(debt)}
      />
    </Pressable>
  )
})

export default function Finances() {
  const { c, fonts, text } = useTheme()
  const {
    data,
    loading,
    error,
    reload,
    deleteTransaction,
    deleteBudget,
    deleteAccount,
    deleteDebt,
    settleDebt,
  } = useData()
  const router = useRouter()
  const { hidden, accountsHidden } = usePrivacy()
  const accountHidden = hidden || accountsHidden
  const [peek, setPeek] = useState(false)
  const accountsMasked = accountHidden && !peek
  const [activity, setActivity] = useState('recent')
  const [activityHidden, setActivityHidden] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [txRecord, setTxRecord] = useState(null)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [budgetRecord, setBudgetRecord] = useState(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountRecord, setAccountRecord] = useState(null)
  const [debtOpen, setDebtOpen] = useState(false)
  const [debtRecord, setDebtRecord] = useState(null)
  const [debtDirection, setDebtDirection] = useState('owed_to_me')
  const [adjust, setAdjust] = useState(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [goalRecord, setGoalRecord] = useState(null)
  const { open, sheet } = useRowActions()

  useFocusEffect(
    useCallback(() => {
      setPeek(false)
      return () => setPeek(false)
    }, []),
  )

  const togglePeek = useCallback(() => {
    Haptics.selectionAsync().catch(() => {})
    setPeek((value) => !value)
  }, [])

  const openNewTx = useCallback(() => {
    setTxRecord(null)
    setTxOpen(true)
  }, [])

  const openEditTx = useCallback((tx) => {
    setTxRecord(tx)
    setTxOpen(true)
  }, [])

  const openNewBudget = useCallback(() => {
    setBudgetRecord(null)
    setBudgetOpen(true)
  }, [])

  const openEditBudget = useCallback((row) => {
    setBudgetRecord({ id: row.id, category: row.category, limit_amount: row.limit })
    setBudgetOpen(true)
  }, [])

  const openEditAccount = useCallback((account) => {
    setAccountRecord(account)
    setAccountOpen(true)
  }, [])

  const openNewDebt = useCallback((direction = 'owed_to_me') => {
    setDebtRecord(null)
    setDebtDirection(direction)
    setDebtOpen(true)
  }, [])

  const openNewGoal = useCallback(() => {
    setGoalRecord(null)
    setGoalOpen(true)
  }, [])

  const openEditGoal = useCallback((goal) => {
    setGoalRecord(goal)
    setGoalOpen(true)
  }, [])

  const openAddMenu = useCallback(
    () =>
      open({
        title: 'Add to Money',
        subtitle: 'Choose what to record',
        actions: [
          { key: 'transaction', label: 'Income or expense', icon: Plus, onPress: openNewTx },
          { key: 'goal', label: 'Financial goal', icon: Plus, onPress: openNewGoal },
          { key: 'debt', label: 'Debt', icon: HandCoins, onPress: () => openNewDebt() },
        ],
      }),
    [open, openNewTx, openNewGoal, openNewDebt],
  )

  const openEditDebt = useCallback((debt) => {
    setDebtRecord(debt)
    setDebtOpen(true)
  }, [])

  const txActions = useCallback(
    (tx) =>
      open({
        title: tx.merchant,
        subtitle: `${tx.category} · ${formatDateShort(tx.occurred_on)}`,
        actions: [
          { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditTx(tx) },
          {
            key: 'delete',
            label: 'Delete',
            icon: Trash,
            destructive: true,
            onPress: () => confirmDelete(tx.merchant, () => deleteTransaction(tx.id).catch(reportError)),
          },
        ],
      }),
    [open, openEditTx, deleteTransaction],
  )

  const budgetActions = useCallback(
    (row) =>
      open({
        title: row.category,
        subtitle: 'Monthly budget',
        actions: [
          { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditBudget(row) },
          {
            key: 'delete',
            label: 'Delete',
            icon: Trash,
            destructive: true,
            onPress: () => confirmDelete(row.category, () => deleteBudget(row.id).catch(reportError)),
          },
        ],
      }),
    [open, openEditBudget, deleteBudget],
  )

  const accountActions = useCallback(
    (account) =>
      open({
        title: account.name,
        subtitle: `Balance ${moneyOr(account.balance, accountsMasked, 2)}`,
        actions: [
          {
            key: 'adjust',
            label: 'Adjust balance',
            icon: HandCoins,
            onPress: () => setAdjust({ account, mode: 'add' }),
          },
          { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditAccount(account) },
          {
            key: 'delete',
            label: 'Delete',
            icon: Trash,
            destructive: true,
            onPress: () => confirmDelete(account.name, () => deleteAccount(account.id).catch(reportError)),
          },
        ],
      }),
    [accountsMasked, open, openEditAccount, deleteAccount],
  )

  const setDebtSettled = useCallback(
    async (debt, settled) => {
      Haptics.selectionAsync().catch(() => {})
      try {
        await settleDebt(debt.id, settled)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      } catch (cause) {
        reportError(cause)
      }
    },
    [settleDebt],
  )

  const debtActions = useCallback(
    (debt) =>
      open({
        title: debt.counterparty,
        subtitle: `${DEBT_DIRECTION_LABELS[debt.direction]} · ${moneyOr(debt.amount, hidden, 2)}`,
        actions: [
          debt.settled
            ? {
                key: 'reopen',
                label: 'Mark as unsettled',
                icon: HandCoins,
                onPress: () => setDebtSettled(debt, false),
              }
            : {
                key: 'settle',
                label: 'Settle',
                icon: Check,
                onPress: () => setDebtSettled(debt, true),
              },
          { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditDebt(debt) },
          {
            key: 'delete',
            label: 'Delete',
            icon: Trash,
            destructive: true,
            onPress: () => confirmDelete(debt.counterparty, () => deleteDebt(debt.id).catch(reportError)),
          },
        ],
      }),
    [hidden, open, openEditDebt, setDebtSettled, deleteDebt],
  )

  const handleAccountAdjust = useCallback((row, mode) => setAdjust({ account: row, mode }), [])

  const derived = useMemo(() => {
    const { transactions: allTransactions, budgets, goals } = data
    const totals = totalsForMonth(allTransactions)
    const budgetRows = budgetProgress(budgets, allTransactions)
    const goalList = Array.isArray(goals) ? goals : []
    const goalProgressList = goalList.map((goal) => goalProgress(goal, allTransactions)).filter(Boolean)
    return {
      spend: totals.spend,
      income: totals.income,
      spendDelta: percentChange(totals.spend, totalsForPrevMonth(allTransactions).spend),
      budgetRows,
      budgetTotal: budgetRows.reduce((sum, row) => sum + row.limit, 0),
      accounts: accountRows(data),
      accountsTotal: totalInAccounts(data),
      score: financeScore(data),
      scoreHistory: financeScoreHistory(data),
      owedToMe: openDebts(data.debts).filter((debt) => debt.direction !== 'i_owe'),
      iOwe: openDebts(data.debts).filter((debt) => debt.direction === 'i_owe'),
      settled: settledDebts(data.debts),
      goalProgressList,
      goalList,
    }
  }, [data])

  const privacy = useMemo(() => ({ hidden, accountsHidden }), [hidden, accountsHidden])

  if (loading) {
    return (
      <Screen title="Money" subtitle="This month · all accounts">
        <Loading label="Loading finances" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Money" subtitle="This month · all accounts">
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const { transactions } = data
  const {
    income,
    spend,
    spendDelta,
    budgetRows,
    budgetTotal,
    accounts,
    accountsTotal,
    score,
    scoreHistory,
    owedToMe,
    iOwe,
    settled,
    goalProgressList,
  } = derived
  const remaining = budgetTotal - spend
  const net = income - spend
  const budgetWindow = budgetRows[0] || null
  const budgetDaysLeft = budgetWindow?.daysLeft ?? 0
  const budgetPeriodHint = !budgetWindow
    ? null
    : budgetDaysLeft === 0
      ? 'Ends today'
      : `Through ${formatDateShort(budgetWindow.endsOn)} · ${budgetDaysLeft} ${
          budgetDaysLeft === 1 ? 'day' : 'days'
        } left`
  const debtRows = [...owedToMe, ...iOwe]
  const accountsKey = accounts.map((account) => account.id).join('|')
  const activityKey =
    activity === 'recent'
      ? `recent:${transactions.map((tx) => tx.id).join(',')}`
      : `debts:${[...debtRows, ...settled]
          .map((debt) => `${debt.id}:${debt.settled ? 'settled' : 'open'}:${debt.amount}`)
          .join(',')}`

  return (
    <Screen
      title="Money"
      subtitle="This month · all accounts"
      right={
        <>
          {accountHidden && accounts.length ? (
            <IconButton
              icon={accountsMasked ? Eye : EyeSlash}
              accessibilityLabel={accountsMasked ? 'Show account balances' : 'Hide account balances'}
              accessibilityHint={
                accountsMasked
                  ? 'Reveals balances until you leave this screen'
                  : 'Hides account balances again'
              }
              onPress={togglePeek}
            />
          ) : null}
          <IconButton icon={Plus} accessibilityLabel="Add to money" onPress={openAddMenu} />
        </>
      }
    >
      <View style={{ flexDirection: 'row', gap: 16 }}>
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
              : 'No monthly budget set'
          }
        />
        <StatCard
          label="Net this month"
          value={money(net, 0)}
          hint={`${money(income, 0)} in · ${money(spend, 0)} out`}
        />
      </View>

      <Section title="Accounts">
        {accounts.length ? (
          <FadeSwap swapKey={accountsKey}>
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansSemiBold,
                    fontSize: text.micro,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: c.mutedForeground,
                  }}
                >
                  Total in accounts
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.monoSemiBold,
                    fontSize: text.heading,
                    color: c.foreground,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {moneyOr(accountsTotal, accountsMasked, 2)}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 4 }}
              >
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    hidden={accountsMasked}
                    onEdit={openEditAccount}
                    onAdjust={handleAccountAdjust}
                    onMenu={accountActions}
                  />
                ))}
              </ScrollView>
            </View>
          </FadeSwap>
        ) : (
          <Card>
            <EmptyState
              icon={Bank}
              title="No accounts yet"
              description="Add GCash, BDO or cash in Settings, then tag spending to it."
              action={
                <Button size="sm" variant="primary" onPress={() => router.push('/settings')}>
                  Add an account
                </Button>
              }
            />
          </Card>
        )}
      </Section>

      <FinanceScoreCard
        result={score}
        history={scoreHistory}
        privacy={privacy}
        expandable
      />

      <Section
        title="Financial goals"
        action={
          <Button size="sm" variant="ghost" onPress={openNewGoal}>
            Add
          </Button>
        }
      >
        <Card padded={goalProgressList.length > 0}>
          {goalProgressList.length ? (
            <View style={{ gap: 14 }}>
              {goalProgressList.map((gp) => (
                <Pressable
                  key={gp.goal.id}
                  accessibilityRole="button"
                  onPress={() => openEditGoal(gp.goal)}
                  style={({ pressed }) => ({
                    gap: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
                      {gp.goal.name || 'Goal'}
                    </Text>
                    <Text style={{ fontFamily: fonts.monoMedium, fontSize: text.body, color: c.foreground, fontVariant: ['tabular-nums'] }}>
                      {gp.progressPct}%
                    </Text>
                  </View>
                  <ProgressBar label="" value={gp.currentSaved} limit={gp.target} tone="limit" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                      Saved {money(gp.currentSaved, 0)} / {money(gp.target, 0)} · {money(gp.remaining, 0)} left
                    </Text>
                    {gp.daysRemaining != null ? (
                      <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                        {gp.daysRemaining > 0 ? `${gp.daysRemaining} days left` : 'Due date passed'}
                      </Text>
                    ) : null}
                    {gp.onTrack === true ? (
                      <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.success }}>On track</Text>
                    ) : gp.onTrack === false ? (
                      <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.accentText }}>Off track</Text>
                    ) : null}
                  </View>
                  {gp.guidance?.length ? (
                    <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                      {gp.guidance[0]}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No financial goals yet"
              description="Set a target amount and due date to track progress using your income and expenses."
              action={
                <Button size="sm" variant="primary" onPress={openNewGoal}>
                  Add a goal
                </Button>
              }
            />
          )}
        </Card>
      </Section>

      <Section
        title="Budget"
        action={
          <Button size="sm" variant="ghost" onPress={openNewBudget}>
            Add
          </Button>
        }
      >
        <Card padded={budgetRows.length > 0}>
          {budgetRows.length ? (
            <View style={{ gap: 14 }}>
              <Text
                style={{
                  fontFamily: fonts.mono,
                  fontSize: text.micro,
                  color: c.mutedForeground,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {budgetPeriodHint}
              </Text>
              {budgetRows.map((budget) => (
                <BudgetRow
                  key={budget.id}
                  budget={budget}
                  onOpen={openEditBudget}
                  onMenu={budgetActions}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No budgets yet"
              description="Add a monthly limit per category to see where you stand."
              action={
                <Button size="sm" variant="primary" onPress={openNewBudget}>
                  Add a budget
                </Button>
              }
            />
          )}
        </Card>
      </Section>

      <Section
        title="Activity"
        action={
          <Button size="sm" variant="ghost" onPress={() => setActivityHidden((value) => !value)}>
            {activityHidden ? 'Show' : 'Hide'}
          </Button>
        }
      >
        {activityHidden ? null : (
          <>
            <SegmentedControl
              accessibilityLabel="Money activity"
              value={activity}
              onChange={setActivity}
              options={[
                { key: 'recent', label: 'Recent', count: transactions.length },
                { key: 'debts', label: 'Debts', count: debtRows.length + settled.length },
              ]}
            />
            <FadeSwap swapKey={activityKey}>
              {activity === 'recent' ? (
                <Card padded={!transactions.length}>
                  {transactions.length ? (
                    <ScrollView
                      style={{ maxHeight: 360 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      accessibilityLabel="Recent transactions"
                    >
                      {transactions.map((tx, index) => (
                        <TransactionRow
                          key={tx.id}
                          tx={tx}
                          first={index === 0}
                          onOpen={openEditTx}
                          onMenu={txActions}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <EmptyState
                      title="No transactions yet"
                      description="Log income and spending to build your monthly picture."
                      action={
                        <Button size="sm" variant="primary" onPress={openNewTx}>
                          Add a transaction
                        </Button>
                      }
                    />
                  )}
                </Card>
              ) : (
                <Card padded={!debtRows.length && !settled.length}>
                  {debtRows.length || settled.length ? (
                    <ScrollView
                      style={{ maxHeight: 360 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      accessibilityLabel="Debts"
                    >
                      {debtRows.length
                        ? debtRows.map((debt, index) => (
                            <DebtRow
                              key={debt.id}
                              debt={debt}
                              first={index === 0}
                              hidden={hidden}
                              onOpen={openEditDebt}
                              onMenu={debtActions}
                            />
                          ))
                        : null}
                      {settled.length ? (
                        <>
                          <View
                            style={{
                              borderTopWidth: debtRows.length ? StyleSheet.hairlineWidth : 0,
                              borderTopColor: c.line,
                              paddingHorizontal: 16,
                              paddingTop: 12,
                              paddingBottom: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: fonts.sansSemiBold,
                                fontSize: text.micro,
                                letterSpacing: 0.6,
                                textTransform: 'uppercase',
                                color: c.mutedForeground,
                              }}
                            >
                              Settled
                            </Text>
                          </View>
                          {settled.map((debt, index) => (
                            <SettledDebtRow
                              key={debt.id}
                              debt={debt}
                              first={index === 0}
                              hidden={hidden}
                              onOpen={openEditDebt}
                              onMenu={debtActions}
                            />
                          ))}
                        </>
                      ) : null}
                    </ScrollView>
                  ) : (
                    <EmptyState
                      icon={HandCoins}
                      title="No debts tracked"
                      description="Use the + button to add who owes you, or what you owe."
                    />
                  )}
                </Card>
              )}
            </FadeSwap>
          </>
        )}
      </Section>

      <TxForm
        visible={txOpen}
        record={txRecord}
        onClose={() => {
          setTxOpen(false)
          setTxRecord(null)
        }}
      />
      <BudgetForm
        visible={budgetOpen}
        record={budgetRecord}
        onClose={() => {
          setBudgetOpen(false)
          setBudgetRecord(null)
        }}
      />
      <AccountForm
        visible={accountOpen}
        record={accountRecord}
        onClose={() => {
          setAccountOpen(false)
          setAccountRecord(null)
        }}
      />
      <DebtForm
        visible={debtOpen}
        record={debtRecord}
        defaultDirection={debtDirection}
        onClose={() => {
          setDebtOpen(false)
          setDebtRecord(null)
        }}
      />
      <AdjustAccountSheet
        visible={Boolean(adjust)}
        account={adjust?.account}
        mode={adjust?.mode}
        onClose={() => setAdjust(null)}
      />
      <GoalForm
        visible={goalOpen}
        record={goalRecord}
        onClose={() => {
          setGoalOpen(false)
          setGoalRecord(null)
        }}
      />
      {sheet}
    </Screen>
  )
}
