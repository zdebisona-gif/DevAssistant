import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CaretRight } from '../../icons.js'
import { formatClock12 } from '../../lib/format.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import Chip from './Chip.jsx'

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES = [0, 15, 30, 45]
const PERIODS = ['AM', 'PM']
const pad = (n) => String(n).padStart(2, '0')

function parse(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || '')
  if (!match) return { hour24: null, minute: null, hour12: null, period: null }
  const hour24 = Number(match[1])
  if (hour24 > 23) return { hour24: null, minute: null, hour12: null, period: null }
  return {
    hour24,
    minute: Number(match[2]),
    hour12: hour24 % 12 || 12,
    period: hour24 >= 12 ? 'PM' : 'AM',
  }
}

export default function TimeField({ label, value, onChange, hint }) {
  const { c, fonts, radius, text } = useTheme()
  const [open, setOpen] = useState(false)
  const { hour12, minute, period } = parse(value)

  const set = (nextHour, nextMinute, nextPeriod) => {
    const selectedHour = nextHour ?? hour12 ?? 12
    const selectedMinute = nextMinute ?? minute ?? 0
    const selectedPeriod = nextPeriod ?? period ?? 'AM'
    const hour24 = (selectedHour % 12) + (selectedPeriod === 'PM' ? 12 : 0)
    onChange(`${pad(hour24)}:${pad(selectedMinute)}`)
  }

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatClock12(value) || 'not set'}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: open ? c.primary : c.border,
          backgroundColor: c.background,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontFamily: fonts.mono,
            fontSize: text.body,
            color: value ? c.foreground : c.mutedForeground,
          }}
        >
          {formatClock12(value) || 'No time'}
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
                <Chip key={h} active={hour12 === h} onPress={() => set(h, minute ?? 0, period)}>
                  {h}
                </Chip>
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.mutedForeground }}>Minute</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {MINUTES.map((m) => (
                <Chip key={m} active={minute === m} onPress={() => set(hour12 ?? 12, m, period)}>
                  {pad(m)}
                </Chip>
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.mutedForeground }}>Period</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {PERIODS.map((p) => (
                <Chip key={p} active={period === p} onPress={() => set(hour12 ?? 12, minute ?? 0, p)}>
                  {p}
                </Chip>
              ))}
            </View>
          </View>
          {value ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Clear ${label}`}
              onPress={() => onChange('')}
              hitSlop={6}
              style={({ pressed }) => ({
                minHeight: 48,
                minWidth: 48,
                alignSelf: 'flex-start',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
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
