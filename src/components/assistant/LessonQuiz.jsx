import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Check, Sparkle, WarningCircle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { describeGeminiError, generateQuiz, inCooldown } from '../../lib/gemini.js'
import { lessonContext } from '../../lib/learning.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* A short self-check quiz generated from the lesson currently open. */
export default function LessonQuiz({ visible, course, module, lesson, onClose }) {
  const { c, fonts, radius, text } = useTheme()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [status, setStatus] = useState('idle')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('idle')
    setQuestions([])
    setAnswers({})
    setMessage(null)
  }, [visible, lesson?.id])

  const generate = async () => {
    setMessage(null)
    setStatus('loading')
    try {
      if (!aiEnabled) {
        setMessage('Turn on AI in Settings to generate a quiz.')
        setStatus('error')
        return
      }
      if (inCooldown()) {
        setMessage('Gemini is cooling down after its free limit. Try again shortly.')
        setStatus('error')
        return
      }
      const result = await generateQuiz({
        course: course?.name,
        module: module?.title,
        lesson: lesson?.title,
        context: lessonContext(course, module, lesson),
      })
      recordUsage({ remaining: result.remaining, cap: result.cap, model: result.model })
      setQuestions(result.questions)
      setAnswers({})
      setStatus('ready')
    } catch (error) {
      setMessage(describeGeminiError(error))
      setStatus('error')
    }
  }

  const answered = Object.keys(answers).length
  const correct = questions.filter((item, index) => answers[index] === item.answerIndex).length

  return (
    <Sheet visible={visible} onClose={onClose} title="Quiz yourself" subtitle={lesson?.title}>
      {status === 'idle' || status === 'loading' || status === 'error' ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: text.body, color: c.mutedForeground }}>
            Gemini writes a few questions from this lesson to help you check what stuck.
          </Text>
          {message ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
              {message}
            </Text>
          ) : null}
          <Button variant="primary" icon={Sparkle} onPress={generate} loading={status === 'loading'}>
            {status === 'error' ? 'Try again' : 'Start quiz'}
          </Button>
        </View>
      ) : null}

      {status === 'ready' ? (
        <View style={{ gap: 20 }}>
          {questions.map((item, index) => {
            const chosen = answers[index]
            const done = chosen !== undefined
            return (
              <View key={index} style={{ gap: 10 }}>
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}>
                  {index + 1}. {item.prompt}
                </Text>
                <View style={{ gap: 8 }}>
                  {item.choices.map((choice, choiceIndex) => {
                    const isCorrect = choiceIndex === item.answerIndex
                    const isChosen = chosen === choiceIndex
                    const showState = done && (isCorrect || isChosen)
                    const tone = !showState ? c.border : isCorrect ? c.success : c.destructive
                    return (
                      <Pressable
                        key={choiceIndex}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isChosen, disabled: done }}
                        accessibilityLabel={choice}
                        disabled={done}
                        onPress={() => setAnswers((prev) => ({ ...prev, [index]: choiceIndex }))}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: tone,
                          backgroundColor: c.card,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        {showState ? (
                          isCorrect ? (
                            <Check size={15} weight="bold" color={c.success} />
                          ) : (
                            <WarningCircle size={15} weight="bold" color={c.destructiveText} />
                          )
                        ) : null}
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: fonts.sans,
                            fontSize: text.body,
                            color: c.body,
                          }}
                        >
                          {choice}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                {done && item.explanation ? (
                  <Text
                    style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}
                  >
                    {item.explanation}
                  </Text>
                ) : null}
              </View>
            )
          })}
          {answered === questions.length ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderRadius: radius.md,
                backgroundColor: c.background,
                borderWidth: 1,
                borderColor: c.border,
                padding: 12,
              }}
            >
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.body }}>
                {correct} of {questions.length} correct
              </Text>
            </View>
          ) : null}
          <Button variant="ghost" onPress={generate}>
            New questions
          </Button>
        </View>
      ) : null}
    </Sheet>
  )
}
