import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Sparkle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Chip from '../ui/Chip.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { useData } from '../../data/store.jsx'
import { describeGeminiError, generateCourse, inCooldown } from '../../lib/gemini.js'
import { validateCourse } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const LEVELS = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
]

/* Ask Gemini to outline a course, then review it before anything is saved. */
export default function GenerateCourse({ visible, onClose }) {
  const { c, fonts, radius, text } = useTheme()
  const router = useRouter()
  const { createCourseTree } = useData()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('beginner')
  const [status, setStatus] = useState('idle')
  const [outline, setOutline] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGoal('')
    setLevel('beginner')
    setStatus('idle')
    setOutline(null)
    setName('')
    setDescription('')
    setMessage(null)
    setSaving(false)
  }, [visible])

  const generate = async () => {
    const value = goal.trim()
    if (!value) {
      setMessage('Describe what you want to learn first.')
      setStatus('error')
      return
    }
    setMessage(null)
    setStatus('loading')
    try {
      if (!aiEnabled) {
        setMessage('Turn on AI in Settings to generate a course.')
        setStatus('error')
        return
      }
      if (inCooldown()) {
        setMessage('Gemini is cooling down after its free limit. Try again shortly.')
        setStatus('error')
        return
      }
      const result = await generateCourse({ goal: value, level })
      recordUsage({ remaining: result.remaining, cap: result.cap, model: result.model })
      setOutline(result)
      setName(result.name)
      setDescription(result.description)
      setStatus('ready')
    } catch (error) {
      setMessage(describeGeminiError(error))
      setStatus('error')
    }
  }

  const save = async () => {
    if (!outline || saving) return
    const checked = validateCourse({ name, description })
    if (!checked.ok) {
      setMessage(checked.error)
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const course = await createCourseTree({
        name: checked.payload.name,
        description: checked.payload.description,
        weekly_target_hours: 0,
        modules: outline.modules,
      })
      onClose()
      if (course?.id) router.push(`/course/${course.id}`)
    } catch (error) {
      setMessage(error?.message || 'Could not save the course.')
      setSaving(false)
    }
  }

  const label = { fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Generate a course"
      subtitle="Gemini drafts, you review before it saves"
    >
      <Field
        label="What do you want to learn?"
        value={goal}
        onChangeText={setGoal}
        placeholder="e.g. the basics of Japanese, or practical SQL"
        multiline
      />

      <View style={{ gap: 8 }}>
        <Text style={label}>Starting level</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LEVELS.map((option) => (
            <Chip key={option.key} active={level === option.key} onPress={() => setLevel(option.key)}>
              {option.label}
            </Chip>
          ))}
        </View>
      </View>

      {status === 'idle' || status === 'loading' || status === 'error' ? (
        <Button variant="primary" icon={Sparkle} onPress={generate} loading={status === 'loading'}>
          {status === 'error' ? 'Try again' : 'Generate outline'}
        </Button>
      ) : null}

      {message ? (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: text.caption,
            color: status === 'error' ? c.destructive : c.mutedForeground,
          }}
        >
          {message}
        </Text>
      ) : null}

      {status === 'ready' && outline ? (
        <View style={{ gap: 12 }}>
          <Field label="Course name" value={name} onChangeText={setName} />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional · one line on what it covers"
          />
          <View
            style={{
              gap: 10,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.background,
              padding: 12,
            }}
          >
            {outline.modules.map((mod) => (
              <View key={mod.title} style={{ gap: 3 }}>
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}>
                  {mod.title}
                </Text>
                {mod.lessons.map((lesson) => (
                  <Text
                    key={lesson.title}
                    style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}
                  >
                    · {lesson.title}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="ghost" onPress={generate} disabled={saving}>
              Regenerate
            </Button>
            <Button variant="primary" onPress={save} loading={saving} style={{ flex: 1 }}>
              Save course
            </Button>
          </View>
        </View>
      ) : null}
    </Sheet>
  )
}
