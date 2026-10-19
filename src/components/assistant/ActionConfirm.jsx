import { StyleSheet, Text, View } from 'react-native'
import { Check, Sparkle, WarningCircle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import { ACTION_LABELS } from '../../lib/actions.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* A proposal card: nothing is written until the user confirms. */
export default function ActionConfirm({ proposal, state = 'idle', error, onConfirm, onCancel }) {
  const { c, fonts, radius, text } = useTheme()
  const ai = proposal.source === 'ai'
  const busy = state === 'running'
  const done = state === 'done'
  const cancelled = state === 'cancelled'

  return (
    <View
      style={{
        gap: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        borderRadius: radius.lg,
        backgroundColor: c.card,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.monoSemiBold,
            fontSize: text.micro,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: c.mutedForeground,
          }}
        >
          Needs confirmation
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: ai ? c.accent : c.border,
            borderRadius: radius.sm,
            paddingHorizontal: 6,
            paddingVertical: 1,
          }}
        >
          <Sparkle size={10} weight="bold" color={ai ? c.accent : c.mutedForeground} />
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: text.micro,
              color: ai ? c.accent : c.mutedForeground,
            }}
          >
            {ai ? 'AI · Gemini' : 'On-device'}
          </Text>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.label, color: c.foreground }}>
          {ACTION_LABELS[proposal.action] || 'Change record'}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 20, color: c.body }}>
          {proposal.summary}
        </Text>
      </View>

      {proposal.details?.length ? (
        <View style={{ gap: 6 }}>
          {proposal.details.map((detail, index) => (
            <View
              key={`${detail.label}-${index}`}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
            >
              <Text
                style={{
                  width: 104,
                  fontFamily: fonts.sans,
                  fontSize: text.caption,
                  color: c.mutedForeground,
                }}
              >
                {detail.label}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.sansMedium,
                  fontSize: text.caption,
                  color: c.foreground,
                }}
              >
                {detail.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {proposal.destructive ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <WarningCircle size={14} weight="bold" color={c.destructive} />
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
            This cannot be undone.
          </Text>
        </View>
      ) : null}

      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
          {error}
        </Text>
      ) : null}

      {done ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Check size={14} weight="bold" color={c.accent} />
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.body }}>
            Done — the record is saved.
          </Text>
        </View>
      ) : cancelled ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          Cancelled — nothing changed.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="secondary" onPress={onCancel} disabled={busy} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="primary" onPress={onConfirm} loading={busy} style={{ flex: 1 }}>
            Confirm
          </Button>
        </View>
      )}
    </View>
  )
}
