import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bank,
  Check,
  HandCoins,
  PencilSimple,
  Plus,
  Trash,
} from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import HideToggle from '../components/ui/HideToggle.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import AccountCard from '../components/ui/AccountCard.jsx'
import FinanceScoreCard from '../components/finance/FinanceScoreCard.jsx'
import AccountForm from '../components/forms/AccountForm.jsx'
import AdjustAccountSheet from '../components/forms/AdjustAccountSheet.jsx'
import BudgetForm from '../components/forms/BudgetForm.jsx'
import DebtForm from '../components/forms/DebtForm.jsx'
import TxForm from '../components/forms/TxForm.jsx'
import Screen from '../components/layout/Screen.jsx'
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
import { financeScore, financeScoreHistory } from '../lib/finance.js'
import { money, moneyAbs, moneyOr } from '../lib/format.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

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
  const { hidden, accountsHidden } = usePrivacy()
  const accountHidden = hidden || accountsHidden
  const [expanded, setExpanded] = useState(false)
  const [settledOpen, setSettledOpen] = useState(false)
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
  const { open, sheet } = useRowActions()

  const openNewTx = () => {
    setTxRecord(null)
    setTxOpen(true)
  }

  const openEditTx = (tx) => {
    setTxRecord(tx)
    setTxOpen(true)
  }

  const openNewBudget = () => {
    setBudgetRecord(null)
    setBudgetOpen(true)
  }

  const openEditBudget = (row) => {
    setBudgetRecord({ id: row.id, category: row.category, limit_amount: row.limit })
    setBudgetOpen(true)
  }

  const openNewAccount = () => {
    setAccountRecord(null)
    setAccountOpen(true)
  }

  const openEditAccount = (account) => {
    setAccountRecord(account)
    setAccountOpen(true)
  }

  const openNewDebt = (direction = 'owed_to_me') => {
    setDebtRecord(null)
    setDebtDirection(direction)
    setDebtOpen(true)
  }

  const openEditDebt = (debt) => {
    setDebtRecord(debt)
    setDebtOpen(true)
  }

  const txActions = (tx) =>
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
    })

  const budgetActions = (row) =>
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
    })

  const accountActions = (account) =>
    open({
      title: account.name,
      subtitle: `Balance ${moneyOr(account.balance, accountHidden, 2)}`,
      actions: [
        { key: 'adjust', label: 'Adjust balance', icon: HandCoins, onPress: () => setAdjust({ account, mode: 'add' }) },
        { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditAccount(account) },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () =>
            confirmDelete(account.name, () => deleteAccount(account.id).catch(reportError)),
        },
      ],
    })

  const debtActions = (debt) =>
    open({
      title: debt.counterparty,
      subtitle: `${DEBT_DIRECTION_LABELS[debt.direction]} · ${moneyOr(debt.amount, hidden, 2)}`,
      actions: [
        debt.settled
          ? {
              key: 'reopen',
              label: 'Mark as unsettled',
              icon: HandCoins,
              onPress: () => settleDebt(debt.id, false).catch(reportError),
            }
          : {
              key: 'settle',
              label: 'Settle',
              icon: Check,
              onPress: () => settleDebt(debt.id, true).catch(reportError),
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
    })

  if (loading) {
    return (
      <Screen title="Money" subtitle="This month">
        <Loading label="Loading finances" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Money" subtitle="This month">
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const { transactions, budgets } = data
  const { income, spend } = totalsForMonth(transactions)
  const spendDelta = percentChange(spend, totalsForPrevMonth(transactions).spend)
  const budgetRows = budgetProgress(budgets, transactions)
  const budgetTotal = budgetRows.reduce((sum, row) => sum + row.limit, 0)
  const remaining = budgetTotal - spend
  const list = expanded ? transactions : transactions.slice(0, 5)
  const net = income - spend
  const accounts = accountRows(data)
  const accountsTotal = totalInAccounts(data)
  const score = financeScore(data)
  const scoreHistory = financeScoreHistory(data)
  const owedToMe = openDebts(data.debts).filter((debt) => debt.direction !== 'i_owe')
  const iOwe = openDebts(data.debts).filter((debt) => debt.direction === 'i_owe')
  const settled = settledDebts(data.debts)
  const debtRows = [...owedToMe, ...iOwe]

  const renderDebt = (debt, index) => {
    const owing = debt.direction === 'i_owe'
    const due = debtDueLabel(debt)
    return (
      <Pressable
        key={debt.id}
        accessibilityRole="button"
        accessibilityLabel={`${debt.counterparty}, ${DEBT_DIRECTION_LABELS[debt.direction]} ${moneyOr(debt.amount, hidden, 2)}`}
        onPress={() => openEditDebt(debt)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingLeft: 16,
          paddingRight: 8,
          paddingVertical: 12,
          borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
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
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
          >
            {debt.counterparty}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
          >
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
          onPress={() => debtActions(debt)}
        />
      </Pressable>
    )
  }

  return (
    <Screen title="Money" subtitle="This month · all accounts" right={<HideToggle />}>
      <Section
        title="Accounts"
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <HideToggle scope="accounts" />
            <Button size="sm" variant="ghost" onPress={openNewAccount}>
              Add
            </Button>
          </View>
        }
      >
        {accounts.length ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
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
                {moneyOr(accountsTotal, accountHidden, 2)}
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
                  hidden={accountHidden}
                  onEdit={openEditAccount}
                  onAdjust={(row, mode) => setAdjust({ account: row, mode })}
                  onMenu={accountActions}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <Card>
            <EmptyState
              icon={Bank}
              title="No accounts yet"
              description="Add GCash, BDO or cash and tag your spending to it — balances move on their own."
              action={
                <Button size="sm" variant="primary" onPress={openNewAccount}>
                  Add an account
                </Button>
              }
            />
          </Card>
        )}
      </Section>

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
              : 'Set a budget below'
          }
        />
        <StatCard
          label="Net this month"
          value={money(net, 0)}
          hint={`${money(income, 0)} in · ${money(spend, 0)} out`}
        />
      </View>

      <FinanceScoreCard
        result={score}
        history={scoreHistory}
        privacy={{ hidden, accountsHidden }}
      />

      <Button variant="primary" icon={Plus} onPress={openNewTx}>
        Add transaction
      </Button>

      <Section
        title="Debts"
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {debtRows.length ? (
              <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                {moneyOr(owedToMe.reduce((sum, d) => sum + Number(d.amount), 0), hidden, 0)} in ·{' '}
                {moneyOr(iOwe.reduce((sum, d) => sum + Number(d.amount), 0), hidden, 0)} out
              </Text>
            ) : null}
            <Button size="sm" variant="ghost" onPress={() => openNewDebt('owed_to_me')}>
              Add
            </Button>
          </View>
        }
      >
        <Card padded={!debtRows.length && !settled.length}>
          {debtRows.length ? (
            debtRows.map((debt, index) => renderDebt(debt, index))
          ) : (
            <EmptyState
              icon={HandCoins}
              title="No debts tracked"
              description="Log who owes you, or what you owe, and settle it in a tap."
              action={
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button size="sm" variant="primary" onPress={() => openNewDebt('owed_to_me')}>
                    Owes me
                  </Button>
                  <Button size="sm" variant="secondary" onPress={() => openNewDebt('i_owe')}>
                    I owe
                  </Button>
                </View>
              }
            />
          )}
          {settled.length ? (
            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${settled.length} settled debts`}
                onPress={() => setSettledOpen((value) => !value)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: pressed ? c.overline : 'transparent',
                })}
              >
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
                  {settled.length} settled
                </Text>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
                  {settledOpen ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
              {settledOpen
                ? settled.map((debt, index) => {
                    const due = debtDueLabel(debt)
                    return (
                      <Pressable
                        key={debt.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${debt.counterparty}, settled`}
                        onPress={() => openEditDebt(debt)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          paddingLeft: 16,
                          paddingRight: 8,
                          paddingVertical: 12,
                          borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                          borderTopColor: c.line,
                          backgroundColor: pressed ? c.overline : 'transparent',
                        })}
                      >
                        <Check size={16} weight="bold" color={c.mutedForeground} />
                        <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
                          <Text
                            numberOfLines={1}
                            style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.mutedForeground }}
                          >
                            {debt.counterparty}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
                          >
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
                          onPress={() => debtActions(debt)}
                        />
                      </Pressable>
                    )
                  })
                : null}
            </View>
          ) : null}
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
              {budgetRows.map((budget) => (
                <View key={budget.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${budget.category} budget`}
                    onPress={() => openEditBudget(budget)}
                    style={{ flex: 1 }}
                  >
                    <ProgressBar label={budget.category} value={budget.spent} limit={budget.limit} />
                  </Pressable>
                  <RowMenuButton
                    accessibilityLabel={`${budget.category} budget, more options`}
                    onPress={() => budgetActions(budget)}
                  />
                </View>
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
        title="Transactions"
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {transactions.length > 5 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpanded((value) => !value)}
                hitSlop={16}
              >
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
                  {expanded ? 'Show less' : `All ${transactions.length}`}
                </Text>
              </Pressable>
            ) : null}
            <Button size="sm" variant="ghost" onPress={openNewTx}>
              Add
            </Button>
          </View>
        }
      >
        <Card padded={!list.length}>
          {list.length ? (
            list.map((tx, index) => {
              const positive = Number(tx.amount) > 0
              return (
                <Pressable
                  key={tx.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${tx.merchant}`}
                  onPress={() => openEditTx(tx)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingLeft: 16,
                    paddingRight: 8,
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: c.line,
                    backgroundColor: pressed ? c.overline : 'transparent',
                  })}
                >
                  <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
                    >
                      {tx.merchant}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
                    >
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
                    onPress={() => txActions(tx)}
                  />
                </Pressable>
              )
            })
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
      {sheet}
    </Screen>
  )
}
