/*
 * Pure account and debt derivations. No React, no network.
 *
 * An account's live balance is its stored opening balance plus the signed amounts of
 * the transactions tagged to it, so logging spending against an account moves it down
 * and logging income moves it up. Nothing is auto-derived from untagged spending.
 */

import { formatDateShort, toISODate } from './analytics.js'

function sorted(rows) {
  return [...(rows || [])].sort((a, b) => {
    const byPosition = (Number(a.position) || 0) - (Number(b.position) || 0)
    if (byPosition !== 0) return byPosition
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
}

export function accountsFor(data) {
  return sorted(data?.accounts)
}

/** Signed net of every transaction tagged to an account. */
export function taggedNet(transactions, accountId) {
  if (!accountId) return 0
  let net = 0
  for (const tx of transactions || []) {
    if (tx.account_id !== accountId) continue
    net += Number(tx.amount) || 0
  }
  return net
}

/** Income and spending tagged to an account in the month containing `ref`. */
export function taggedMonthTotals(transactions, accountId, ref = new Date()) {
  const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
  let income = 0
  let spend = 0
  for (const tx of transactions || []) {
    if (tx.account_id !== accountId) continue
    if (String(tx.occurred_on || '').slice(0, 7) !== key) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) income += amount
    else spend += Math.abs(amount)
  }
  return { income, spend }
}

/** Opening balance plus the net of everything tagged to the account. */
export function accountBalance(account, transactions) {
  if (!account) return 0
  return (Number(account.opening_balance) || 0) + taggedNet(transactions, account.id)
}

/** Every account with its live balance and this month's tagged income. */
export function accountRows(data, ref = new Date()) {
  const transactions = data?.transactions || []
  return accountsFor(data).map((account) => {
    const totals = taggedMonthTotals(transactions, account.id, ref)
    return {
      ...account,
      balance: accountBalance(account, transactions),
      income: totals.income,
      spend: totals.spend,
    }
  })
}

export function totalInAccounts(data, ref = new Date()) {
  return accountRows(data, ref).reduce((sum, account) => sum + account.balance, 0)
}

/* ------------------------------------------------------------------ */
/* Debts                                                               */
/* ------------------------------------------------------------------ */

export function openDebts(debts) {
  return (debts || [])
    .filter((debt) => !debt.settled)
    .sort((a, b) => {
      const aDue = a.due_date || '9999-12-31'
      const bDue = b.due_date || '9999-12-31'
      if (aDue !== bDue) return aDue < bDue ? -1 : 1
      return String(a.counterparty || '').localeCompare(String(b.counterparty || ''))
    })
}

export function settledDebts(debts) {
  return (debts || [])
    .filter((debt) => debt.settled)
    .sort((a, b) => String(b.settled_at || b.updated_at || '').localeCompare(String(a.settled_at || a.updated_at || '')))
}

export function debtTotals(debts) {
  let owedToMe = 0
  let iOwe = 0
  for (const debt of debts || []) {
    if (debt.settled) continue
    const amount = Number(debt.amount) || 0
    if (debt.direction === 'i_owe') iOwe += amount
    else owedToMe += amount
  }
  return { owedToMe, iOwe }
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

/**
 * Validate one payment against an open debt. The caller decides where to write the
 * result; this helper only states the remaining balance, whether the debt is settled,
 * and the signed change to the account holding the money.
 */
export function settlementFor(debt, amount) {
  const payment = Number(amount)
  if (!Number.isFinite(payment) || payment <= 0) return { ok: false, code: 'amount' }
  if (!debt || debt.settled) return { ok: false, code: 'closed' }
  const outstanding = roundMoney(debt.amount)
  if (!Number.isFinite(outstanding) || outstanding <= 0) return { ok: false, code: 'closed' }
  const paid = roundMoney(payment)
  const remaining = roundMoney(outstanding - paid)
  if (remaining < 0) return { ok: false, code: 'overpay', outstanding }
  return {
    ok: true,
    payment: paid,
    outstanding,
    remaining,
    settled: remaining === 0,
    delta: debt.direction === 'i_owe' ? -paid : paid,
  }
}

/** A short due-date label, flagging anything already past. */
export function debtDueLabel(debt, ref = new Date()) {
  if (!debt?.due_date) return null
  const overdue = debt.due_date < toISODate(ref)
  return overdue ? `Overdue · ${formatDateShort(debt.due_date)}` : `Due ${formatDateShort(debt.due_date)}`
}
