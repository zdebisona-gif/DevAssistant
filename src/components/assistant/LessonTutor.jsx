import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Sparkle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Chip from '../ui/Chip.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { askTutor, describeGeminiError, inCooldown } from '../../lib/gemini.js'
import { lessonContext } from '../../lib/learning.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const SUGGESTIONS = ['Explain this simply', 'Give me a concrete example', 'What should I practise next?']

/* Ask Gemini a question about the lesson currently open. Only that lesson is sent. */
export default function LessonTutor({ visible, course, module, lesson, onClose }) {
  const { c, fonts, radius, text } = useTheme()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [question, setQuestion] = useState('')
  const [entries, setEntries] = useState([])
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestion('')
    setEntries([])
    setAsking(false)
    setError(null)
  }, [visible, lesson?.id])

  const ask = async (value) => {
    const q = String(value ?? question).trim()
    if (!q || asking) return
    if (!aiEnabled) {
      setError('Turn on AI in Settings to ask about this lesson.')
      return
    }
    if (inCooldown()) {
      setError('Gemini is cooling down after its free limit. Try again shortly.')
      return
    }
    setError(null)
    setAsking(true)
    setQuestion('')
    try {
      const result = await askTutor({
        question: q,
        context: lessonContext(course, module, lesson),
      })
      recordUsage({ remaining: result.remaining, cap: result.cap, model: result.model })
      setEntries((prev) => [...prev, { q, a: result.text }])
    } catch (cause) {
      setError(describeGeminiError(cause))
    } finally {
      setAsking(false)
    }
  }

  const label = { fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }

  return (
    <Sheet visible={visible} onClose={onClose} title="Ask about this lesson" subtitle={lesson?.title}>
      {entries.length ? (
        <View style={{ gap: 12 }}>
          {entries.map((entry, index) => (
            <View key={index} style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}>
                {entry.q}
              </Text>
              <View
                style={{
                  borderRadius: radius.md,
                  backgroundColor: c.background,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 12,
                }}
              >
                <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 21, color: c.body }}>
                  {entry.a}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={label}>Try one of these</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SUGGESTIONS.map((suggestion) => (
              <Chip key={suggestion} onPress={() => ask(suggestion)}>
                {suggestion}
              </Chip>
            ))}
          </View>
        </View>
      )}

      <Field
        label="Your question"
        value={question}
        onChangeText={setQuestion}
        placeholder="Ask anything about this lesson"
        multiline
      />

      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}

      <Button
        variant="primary"
        icon={Sparkle}
        onPress={() => ask()}
        loading={asking}
        disabled={!question.trim()}
      >
        Ask
      </Button>
    </Sheet>
  )
}
