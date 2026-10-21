import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChartLineUp, Sparkle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { describeGeminiError, explainFinanceScore, inCooldown } from '../../lib/gemini.js'
import { financeScoreContext, financeScoreDelta } from '../../lib/finance.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function deltaLabel(delta) {
  if (delta === null) return null
  if (delta === 0) return 'No change vs last week'
  return `${delta > 0 ? '+' : ''}${delta} vs last week`
}

function deltaTone(delta, c) {
  if (delta === null || delta === 0) return c.mutedForeground
  return delta > 0 ? c.success : c.destructiveText
}

function ScoreBar({ component, detail }) {
  const { c, fonts, radius, text } = useTheme()
  const points = component.points
  const pct = points === null ? 0 : Math.round((points / component.max) * 100)
  const tone = points === null ? c.border : pct < 60 ? c.accent : c.primary

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${component.label}: ${points === null ? 'unavailable' : `${points} of ${component.max}`}`}
      accessibilityValue={{ min: 0, max: component.max, now: points ?? 0 }}
      style={{ gap: 5 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: text.label, color: c.foreground }}>
          {component.label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: text.micro,
            color: c.mutedForeground,
            fontVariant: ['tabular-nums'],
          }}
        >
          {points === null ? 'Not scored' : `${points}/${component.max}`}
        </Text>
      </View>
      <View style={{ height: 6, width: '100%', overflow: 'hidden', borderRadius: radius.pill, backgroundColor: c.muted }}>
        <View
          style={{
            height: '100%',
            width: `${Math.min(Math.max(pct, 0), 100)}%`,
            borderRadius: radius.pill,
            backgroundColor: tone,
          }}
        />
      </View>
      {detail ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 16, color: c.mutedForeground }}>
          {detail}
        </Text>
      ) : null}
    </View>
  )
}

function Trend({ history, compact = false }) {
  const { c, fonts, radius, text } = useTheme()
  if (!history || history.length < 2) return null

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${history.length}-week score trend: ${history
        .map((point) => (point.score === null ? 'no score' : point.score))
        .join(', ')}`}
      style={{ gap: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: text.micro,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: c.mutedForeground,
          }}
        >
          Last {history.length} weeks
        </Text>
        <ChartLineUp size={13} color={c.mutedForeground} />
      </View>
      <View style={{ height: compact ? 24 : 32, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        {history.map((point, index) => {
          const current = index === history.length - 1
          const height = point.score === null ? 3 : Math.max(3, Math.round((point.score / 100) * (compact ? 24 : 32)))
          return (
            <View
              key={point.weekStart}
              accessibilityLabel={`${point.label}: ${point.score === null ? 'no score' : `${point.score} of 100`}`}
              style={{
                flex: 1,
                height,
                borderRadius: radius.sm,
                backgroundColor: point.score === null ? c.border : current ? c.accent : c.primary,
                opacity: point.score === null ? 0.5 : current ? 1 : 0.5,
              }}
            />
          )
        })}
      </View>
    </View>
  )
}

function privacyDetail(component, privacy) {
  if (privacy?.hidden && (component.key === 'debt_pressure' || component.key === 'cash_buffer')) {
    return 'Details hidden while balances are masked.'
  }
  if (
    privacy?.accountsHidden &&
    (component.key === 'cash_buffer' ||
      (component.key === 'debt_pressure' && component.basis === 'accounts'))
  ) {
    return 'Details hidden while account balances are masked.'
  }
  return component.signal
}

function EmptyState({ result }) {
  const { c, fonts, text } = useTheme()
  return (
    <Card padded>
      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: text.micro,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: c.mutedForeground,
          }}
        >
          Finance score
        </Text>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.heading, color: c.foreground }}>
          Not enough data yet
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 19, color: c.body }}>
          {result?.summary || 'Add a few records to build your weekly score.'}
        </Text>
        <View style={{ gap: 4 }}>
          {['Log income to measure savings.', 'Add a budget to track pace.', 'Add an account to measure your buffer.'].map(
            (line) => (
              <Text key={line} style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
                - {line}
              </Text>
            ),
          )}
        </View>
      </View>
    </Card>
  )
}

export default function FinanceScoreCard({
  result,
  history = [],
  compact = false,
  privacy = {},
  onPress,
}) {
  const { c, fonts, radius, text } = useTheme()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [explanation, setExplanation] = useState(null)
  const [explainBusy, setExplainBusy] = useState(false)
  const [explainError, setExplainError] = useState(null)

  if (!result || result.score === null) {
    return compact ? null : <EmptyState result={result} />
  }

  const delta = financeScoreDelta(history)
  const change = deltaLabel(delta)
  const explainKey = `${result.week.start}:${result.score}:${result.provisional ? 'provisional' : 'full'}`
  const visibleExplanation = explanation?.key === explainKey ? explanation.text : null
  const visibleError = explainError?.key === explainKey ? explainError.text : null
  const canExplain = aiEnabled && !inCooldown()
  const labelTone =
    result.label === 'At risk' || result.label === 'Tight'
      ? { background: c.accentSoft, color: c.accentText }
      : { background: c.primarySoft, color: c.primaryFg }

  const generateExplanation = async () => {
    if (!canExplain || explainBusy) return
    setExplainBusy(true)
    setExplainError(null)
    try {
      const response = await explainFinanceScore({
        context: financeScoreContext(result, privacy),
      })
      recordUsage({ remaining: response.remaining, cap: response.cap, model: response.model })
      setExplanation({ key: explainKey, text: response.text })
    } catch (cause) {
      setExplainError({ key: explainKey, text: describeGeminiError(cause) })
    } finally {
      setExplainBusy(false)
    }
  }

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Finance score ${result.score} out of 100, ${result.label}. Open Money.`}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <Card padded>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ gap: 3 }}>
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: text.micro,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: c.mutedForeground,
                  }}
                >
                  Finance score
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                  <Text
                    style={{
                      fontFamily: fonts.monoSemiBold,
                      fontSize: text.title,
                      color: c.foreground,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {result.score}
                  </Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                    /100
                  </Text>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: labelTone.color }}>
                    {result.label}
                    {result.provisional ? ' (provisional)' : ''}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: deltaTone(delta, c) }}>
                  {change || 'Rolling four-week check-in'}
                </Text>
              </View>
              <ChartLineUp size={18} color={c.mutedForeground} />
            </View>
            <Trend history={history} compact />
          </View>
        </Card>
      </Pressable>
    )
  }

  return (
    <Card padded>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <View style={{ flexShrink: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: text.micro,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: c.mutedForeground,
                }}
              >
                Finance score
              </Text>
              <View
                style={{
                  borderRadius: radius.pill,
                  backgroundColor: labelTone.background,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: labelTone.color }}>
                  {result.label}
                </Text>
              </View>
              {result.provisional ? (
                <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                  Provisional
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text
                style={{
                  fontFamily: fonts.monoSemiBold,
                  fontSize: text.display,
                  color: c.foreground,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {result.score}
              </Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: text.caption, color: c.mutedForeground }}>
                /100
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: deltaTone(delta, c) }}>
              {change || 'First weekly check-in'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.foreground }}>
              This week
            </Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
              {result.weekLabel}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
              Rolling 4 weeks
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 19, color: c.body }}>
          {result.summary}
        </Text>

        <View style={{ gap: 12 }}>
          {result.components.map((component) => (
            <ScoreBar
              key={component.key}
              component={component}
              detail={privacyDetail(component, privacy)}
            />
          ))}
        </View>

        <Trend history={history} />

        {visibleExplanation ? (
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
              {visibleExplanation}
            </Text>
          </View>
        ) : null}

        {visibleError ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructiveText }}>
            {visibleError}
          </Text>
        ) : null}

        {canExplain ? (
          <Button variant="secondary" size="sm" icon={Sparkle} onPress={generateExplanation} loading={explainBusy}>
            {visibleExplanation ? 'Explain again' : 'Explain with Gemini'}
          </Button>
        ) : aiEnabled ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
            Gemini is cooling down after its free limit. You can try again shortly.
          </Text>
        ) : (
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
            Turn on AI in Settings for a Gemini explanation.
          </Text>
        )}
      </View>
    </Card>
  )
}
