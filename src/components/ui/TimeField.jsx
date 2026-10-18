import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CaretRight } from '../../icons.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import Chip from './Chip.jsx'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]
const pad = (n) => String(n).padStart(2, '0')

function parse(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || '')
  if (!match) return { hour: null, minute: null }
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

export default function TimeField({ label, value, onChange, hint }) {
  const { c, fonts, radius, text } = useTheme()
  const [open, setOpen] = useState(false)
  const { hour, minute } = parse(value)

  const set = (nextHour, nextMinute) => {
    if (nextHour == null || nextMinute == null) return
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`)
  }

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'not set'}`}
        onPress={() => setOpen((prev) => !prev)}
        style={{
          minHeight: 46,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: open ? c.primary : c.border,
          backgroundColor: c.background,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text style={{ fontFamily: fonts.sans, fontSize: text.body, color: value ? c.foreground : c.mutedForeground }}>
          {value || 'No time'}
        </Text>
        <CaretRight
          size={14}
          weight="bold"
          color={c.mutedForeground}
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
        />
      </Pressable>

      {open ? (
        <View style={{ gap: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, padding: 10 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.mutedForeground }}>Hour</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {HOURS.map((h) => (
                <Chip key={h} active={hour === h} onPress={() => set(h, minute ?? 0)}>
                  {pad(h)}
                </Chip>
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.mutedForeground }}>Minute</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {MINUTES.map((m) => (
                <Chip key={m} active={minute === m} onPress={() => set(hour ?? 9, m)}>
                  {pad(m)}
                </Chip>
              ))}
            </View>
          </View>
          {value ? (
            <Pressable accessibilityRole="button" onPress={() => onChange('')} hitSlop={6}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {hint ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>{hint}</Text>
      ) : null}
    </View>
  )
}
