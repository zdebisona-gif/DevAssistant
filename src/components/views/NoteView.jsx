import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Sparkle, Star, Trash } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Sheet from '../ui/Sheet.jsx'
import { relativeTime } from '../../lib/analytics.js'
import { useAiPrefs } from '../../data/aiPrefs.jsx'
import { buildNoteContext } from '../../lib/context.js'
import { askGemini, describeGeminiError, inCooldown } from '../../lib/gemini.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* Read-only popup for a note, with Edit, Delete and an explicit Gemini summary. */
export default function NoteView({
  note,
  onClose,
  onEdit,
  onDelete,
  onToggleImportant,
  importantBusy = false,
}) {
  const { c, fonts, radius, text } = useTheme()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [summary, setSummary] = useState(null)
  const [busy, setBusy] = useState(false)
  const stamp = note ? relativeTime(note.updated_at) : ''
  const subtitle = note?.tag ? `${note.tag} · ${stamp}` : stamp

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(null)
    setBusy(false)
  }, [note?.id])

  const summarize = async () => {
    if (busy || !note) return
    setBusy(true)
    try {
      const { context } = buildNoteContext(note)
      const { text: aiText, model, remaining, cap } = await askGemini({
        task: 'summarize-note',
        question: `Summarize this note: ${note.title}`,
        context,
      })
      recordUsage({ remaining, cap, model })
      setSummary({ kind: 'ok', text: aiText })
    } catch (error) {
      setSummary({ kind: 'error', text: describeGeminiError(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet visible={Boolean(note)} onClose={onClose} title={note?.title ?? ''} subtitle={subtitle}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={note?.important ? 'Important note' : 'Mark note important'}
        accessibilityState={{
          checked: Boolean(note?.important),
          disabled: importantBusy || !onToggleImportant,
        }}
        disabled={importantBusy || !onToggleImportant}
        onPress={onToggleImportant}
        style={({ pressed }) => ({
          minHeight: 48,
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: note?.important ? c.accent : c.border,
          backgroundColor: note?.important ? c.accentSoft : c.card,
          opacity: importantBusy ? 0.5 : pressed ? 0.85 : 1,
        })}
      >
        <Star
          size={17}
          weight={note?.important ? 'fill' : 'regular'}
          color={note?.important ? c.accent : c.mutedForeground}
        />
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: text.caption,
            color: note?.important ? c.accentText : c.foreground,
          }}
        >
          {note?.important ? 'Important' : 'Mark important'}
        </Text>
      </Pressable>

      {note?.body ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 22, color: c.body }}>
          {note.body}
        </Text>
      ) : (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.body, color: c.mutedForeground }}>
          This note has no body yet.
        </Text>
      )}

      {note?.body && aiEnabled ? (
        <View style={{ gap: 10 }}>
          {summary ? (
            <View
              style={{
                borderLeftWidth: 2,
                borderLeftColor: summary.kind === 'ok' ? c.accent : c.border,
                paddingLeft: 10,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkle size={13} weight="bold" color={c.accent} />
                <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                  {summary.kind === 'ok' ? 'AI · Gemini' : 'Unavailable'}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 19, color: c.body }}>
                {summary.text}
              </Text>
            </View>
          ) : null}
          <Button
            variant="secondary"
            icon={Sparkle}
            disabled={busy || inCooldown()}
            onPress={summarize}
          >
            {busy ? 'Summarizing…' : 'Summarize with Gemini'}
          </Button>
        </View>
      ) : null}

      {note?.body && !aiEnabled ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}>
          Turn on AI in Settings to summarize this note.
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="primary" onPress={onEdit} style={{ flex: 1 }}>
          Edit
        </Button>
        <Button variant="secondary" icon={Trash} onPress={onDelete}>
          Delete
        </Button>
      </View>
    </Sheet>
  )
}
