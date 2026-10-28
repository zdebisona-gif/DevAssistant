import { useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { ArrowsLeftRight, Bank, CalendarBlank, CaretLeft, ChartLineUp, CurrencyCircleDollar, HandCoins, Notebook, PaperPlaneRight, PencilSimple, Scales, SquaresFour, Wallet } from '../../icons.js'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import ActionConfirm from './ActionConfirm.jsx'
import Button from '../ui/Button.jsx'
import Chip from '../ui/Chip.jsx'
import Reveal from '../ui/Reveal.jsx'
import { runAction, withCategory } from '../../lib/actions.js'
import {
  SHORTCUTS,
  buildShortcutProposal,
  findShortcut,
  matchShortcut,
  shortcutAnswerLabel,
  shortcutOptions,
  validateShortcutAnswer,
} from '../../lib/shortcuts.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const SHORTCUT_ICONS = {
  expense: Wallet,
  income: CurrencyCircleDollar,
  transfer: ArrowsLeftRight,
  debt: HandCoins,
  settle: Scales,
  budget: ChartLineUp,
  reminder: CalendarBlank,
  note: Notebook,
  balance: Bank,
}

/*
 * Structured entry for common actions. It only *collects* field values; proposals
 * and writes go through buildProposal()/runAction(), the same path as chat mode.
 */
export default function ShortcutPanel({
  services,
  initialShortcut,
  bottomInset = 10,
  onExit,
}) {
  const { c, fonts, radius, text } = useTheme()
  const reduced = useReducedMotion()
  const { data } = services
  const [shortcutId, setShortcutId] = useState(() => findShortcut(initialShortcut)?.id ?? null)
  const [answers, setAnswers] = useState({})
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)
  const [proposal, setProposal] = useState(null)
  const [buildError, setBuildError] = useState(null)
  const [actionState, setActionState] = useState('idle')
  const [actionError, setActionError] = useState(null)
  const scrollRef = useRef(null)
  const previousStep = useRef(0)

  const shortcut = useMemo(() => findShortcut(shortcutId), [shortcutId])
  const fields = shortcut?.fields ?? []
  const field = fields[stepIndex] ?? null
  const locked = actionState === 'done' || actionState === 'cancelled'
  const reviewing = Boolean(proposal) || Boolean(buildError)

  useEffect(() => {
    previousStep.current = 0
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    })
    return () => cancelAnimationFrame(frame)
  }, [shortcutId])

  useEffect(() => {
    const previous = previousStep.current
    previousStep.current = stepIndex
    const frame = requestAnimationFrame(() => {
      if (stepIndex > previous) scrollRef.current?.scrollToEnd({ animated: !reduced })
      else if (stepIndex < previous) scrollRef.current?.scrollTo({ y: 0, animated: !reduced })
    })
    return () => cancelAnimationFrame(frame)
  }, [reduced, stepIndex])

  useEffect(() => {
    if (!reviewing) return undefined
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: !reduced })
    })
    return () => cancelAnimationFrame(frame)
  }, [reduced, reviewing])

  const reset = () => {
    Keyboard.dismiss()
    setShortcutId(null)
    setAnswers({})
    setStepIndex(0)
    setDraft('')
    setError(null)
    setProposal(null)
    setBuildError(null)
    setActionState('idle')
    setActionError(null)
  }

  const start = (next) => {
    Keyboard.dismiss()
    setShortcutId(next.id)
    setAnswers({})
    setStepIndex(0)
    setDraft('')
    setError(null)
    setProposal(null)
    setBuildError(null)
    setActionState('idle')
    setActionError(null)
  }

  const finish = (nextAnswers) => {
    const built = buildShortcutProposal(shortcut, nextAnswers, data)
    setError(null)
    if (!built.ok) {
      const index = built.fieldKey
        ? fields.findIndex((entry) => entry.key === built.fieldKey)
        : -1
      setBuildError({
        message: built.error,
        index: index >= 0 ? index : Math.max(fields.length - 1, 0),
      })
      setProposal(null)
      return
    }
    setBuildError(null)
    setProposal(built.proposal)
  }

  const advance = (nextAnswers, from) => {
    const after = fields.findIndex(
      (entry, index) => index > from && nextAnswers[entry.key] === undefined,
    )
    if (after !== -1) {
      setStepIndex(after)
      return
    }
    const remaining = fields.findIndex((entry) => nextAnswers[entry.key] === undefined)
    if (remaining !== -1) {
      setStepIndex(remaining)
      return
    }
    finish(nextAnswers)
  }

  const commit = (raw) => {
    if (!field || locked) return
    if (field.kind === 'choice') Keyboard.dismiss()
    const result = validateShortcutAnswer(field, raw, data, answers)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const nextAnswers = { ...answers, [field.key]: result.value }
    setAnswers(nextAnswers)
    setDraft('')
    setError(null)
    setBuildError(null)
    advance(nextAnswers, stepIndex)
  }

  const submitDraft = () => {
    const value = draft.trim()
    if (!value) return
    if (!shortcut) {
      const found = matchShortcut(value)
      if (!found) {
        setError('I don’t have that shortcut. Pick one below, or try “income” or “expense”.')
        return
      }
      start(found)
      return
    }
    if (!field || !['text', 'money', 'date'].includes(field.kind)) return
    commit(value)
  }

  const draftFor = (index) => {
    const entry = fields[index]
    if (!entry || !['text', 'money', 'date'].includes(entry.kind)) return ''
    const value = answers[entry.key]
    return value === undefined || value === null ? '' : String(value)
  }

  const editField = (index) => {
    if (locked) return
    setStepIndex(index)
    setDraft(draftFor(index))
    setError(null)
  }

  const goBack = () => {
    if (locked) return
    for (let index = stepIndex - 1; index >= 0; index -= 1) {
      if (answers[fields[index].key] !== undefined) {
        setStepIndex(index)
        setDraft(draftFor(index))
        setError(null)
        return
      }
    }
    reset()
  }

  const confirmProposal = async (category) => {
    if (!proposal) return
    const next = category ? withCategory(proposal, category) : proposal
    if (category) setProposal(next)
    setActionState('running')
    setActionError(null)
    try {
      await runAction(services, next)
      setActionState('done')
    } catch (cause) {
      setActionState('error')
      setActionError(cause?.message || 'Could not save the change.')
    }
  }

  const answered = fields
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry, index }) => index !== stepIndex && answers[entry.key] !== undefined)

  const showComposer =
    !locked &&
    !reviewing &&
    (!shortcut || ['text', 'money', 'date'].includes(field?.kind ?? ''))

  const canSend = draft.trim().length > 0
  const composerPlaceholder = !shortcut
    ? 'Type a shortcut — income, expense, budget…'
    : field?.placeholder || 'Type your answer'

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 18, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {shortcut ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to shortcuts"
                onPress={goBack}
                hitSlop={4}
                style={{ minHeight: 32, justifyContent: 'center', paddingRight: 2 }}
              >
                <CaretLeft size={16} weight="bold" color={c.mutedForeground} />
              </Pressable>
            ) : (
              <SquaresFour size={16} weight="duotone" color={c.primary} />
            )}
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.monoSemiBold,
                fontSize: text.caption,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: c.foreground,
              }}
            >
              {shortcut ? shortcut.label : 'Shortcut mode'}
            </Text>
            {shortcut ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel this shortcut"
                onPress={reset}
                hitSlop={4}
                style={{ minHeight: 32, justifyContent: 'center' }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: text.caption,
                    color: c.mutedForeground,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            ) : (
              <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                {SHORTCUTS.length} actions
              </Text>
            )}
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: text.label, lineHeight: 20, color: c.mutedForeground }}>
            {shortcut
              ? `Step ${Math.min(stepIndex + 1, fields.length)} of ${fields.length}. Nothing is saved until you confirm.`
              : 'Pick a shortcut and I’ll ask for one thing at a time. This path does not guess.'}
          </Text>
          {shortcut ? (
            <View style={{ flexDirection: 'row', gap: 4, paddingTop: 2 }}>
              {fields.map((entry, index) => {
                const complete = answers[entry.key] !== undefined || reviewing
                const current = index === stepIndex && !reviewing
                return (
                  <View
                    key={entry.key}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: complete || current ? c.primary : c.line,
                      opacity: current && !complete ? 0.5 : 1,
                    }}
                  />
                )
              })}
            </View>
          ) : null}
        </View>

        {!shortcut ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SHORTCUTS.map((entry, index) => {
              const Icon = SHORTCUT_ICONS[entry.id] || SquaresFour
              return (
                <Reveal key={entry.id} delay={index * 25} distance={4} style={{ flexGrow: 1, minWidth: 148 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.label}: ${entry.hint}`}
                    onPress={() => start(entry)}
                    style={({ pressed }) => ({
                      gap: 7,
                      padding: 14,
                      borderRadius: radius.lg,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: c.border,
                      backgroundColor: c.card,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: radius.pill,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: c.primarySoft,
                      }}
                    >
                      <Icon size={16} weight="duotone" color={c.primary} />
                    </View>
                    <Text
                      style={{ fontFamily: fonts.sansSemiBold, fontSize: text.label, color: c.foreground }}
                    >
                      {entry.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: text.micro,
                        lineHeight: 16,
                        color: c.mutedForeground,
                      }}
                    >
                      {entry.hint}
                    </Text>
                  </Pressable>
                </Reveal>
              )
            })}
          </View>
        ) : null}

        {shortcut && !reviewing ? (
          <View style={{ gap: 14 }}>
            {answered.length ? (
              <View style={{ gap: 12 }}>
                {answered.map(({ entry, index }) => (
                  <View key={entry.key} style={{ gap: 5 }}>
                    <Text
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: text.micro,
                        color: c.mutedForeground,
                      }}
                    >
                      {entry.question}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Change ${entry.question} ${shortcutAnswerLabel(entry, answers[entry.key], data)}`}
                        disabled={locked}
                        onPress={() => editField(index)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          maxWidth: '85%',
                          borderRadius: radius.lg,
                          borderBottomRightRadius: radius.sm,
                          backgroundColor: c.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Text
                          style={{
                            flexShrink: 1,
                            fontFamily: fonts.sans,
                            fontSize: text.body,
                            color: c.onPrimary,
                          }}
                        >
                          {shortcutAnswerLabel(entry, answers[entry.key], data)}
                        </Text>
                        <PencilSimple size={11} weight="bold" color={c.onPrimary} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Reveal key={`${shortcut.id}-${stepIndex}`} distance={5} style={{ gap: 10 }}>
              <Text
                accessibilityLiveRegion="polite"
                style={{ fontFamily: fonts.sansSemiBold, fontSize: text.heading, color: c.foreground }}
              >
                {field?.question}
              </Text>

              {field?.kind === 'choice' ? (
                shortcutOptions(field, data, answers).length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {shortcutOptions(field, data, answers).map((option) => (
                      <Chip
                        key={option.value}
                        active={answers[field.key] === option.value}
                        onPress={() => commit(option.value)}
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: text.caption,
                      lineHeight: 18,
                      color: c.mutedForeground,
                    }}
                  >
                    {field.empty || 'There is nothing to choose from yet.'}
                  </Text>
                )
              ) : null}

              {field?.kind === 'date' && !reviewing ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {shortcutOptions(field, data, answers).map((option) => (
                    <Chip
                      key={option.value}
                      active={
                        answers[field.key] === option.value ||
                        (field.optional && option.value === 'none' && answers[field.key] === null)
                      }
                      onPress={() => commit(option.value)}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </View>
              ) : null}

              {field?.suggestions ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {field.suggestions(data).slice(0, 6).map((suggestion) => (
                    <Chip key={suggestion} onPress={() => commit(suggestion)}>
                      {suggestion}
                    </Chip>
                  ))}
                </View>
              ) : null}

              {field && field.optional && (field.kind === 'text' || field.kind === 'money') ? (
                <View style={{ flexDirection: 'row' }}>
                  <Button variant="ghost" size="sm" onPress={() => commit('')}>
                    Skip
                  </Button>
                </View>
              ) : null}
            </Reveal>
          </View>
        ) : null}

        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.destructive }}
          >
            {error}
          </Text>
        ) : null}

        {reviewing && shortcut ? (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 10 }}>
              {fields.map((entry, index) => (
                <View key={entry.key} style={{ gap: 4 }}>
                  <Text
                    style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
                  >
                    {entry.question}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Change ${entry.question}`}
                    disabled={locked}
                    onPress={() => {
                      setProposal(null)
                      setBuildError(null)
                      editField(index)
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      alignSelf: 'flex-start',
                      borderRadius: radius.md,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: c.border,
                      backgroundColor: c.card,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: text.caption,
                        color: c.foreground,
                      }}
                    >
                      {shortcutAnswerLabel(entry, answers[entry.key], data)}
                    </Text>
                    {!locked ? <PencilSimple size={11} weight="bold" color={c.mutedForeground} /> : null}
                  </Pressable>
                </View>
              ))}
            </View>

            {buildError ? (
              <View
                style={{
                  gap: 8,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: c.destructive,
                  borderRadius: radius.md,
                  padding: 12,
                }}
              >
                <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.destructive }}>
                  {buildError.message}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      const index = buildError.index
                      setBuildError(null)
                      editField(index)
                    }}
                  >
                    Fix answers
                  </Button>
                  <Button variant="ghost" size="sm" onPress={reset}>
                    Start over
                  </Button>
                </View>
              </View>
            ) : null}

            {proposal ? (
              <Reveal distance={6}>
                <ActionConfirm
                  proposal={proposal}
                  state={actionState}
                  error={actionError}
                  onConfirm={confirmProposal}
                  onCancel={() => setActionState('cancelled')}
                />
              </Reveal>
            ) : null}

            {locked ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="secondary" onPress={reset} style={{ flex: 1 }}>
                  New shortcut
                </Button>
                {onExit ? (
                  <Button variant="ghost" onPress={onExit} style={{ flex: 1 }}>
                    Back to chat
                  </Button>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {showComposer ? (
        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.line,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(bottomInset, 10),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={draft}
              onChangeText={(value) => {
                setDraft(value)
                if (error) setError(null)
              }}
              onSubmitEditing={submitDraft}
              returnKeyType="send"
              accessibilityLabel={composerPlaceholder}
              placeholder={composerPlaceholder}
              placeholderTextColor={c.mutedForeground}
              keyboardType={field?.kind === 'money' ? 'decimal-pad' : 'default'}
              style={{
                flex: 1,
                minHeight: 48,
                maxHeight: 120,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: error ? c.destructive : c.border,
                backgroundColor: c.card,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontFamily: fonts.sans,
                fontSize: text.body,
                color: c.foreground,
              }}
            />
            <Button
              variant="primary"
              size="icon"
              icon={PaperPlaneRight}
              accessibilityLabel={shortcut ? 'Submit answer' : 'Start shortcut'}
              disabled={!canSend}
              onPress={submitDraft}
            />
          </View>
        </View>
      ) : null}
    </View>
  )
}
