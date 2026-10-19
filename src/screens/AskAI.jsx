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
import Button from '../components/ui/Button.jsx'
import Chip from '../components/ui/Chip.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { useData } from '../data/store.jsx'
import { useAiPrefs } from '../data/aiPrefs.jsx'
import { answerQuery, deriveSuggestions } from '../lib/ask.js'
import { loadAskHistory, pushAskHistory } from '../lib/askHistory.js'
import { buildContextFor } from '../lib/context.js'
import { askGemini, describeGeminiError, inCooldown } from '../lib/gemini.js'
import { classifyIntent } from '../lib/intent.js'
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

function ThinkingBubble() {
  const { c } = useTheme()
  const dots = useRef([new Animated.Value(0.35), new Animated.Value(0.35), new Animated.Value(0.35)]).current

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
  const { data } = useData()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const { q } = useLocalSearchParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [history, setHistory] = useState([])
  const scrollRef = useRef(null)
  const handled = useRef(null)

  const suggestions = deriveSuggestions(data)

  useEffect(() => {
    loadAskHistory().then(setHistory)
  }, [])

  const ask = async (question) => {
    const value = String(question || '').trim()
    if (!value || pending) return
    const stamp = Date.now()
    setMessages((prev) => [...prev, { id: `u${stamp}`, role: 'user', text: value }])
    setInput('')
    setPending(true)
    pushAskHistory(value, history).then(setHistory)

    const local = answerQuery(value, data)
    const intent = classifyIntent(value)
    const reply = { ...local, label: 'Local answer' }

    if (intent.kind === 'ai' && aiEnabled && !inCooldown()) {
      try {
        const { context, sources } = buildContextFor(intent.domain, data)
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
      reply.note = 'Name an area — spending, study or your plan — and I can go deeper.'
    }

    setMessages((prev) => [...prev, { id: `a${stamp}`, role: 'assistant', ...reply }])
    setPending(false)
  }

  useEffect(() => {
    const seed = Array.isArray(q) ? q[0] : q
    if (seed && handled.current !== seed) {
      handled.current = seed
      ask(String(seed))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const empty = messages.length === 0 && !pending

  return (
    <Screen
      scroll={false}
      tabbed={false}
      left="back"
      title="Ask Zen-I"
      right={
        messages.length ? (
          <Pressable accessibilityRole="button" onPress={() => setMessages([])} hitSlop={8}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
              Clear
            </Text>
          </Pressable>
        ) : null
      }
    >
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
                  Ask about a period, a category or a goal. Answers come back as numbers, not paragraphs.
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
              placeholder="Ask about your spending, notes or plans"
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
    </Screen>
  )
}
