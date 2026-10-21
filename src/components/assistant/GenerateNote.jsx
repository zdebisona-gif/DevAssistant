import { useState } from 'react'
import { Text } from 'react-native'
import { Sparkle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { describeGeminiError, generateNote, inCooldown } from '../../lib/gemini.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* Drafts a note from a typed topic. The parent opens NoteForm with the result. */
export default function GenerateNote({ visible, onClose, onDraft }) {
  const { c, fonts, text } = useTheme()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const cooldown = inCooldown()
  const busy = status === 'loading'
  const blocked = !aiEnabled || cooldown
  const canGenerate = Boolean(prompt.trim()) && !blocked && !busy

  const generate = async () => {
    if (!canGenerate) return
    setStatus('loading')
    setError(null)
    try {
      const draft = await generateNote({ prompt })
      recordUsage({ remaining: draft.remaining, cap: draft.cap, model: draft.model })
      onDraft(draft)
    } catch (cause) {
      setStatus('error')
      setError(describeGeminiError(cause))
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Generate a note"
      subtitle="AI draft · review before saving"
    >
      <Field
        label="What should it cover?"
        value={prompt}
        onChangeText={setPrompt}
        placeholder="e.g. Steps to get SSS in the Philippines"
        autoFocus
      />

      {!aiEnabled ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}>
          Turn on AI in Settings to generate a draft. You can still write a note manually.
        </Text>
      ) : cooldown ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}>
          Gemini is cooling down after its free limit. Try again later or write the note manually.
        </Text>
      ) : (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}>
          Only the topic is sent to Gemini. You review and edit the draft before saving.
        </Text>
      )}

      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.destructive }}>
          {error}
        </Text>
      ) : null}

      <Button variant="primary" icon={Sparkle} onPress={generate} loading={busy} disabled={!canGenerate}>
        {status === 'error' ? 'Try again' : 'Generate draft'}
      </Button>
    </Sheet>
  )
}
