import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Check, Sparkle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Chip from '../ui/Chip.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import PlanPreview from './PlanPreview.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { useData } from '../../data/store.jsx'
import { describeGeminiError, generatePlan, inCooldown } from '../../lib/gemini.js'
import {
  HORIZONS,
  buildPlanContext,
  localStudyPlan,
  normalizeItems,
  runPlan,
  summarizeResult,
} from '../../lib/planWithAi.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* One sheet for both standalone and study planning; scope defaults by entry point. */
export default function PlanWithAi({ visible, defaultScope = 'general', onClose }) {
  const { c, fonts, text } = useTheme()
  const services = useData()
  const { data } = services
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [scope, setScope] = useState(defaultScope)
  const [horizon, setHorizon] = useState('week')
  const [goal, setGoal] = useState('')
  const [status, setStatus] = useState('idle')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const hasCourses = (data.courses || []).some((course) => course.active !== false)

  useEffect(() => {
    if (!visible) return
    setScope(hasCourses ? defaultScope : 'general')
    setHorizon('week')
    setGoal('')
    setStatus('idle')
    setItems([])
    setSelected(new Set())
    setMessage(null)
    setSaving(false)
  }, [visible, defaultScope, hasCourses])

  const changeScope = (next) => {
    setScope(next)
    setStatus('idle')
    setItems([])
    setSelected(new Set())
    setMessage(null)
  }

  const applyItems = (next) => {
    setItems(next)
    setSelected(new Set(next.map((item) => item.key)))
    setStatus(next.length ? 'ready' : 'empty')
  }

  const generate = async () => {
    setMessage(null)
    setStatus('loading')

    const fallback = () => {
      const local = localStudyPlan(data)
      if (local.length) applyItems(local)
      else {
        setStatus('empty')
        setMessage('Nothing to schedule right now — add a course or a weekly target first.')
      }
    }

    try {
      if (!aiEnabled) {
        if (scope === 'study') return fallback()
        setMessage('Turn on AI in Settings to plan with AI.')
        setStatus('error')
        return
      }
      if (inCooldown()) {
        if (scope === 'study') return fallback()
        setMessage('Gemini is cooling down after its free limit. Try again shortly.')
        setStatus('error')
        return
      }
      const context = buildPlanContext({ scope, horizon, goal, data })
      const result = await generatePlan({ scope, horizon, goal, context })
      recordUsage({ remaining: result.remaining, cap: result.cap, model: result.model })
      applyItems(normalizeItems(result.items, data, scope))
    } catch (error) {
      if (scope === 'study') return fallback()
      setMessage(describeGeminiError(error))
      setStatus('error')
    }
  }

  const toggle = (key) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const confirm = async () => {
    const chosen = items.filter((item) => selected.has(item.key))
    if (!chosen.length || saving) return
    setSaving(true)
    setMessage(null)
    try {
      const result = await runPlan(services, chosen)
      setStatus('done')
      setMessage(summarizeResult(result))
    } catch (error) {
      setSaving(false)
      setMessage(error?.message || 'Could not add those items.')
    }
  }

  const label = {
    fontFamily: fonts.sansMedium,
    fontSize: text.caption,
    color: c.mutedForeground,
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Plan with AI"
      subtitle={scope === 'study' ? 'Study blocks for your week' : 'Entries for your week'}
    >
      {hasCourses ? (
        <View style={{ gap: 8 }}>
          <Text style={label}>Scope</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip active={scope === 'general'} onPress={() => changeScope('general')}>
              General
            </Chip>
            <Chip active={scope === 'study'} onPress={() => changeScope('study')}>
              Study
            </Chip>
          </View>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={label}>Horizon</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {HORIZONS.map((option) => (
            <Chip
              key={option.key}
              active={horizon === option.key}
              onPress={() => setHorizon(option.key)}
            >
              {option.label}
            </Chip>
          ))}
        </View>
      </View>

      <Field
        label="Goal"
        value={goal}
        onChangeText={setGoal}
        placeholder="Optional · e.g. train for a 5k, three evenings"
        multiline
        hint="Leave empty to plan around what's already there"
      />

      {status === 'idle' || status === 'loading' || status === 'error' ? (
        <Button
          variant="primary"
          icon={Sparkle}
          onPress={generate}
          loading={status === 'loading'}
        >
          {status === 'error' ? 'Try again' : 'Generate plan'}
        </Button>
      ) : null}

      {status === 'error' && message ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
          {message}
        </Text>
      ) : null}

      {status === 'ready' ? (
        <View style={{ gap: 12 }}>
          <PlanPreview items={items} selected={selected} onToggle={toggle} />
          {message ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
              {message}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="ghost" onPress={generate} disabled={saving}>
              Regenerate
            </Button>
            <Button
              variant="primary"
              onPress={confirm}
              loading={saving}
              disabled={!selected.size}
              style={{ flex: 1 }}
            >
              Add {selected.size}
            </Button>
          </View>
        </View>
      ) : null}

      {status === 'empty' ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: text.body, color: c.mutedForeground }}>
            {message || 'No new items — your week already covers this.'}
          </Text>
          <Button variant="secondary" onPress={generate}>
            Try again
          </Button>
        </View>
      ) : null}

      {status === 'done' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Check size={16} weight="bold" color={c.accent} />
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.body }}>
            {message}
          </Text>
        </View>
      ) : null}
    </Sheet>
  )
}
