import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Check, Sparkle, WarningCircle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { useData } from '../../data/store.jsx'
import { assessSubmission, describeGeminiError, inCooldown } from '../../lib/gemini.js'
import { FORFEIT_CREDITS } from '../../lib/projects.js'
import { validateSubmission } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function VerdictCard({ result }) {
  const { c, fonts, radius, text } = useTheme()
  const passed = result.verdict === 'pass'
  return (
    <View
      style={{
        gap: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: passed ? c.success : c.destructive,
        backgroundColor: c.card,
        padding: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {passed ? (
          <Check size={15} weight="bold" color={c.success} />
        ) : (
          <WarningCircle size={15} weight="bold" color={c.destructiveText} />
        )}
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: passed ? c.success : c.destructiveText }}>
          {passed ? 'Passed' : 'Failed'}
          {typeof result.score === 'number' ? ` · ${result.score}/100` : ''}
        </Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
          {result.by === 'gemini' ? 'Gemini' : 'Self-assessed'}
        </Text>
      </View>
      {result.feedback ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
          {result.feedback}
        </Text>
      ) : null}
      {!passed ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          Saving a failed result forfeits {FORFEIT_CREDITS} credits and locks new projects until you atone.
        </Text>
      ) : null}
    </View>
  )
}

export default function SubmissionSheet({ visible, project, onClose }) {
  const { c, fonts, radius, text } = useTheme()
  const { updateProject, createPenalty } = useData()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [writeUp, setWriteUp] = useState('')
  const [link, setLink] = useState('')
  const [result, setResult] = useState(null)
  const [assessing, setAssessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWriteUp('')
    setLink('')
    setResult(null)
    setAssessing(false)
    setSaving(false)
    setError(null)
  }, [visible, project?.id])

  const checked = validateSubmission({ text: writeUp, link })
  const canAssess = aiEnabled && !inCooldown()

  const assess = async () => {
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    setError(null)
    setAssessing(true)
    try {
      const res = await assessSubmission({
        title: project?.title,
        brief: project?.brief,
        criteria: project?.criteria,
        submission: checked.payload.submission_text,
        link: checked.payload.submission_link,
      })
      recordUsage({ remaining: res.remaining, cap: res.cap, model: res.model })
      setResult({ verdict: res.verdict, score: res.score, feedback: res.feedback, by: 'gemini' })
    } catch (cause) {
      setError(`${describeGeminiError(cause)} You can still assess it yourself below.`)
    } finally {
      setAssessing(false)
    }
  }

  const save = async () => {
    if (!checked.ok || !result || saving) return
    setSaving(true)
    setError(null)
    try {
      await updateProject(project.id, {
        ...checked.payload,
        submitted_at: new Date().toISOString(),
        verdict: result.verdict,
        assessment_feedback: result.feedback || null,
        assessment_score: typeof result.score === 'number' ? result.score : null,
        assessed_by: result.by,
        assessed_at: new Date().toISOString(),
        status: result.verdict === 'pass' ? 'passed' : 'failed',
      })
      if (result.verdict === 'fail') {
        await createPenalty({
          project_id: project.id,
          project_title: project.title,
          reason: 'failed',
          credits: FORFEIT_CREDITS,
        })
      }
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the submission.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Submit work" subtitle={project?.title}>
      <View
        style={{
          gap: 6,
          borderRadius: radius.md,
          backgroundColor: c.background,
          borderWidth: 1,
          borderColor: c.border,
          padding: 12,
        }}
      >
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
          Being assessed
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
          {project?.brief}
        </Text>
        {project?.criteria ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
            Passes when: {project.criteria}
          </Text>
        ) : null}
      </View>

      <Field
        label="What did you deliver?"
        value={writeUp}
        onChangeText={setWriteUp}
        placeholder="Describe the finished work — what exists now that didn't before"
        multiline
      />
      <Field
        label="Link"
        value={link}
        onChangeText={setLink}
        placeholder="Optional · https://…"
        hint="A repo, doc or post that shows the work"
      />

      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructiveText }}>{error}</Text>
      ) : null}

      {!result ? (
        <View style={{ gap: 12 }}>
          {canAssess ? (
            <Button variant="primary" icon={Sparkle} onPress={assess} loading={assessing}>
              Assess with Gemini
            </Button>
          ) : (
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              {aiEnabled
                ? 'Gemini is cooling down after its free limit — assess it yourself for now.'
                : 'Turn on AI in Settings to have this assessed for you.'}
            </Text>
          )}
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
              Assess it yourself
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                variant="secondary"
                onPress={() => setResult({ verdict: 'pass', score: null, feedback: '', by: 'self' })}
                style={{ flex: 1 }}
              >
                Passed
              </Button>
              <Button
                variant="secondary"
                onPress={() => setResult({ verdict: 'fail', score: null, feedback: '', by: 'self' })}
                style={{ flex: 1 }}
              >
                Failed
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <VerdictCard result={result} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="ghost" onPress={() => setResult(null)} disabled={saving}>
              Change
            </Button>
            <Button variant="primary" onPress={save} loading={saving} style={{ flex: 1 }}>
              Save result
            </Button>
          </View>
        </View>
      )}
    </Sheet>
  )
}
