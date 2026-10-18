import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CaretLeft, CaretRight } from '../../icons.js'
import { toISODate, todayISO } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function monthTitle(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function displayValue(value) {
  if (!value) return 'Pick a date'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DateField({ label, value, onChange, hint }) {
  const { c, fonts, radius, text } = useTheme()
  const [open, setOpen] = useState(false)
  const seed = value ? new Date(`${value}T00:00:00`) : new Date()
  const [view, setView] = useState(new Date(seed.getFullYear(), seed.getMonth(), 1))

  const cells = useMemo(() => {
    const firstWeekday = (view.getDay() + 6) % 7
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const list = Array.from({ length: firstWeekday }, () => null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(new Date(view.getFullYear(), view.getMonth(), day))
    }
    return list
  }, [view])

  const today = todayISO()

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayValue(value)}`}
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
          {displayValue(value)}
        </Text>
        <CaretRight
          size={14}
          weight="bold"
          color={c.mutedForeground}
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
        />
      </Pressable>

      {open ? (
        <View
          style={{
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.card,
            padding: 10,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={8}
              onPress={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <CaretLeft size={16} weight="bold" color={c.foreground} />
            </Pressable>
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.caption, color: c.foreground }}>
              {monthTitle(view)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              hitSlop={8}
              onPress={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <CaretRight size={16} weight="bold" color={c.foreground} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((day, index) => (
              <Text
                key={`${day}-${index}`}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontFamily: fonts.sansMedium,
                  fontSize: text.micro,
                  color: c.mutedForeground,
                }}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((date, index) => {
              if (!date) return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 36 }} />
              const iso = toISODate(date)
              const selected = iso === value
              const isToday = iso === today
              return (
                <Pressable
                  key={iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                  style={{ width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? c.primary : 'transparent',
                      borderWidth: !selected && isToday ? 1 : 0,
                      borderColor: c.primary,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: selected ? fonts.monoSemiBold : fonts.mono,
                        fontSize: text.caption,
                        color: selected ? c.onPrimary : c.foreground,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}

      {hint ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>{hint}</Text>
      ) : null}
    </View>
  )
}
