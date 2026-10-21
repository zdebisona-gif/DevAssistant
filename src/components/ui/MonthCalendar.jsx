import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CaretLeft, CaretRight } from '../../icons.js'
import { toISODate, todayISO } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const CELLS = 42

function monthStart(value) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date()
  if (Number.isNaN(date.getTime())) {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthTitle(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function MonthCalendar({ selectedDate, onSelectDate, entries = [] }) {
  const { c, fonts, radius, text } = useTheme()
  const [view, setView] = useState(() => monthStart(selectedDate))
  const today = todayISO()

  const byDate = useMemo(() => {
    const map = new Map()
    for (const entry of entries) {
      if (!entry.entry_date) continue
      const list = map.get(entry.entry_date) || []
      list.push(entry)
      map.set(entry.entry_date, list)
    }
    return map
  }, [entries])

  const cells = useMemo(() => {
    const firstWeekday = (view.getDay() + 6) % 7
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const list = Array.from({ length: firstWeekday }, () => null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(new Date(view.getFullYear(), view.getMonth(), day))
    }
    while (list.length < CELLS) list.push(null)
    return list
  }, [view])

  const moveMonth = (offset) => {
    setView(new Date(view.getFullYear(), view.getMonth() + offset, 1))
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
          onPress={() => moveMonth(-1)}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <CaretLeft size={17} weight="bold" color={c.foreground} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
        >
          {monthTitle(view)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={8}
          onPress={() => moveMonth(1)}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <CaretRight size={17} weight="bold" color={c.foreground} />
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
          if (!date) {
            return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 48 }} />
          }

          const iso = toISODate(date)
          const selected = iso === selectedDate
          const isToday = iso === today
          const dayEntries = byDate.get(iso) || []
          const allDone = dayEntries.length > 0 && dayEntries.every((entry) => entry.done)
          const dotColor = selected ? c.onPrimary : allDone ? c.mutedForeground : c.primary
          const countLabel = dayEntries.length
            ? `, ${dayEntries.length} ${dayEntries.length === 1 ? 'entry' : 'entries'}`
            : ''

          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${date.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}${countLabel}`}
              onPress={() => onSelectDate(iso)}
              style={{ width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? c.primary : 'transparent',
                  borderWidth: !selected && isToday ? 1 : 0,
                  borderColor: c.primary,
                }}
              >
                <Text
                  style={{
                    fontFamily: selected ? fonts.monoSemiBold : fonts.mono,
                    fontSize: text.caption,
                    color: selected ? c.onPrimary : isToday ? c.primaryFg : c.foreground,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {date.getDate()}
                </Text>
                {dayEntries.length ? (
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {dayEntries.slice(0, 3).map((entry) => (
                      <View
                        key={entry.id}
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: radius.pill,
                          backgroundColor: dotColor,
                        }}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
