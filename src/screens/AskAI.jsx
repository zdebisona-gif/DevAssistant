import { useLocalSearchParams } from 'expo-router'
import { PaperPlaneRight, Sparkle } from '../icons.js'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Screen from '../components/layout/Screen.jsx'
import ActionConfirm from '../components/assistant/ActionConfirm.jsx'
import PlanWithAi from '../components/assistant/PlanWithAi.jsx'
import Button from '../components/ui/Button.jsx'
import Chip from '../components/ui/Chip.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import NoteForm from '../components/forms/NoteForm.jsx'
import { useData } from '../data/store.jsx'
import { useAiPrefs } from '../data/aiPrefs.jsx'
import { usePrivacy } from '../data/privacy.jsx'
import { answerQuery, deriveSuggestions } from '../lib/ask.js'
import { buildActionContext, buildExtractedProposal, looksLikeCommand, parseLocalAction, runAction } from '../lib/actions.js'
import { loadAskHistory, pushAskHistory } from '../lib/askHistory.js'
import { buildContextFor } from '../lib/context.js'
import { askGemini, describeGeminiError, extractAction, generateNote, inCooldown } from '../lib/gemini.js'
import { classifyIntent } from '../lib/intent.js'
import { extractNotePrompt, NOTE_DRAFT_NOTICE } from '../lib/noteDraft.js'
import { inferScope, looksLikePlanRequest } from '../lib/planWithAi.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

function fallbackNote(error) {
  return `${describeGeminiError(error)} Showing the on-device answer.`
}

function AssistantMessage({ message, onFollowUp }) {
  const { c, fonts, radius, text } = useTheme()
  const { answer, breakdown, insight, followUps, label } = message
  const isAi = Boolean(label?.startsWith('AI'))
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Sparkle size={16} weight="duotone" color={c.primaryFg} />
        <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: text.caption, color: c.foreground }}>
          Zen-I
        </Text>
        {label ? (
          <View
            style={{
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isAi ? c.accent : c.border,
              borderRadius: radius.sm,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: text.micro,
                letterSpacing: 0.4,
                color: isAi ? c.accent : c.mutedForeground,
              }}
            >
              {label}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 21, color: c.body }}>
        {answer}
      </Text>

      {breakdown?.length ? (
        <View style={{ gap: 12 }}>
          {breakdown.map((row) => (
            <ProgressBar
              key={row.label}
              label={row.label}
              value={row.value}
              limit={row.limit}
              unit={row.unit ?? ''}
            />
          ))}
        </View>
      ) : null}

      {insight ? (
        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: c.accent,
            paddingLeft: 10,
          }}
        >
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
            {insight}
          </Text>
        </View>
      ) : null}

      {followUps?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {followUps.map((followUp) => (
            <Chip key={followUp} onPress={() => onFollowUp?.(followUp)}>
              {followUp}
            </Chip>
          ))}
        </View>
      ) : null}

      {message.sources?.length ? (
        <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
          Sources · {message.sources.join(' · ')} · {message.queriedAt}
        </Text>
      ) : null}

      {message.note ? (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: text.micro,
            lineHeight: 16,
            color: c.mutedForeground,
          }}
        >
          {message.note}
        </Text>
      ) : null}
    </View>
  )
}

function UserMessage({ text: content }) {
  const { c, fonts, radius, text } = useTheme()
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <View
        style={{
          maxWidth: '85%',
          borderRadius: radius.lg,
          borderBottomRightRadius: radius.sm,
          backgroundColor: c.primary,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontFamily: fonts.sans, fontSize: text.body, color: c.onPrimary }}>
          {content}
        </Text>
      </View>
    </View>
  )
}

function PlannerMessage({ message, onOpen }) {
  const { c, fonts, radius, text } = useTheme()
  return (
    <View
      style={{
        gap: 10,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        backgroundColor: c.card,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Sparkle size={16} weight="duotone" color={c.primary} />
        <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: text.micro, color: c.foreground }}>
          Zen-I
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 20, color: c.body }}>
        Want me to draft a{message.scope === 'study' ? ' study' : ''} plan? You review and confirm each
        item before anything is added.
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <Button variant="primary" icon={Sparkle} onPress={onOpen}>
          Plan with AI
        </Button>
      </View>
    </View>
  )
}

function NoteDraftMessage({ message, onOpen, onDiscard }) {
  const { c, fonts, radius, text } = useTheme()
  const { draft } = message
  return (
    <View
      style={{
        gap: 10,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        backgroundColor: c.card,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Sparkle size={16} weight="duotone" color={c.accent} />
        <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: text.micro, color: c.foreground }}>
          Note draft
        </Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.accent }}>
          AI · Gemini
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}>
        {draft.title}
      </Text>
      <Text
        numberOfLines={6}
        style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 19, color: c.body }}
      >
        {draft.body}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="ghost" onPress={onDiscard}>
          Discard
        </Button>
        <Button variant="primary" onPress={onOpen} style={{ flex: 1 }}>
          Review & save
        </Button>
      </View>
    </View>
  )
}

function NoteErrorCard({ message, onRetry, canRetry }) {
  const { c, fonts, radius, text } = useTheme()
  return (
    <View
      style={{
        gap: 10,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        backgroundColor: c.card,
        padding: 14,
      }}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 20, color: c.body }}>
        {message.error}
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 16, color: c.mutedForeground }}>
        Nothing was written.
      </Text>
      {canRetry ? (
        <View style={{ flexDirection: 'row' }}>
          <Button variant="secondary" onPress={onRetry}>
            Try again
          </Button>
        </View>
      ) : null}
    </View>
  )
}

function ThinkingBubble() {
  const { c } = useTheme()
  const [dots] = useState(() => [
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ])

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.35, duration: 300, useNativeDriver: true }),
        ]),
      ),
    )
    animations.forEach((animation) => animation.start())
    return () => animations.forEach((animation) => animation.stop())
  }, [dots])

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: c.mutedForeground,
            opacity: dot,
          }}
        />
      ))}
    </View>
  )
}

export default function AskAI() {
  const { c, fonts, radius, text } = useTheme()
  const insets = useSafeAreaInsets()
  const services = useData()
  const { data, loading, error, reload } = services
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const { hidden, accountsHidden } = usePrivacy()
  const { q } = useLocalSearchParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [history, setHistory] = useState([])
  const [planOpen, setPlanOpen] = useState(false)
  const [planScope, setPlanScope] = useState('general')
  const [noteDraft, setNoteDraft] = useState(null)
  const [noteDraftMessageId, setNoteDraftMessageId] = useState(null)
  const [noteFormOpen, setNoteFormOpen] = useState(false)
  const scrollRef = useRef(null)
  const handled = useRef(null)

  const suggestions = deriveSuggestions(data)

  useEffect(() => {
    loadAskHistory().then(setHistory)
  }, [])

  const updateMessage = (id, patch) =>
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...patch } : message)))

  const generateDraft = async (prompt, messageId, newId) => {
    try {
      const draft = await generateNote({ prompt })
      recordUsage({ remaining: draft.remaining, cap: draft.cap, model: draft.model })
      const patch = { kind: 'note-draft', draft, prompt, error: null }
      if (messageId) updateMessage(messageId, patch)
      else setMessages((prev) => [...prev, { id: newId, role: 'assistant', ...patch }])
    } catch (error) {
      const patch = { kind: 'note-error', prompt, error: describeGeminiError(error) }
      if (messageId) updateMessage(messageId, patch)
      else setMessages((prev) => [...prev, { id: newId, role: 'assistant', ...patch }])
    }
  }

  const retryNote = async (message) => {
    if (pending || !aiEnabled || inCooldown()) return
    setPending(true)
    await generateDraft(message.prompt, message.id)
    setPending(false)
  }

  const ask = async (question) => {
    const value = String(question || '').trim()
    if (!value || pending) return
    const stamp = Date.now()
    setMessages((prev) => [...prev, { id: `u${stamp}`, role: 'user', text: value }])
    setInput('')
    setPending(true)
    pushAskHistory(value, history).then(setHistory)

    const notePrompt = extractNotePrompt(value)
    if (notePrompt) {
      if (!aiEnabled) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a${stamp}`,
            role: 'assistant',
            answer: 'AI is off, so I cannot draft this note.',
            note: 'Turn on AI in Settings, or write it manually in Notes.',
            label: 'AI off',
          },
        ])
      } else if (inCooldown()) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a${stamp}`,
            role: 'assistant',
            answer: 'Gemini is cooling down after its free limit.',
            note: 'Nothing was written. Try again later, or write the note manually in Notes.',
            label: 'Unavailable',
          },
        ])
      } else {
        await generateDraft(notePrompt, null, `a${stamp}`)
      }
      setPending(false)
      return
    }

    const local = answerQuery(value, data, { hidden, accountsHidden })
    const reply = { ...local, label: 'Local answer' }

    let outcome = parseLocalAction(value, data)
    let triedAction = false

    if (!outcome && looksLikePlanRequest(value)) {
      setMessages((prev) => [
        ...prev,
        { id: `a${stamp}`, role: 'assistant', kind: 'planner', scope: inferScope(value) },
      ])
      setPending(false)
      return
    }

    if (!outcome && looksLikeCommand(value) && aiEnabled && !inCooldown()) {
      triedAction = true
      try {
        const extracted = await extractAction({ text: value, context: buildActionContext(data) })
        recordUsage({ remaining: extracted.remaining, cap: extracted.cap, model: extracted.model })
        outcome = extracted.action === 'none' ? null : buildExtractedProposal(extracted, data)
      } catch {
        outcome = null
      }
    }

    if (outcome?.ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a${stamp}`,
          role: 'assistant',
          kind: 'action',
          proposal: outcome.proposal,
          actionState: 'idle',
        },
      ])
      setPending(false)
      return
    }

    if (outcome && !outcome.ok) {
      reply.answer = outcome.error
      reply.note = 'Nothing was changed.'
      setMessages((prev) => [...prev, { id: `a${stamp}`, role: 'assistant', ...reply }])
      setPending(false)
      return
    }

    const intent = classifyIntent(value)

    if (intent.kind === 'ai' && aiEnabled && !inCooldown() && !triedAction) {
      try {
        const { context, sources } = buildContextFor(intent.domain, data, { hidden, accountsHidden })
        const { text: aiText, model, remaining, cap } = await askGemini({
          task: 'advise',
          question: value,
          context,
        })
        recordUsage({ remaining, cap, model })
        reply.answer = aiText
        reply.label = 'AI · Gemini'
        reply.sources = [...new Set([...(local.sources || []), ...sources])]
      } catch (error) {
        reply.note = fallbackNote(error)
      }
    } else if (intent.kind === 'ai') {
      reply.note = aiEnabled
        ? 'Gemini is cooling down after its free limit, so here is the on-device answer.'
        : 'AI is off, so this is the on-device answer. Turn it on in Settings for advice.'
    } else if (intent.kind === 'clarify') {
      reply.note = 'Name an area — spending, study, projects or your plan — and I can go deeper.'
    }

    setMessages((prev) => [...prev, { id: `a${stamp}`, role: 'assistant', ...reply }])
    setPending(false)
  }

  const confirmAction = async (id) => {
    const message = messages.find((entry) => entry.id === id)
    if (!message?.proposal) return
    updateMessage(id, { actionState: 'running', actionError: null })
    try {
      await runAction(services, message.proposal)
      updateMessage(id, { actionState: 'done', actionError: null })
    } catch (error) {
      updateMessage(id, {
        actionState: 'error',
        actionError: error?.message || 'Could not save the change.',
      })
    }
  }

  const cancelAction = (id) => updateMessage(id, { actionState: 'cancelled' })

  useEffect(() => {
    if (loading || error) return
    const seed = Array.isArray(q) ? q[0] : q
    if (seed && handled.current !== seed) {
      handled.current = seed
      ask(String(seed))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, loading, error])

  const empty = messages.length === 0 && !pending

  return (
    <Screen
      scroll={false}
      tabbed={false}
      left="back"
      title="Ask Zen-I"
      right={
        messages.length ? (
          <Pressable accessibilityRole="button" onPress={() => setMessages([])} hitSlop={16}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
              Clear
            </Text>
          </Pressable>
        ) : null
      }
    >
      {loading ? (
        <Loading label="Loading your records" />
      ) : error ? (
        <View style={{ padding: 16 }}>
          <ErrorState error={error} onRetry={reload} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 20, flexGrow: 1, paddingBottom: 24 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {empty ? (
            <View style={{ gap: 16, paddingTop: 8 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: text.title, color: c.foreground }}>
                  What should we look at?
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: text.label, lineHeight: 20, color: c.mutedForeground }}>
                  Ask about a period, a category or a goal &mdash; or just tell me what you spent, like
                  &ldquo;I paid 100 in jollibee using my cash&rdquo;, &ldquo;grab 220&rdquo; or &ldquo;earned 5000&rdquo;. I&rsquo;ll log it
                  for you to confirm. You can also say &ldquo;make me a note about SSS&rdquo;.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {suggestions.map((suggestion) => (
                  <Chip key={suggestion} onPress={() => ask(suggestion)}>
                    {suggestion}
                  </Chip>
                ))}
              </View>
              {history.length ? (
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontFamily: fonts.sansSemiBold,
                      fontSize: text.micro,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      color: c.mutedForeground,
                    }}
                  >
                    Recent
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {history.map((query) => (
                      <Chip key={query} onPress={() => ask(query)}>
                        {query}
                      </Chip>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {messages.map((message) =>
            message.role === 'user' ? (
              <UserMessage key={message.id} text={message.text} />
            ) : message.kind === 'action' ? (
              <ActionConfirm
                key={message.id}
                proposal={message.proposal}
                state={message.actionState}
                error={message.actionError}
                onConfirm={() => confirmAction(message.id)}
                onCancel={() => cancelAction(message.id)}
              />
            ) : message.kind === 'planner' ? (
              <PlannerMessage
                key={message.id}
                message={message}
                onOpen={() => {
                  setPlanScope(message.scope || 'general')
                  setPlanOpen(true)
                }}
              />
            ) : message.kind === 'note-draft' ? (
              <NoteDraftMessage
                key={message.id}
                message={message}
                onOpen={() => {
                  setNoteDraft(message.draft)
                  setNoteDraftMessageId(message.id)
                  setNoteFormOpen(true)
                }}
                onDiscard={() => setMessages((prev) => prev.filter((entry) => entry.id !== message.id))}
              />
            ) : message.kind === 'note-error' ? (
              <NoteErrorCard
                key={message.id}
                message={message}
                canRetry={aiEnabled && !inCooldown() && !pending}
                onRetry={() => retryNote(message)}
              />
            ) : (
              <AssistantMessage key={message.id} message={message} onFollowUp={ask} />
            ),
          )}

          {pending ? <ThinkingBubble /> : null}
        </ScrollView>

        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.line,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 10),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => ask(input)}
              returnKeyType="send"
              placeholder="Ask about your spending, notes, plans or study"
              placeholderTextColor={c.mutedForeground}
              style={{
                flex: 1,
                minHeight: 48,
                maxHeight: 120,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: c.border,
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
              accessibilityLabel="Send question"
              disabled={!input.trim() || pending}
              onPress={() => ask(input)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      )}
      <PlanWithAi visible={planOpen} defaultScope={planScope} onClose={() => setPlanOpen(false)} />
      <NoteForm
        visible={noteFormOpen}
        defaults={noteDraft}
        notice={NOTE_DRAFT_NOTICE}
        onSaved={() => {
          if (!noteDraftMessageId) return
          const savedId = noteDraftMessageId
          setMessages((prev) => [
            ...prev.filter((entry) => entry.id !== savedId),
            {
              id: `a${Date.now()}`,
              role: 'assistant',
              answer: 'Saved it to Notes.',
              label: 'Notes',
            },
          ])
        }}
        onClose={() => {
          setNoteFormOpen(false)
          setNoteDraft(null)
          setNoteDraftMessageId(null)
        }}
      />
    </Screen>
  )
}
