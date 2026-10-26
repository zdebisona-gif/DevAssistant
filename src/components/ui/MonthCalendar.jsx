import * as Haptics from 'expo-haptics'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'
import { CaretLeft, CaretRight } from '../../icons.js'
import { isPlanEntryMissed, toISODate, todayISO } from '../../lib/analytics.js'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import FadeSwap from './FadeSwap.jsx'

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
  const { c, fonts, motion, radius, text } = useTheme()
  const reduced = useReducedMotion()
  const [view, setView] = useState(() => monthStart(selectedDate))
  const [gridWidth, setGridWidth] = useState(0)
  const [translateX] = useState(() => new Animated.Value(0))
  const [translateY] = useState(() => new Animated.Value(0))
  const [selectionOpacity] = useState(() => new Animated.Value(0))
  const settled = useRef(false)
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

  const weeks = useMemo(() => {
    const rows = []
    for (let index = 0; index < cells.length; index += 7) {
      rows.push(cells.slice(index, index + 7))
    }
    return rows
  }, [cells])

  const monthKey = `${view.getFullYear()}-${view.getMonth()}`
  const cellWidth = gridWidth > 0 ? gridWidth / 7 : 0
  const selectedIndex = useMemo(
    () => cells.findIndex((date) => date && toISODate(date) === selectedDate),
    [cells, selectedDate],
  )

  useEffect(() => {
    if (!cellWidth) return

    if (selectedIndex < 0) {
      settled.current = false
      if (reduced) {
        selectionOpacity.setValue(0)
      } else {
        Animated.timing(selectionOpacity, {
          toValue: 0,
          duration: motion.fast,
          useNativeDriver: true,
        }).start()
      }
      return
    }

    const x = (selectedIndex % 7) * cellWidth + (cellWidth - 36) / 2
    const y = Math.floor(selectedIndex / 7) * 48 + 6

    if (reduced || !settled.current) {
      translateX.setValue(x)
      translateY.setValue(y)
      selectionOpacity.setValue(1)
      settled.current = true
      return
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: x,
        duration: motion.fast,
        easing: Easing.bezier(0.22, 0, 0, 1),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: y,
        duration: motion.fast,
        easing: Easing.bezier(0.22, 0, 0, 1),
        useNativeDriver: true,
      }),
      Animated.timing(selectionOpacity, {
        toValue: 1,
        duration: motion.fast,
        useNativeDriver: true,
      }),
    ]).start()
  }, [cellWidth, motion.fast, reduced, selectedIndex, selectionOpacity, translateX, translateY])

  const moveMonth = (offset) => {
    Haptics.selectionAsync().catch(() => {})
    setView(new Date(view.getFullYear(), view.getMonth() + offset, 1))
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={4}
          onPress={() => moveMonth(-1)}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <CaretLeft size={17} weight="bold" color={c.foreground} />
        </Pressable>
        <FadeSwap swapKey={monthKey} style={{ flexShrink: 1 }}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              textAlign: 'center',
              fontFamily: fonts.sansSemiBold,
              fontSize: text.body,
              color: c.foreground,
            }}
          >
            {monthTitle(view)}
          </Text>
        </FadeSwap>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={4}
          onPress={() => moveMonth(1)}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <CaretRight size={17} weight="bold" color={c.foreground} />
        </Pressable>
      </View>

      <FadeSwap swapKey={monthKey}>
        <View style={{ gap: 10 }}>
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

          <View
            onLayout={(event) => {
              const next = event.nativeEvent.layout.width
              setGridWidth((current) => (Math.abs(current - next) > 0.5 ? next : current))
            }}
            style={{ position: 'relative' }}
          >
            {cellWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  backgroundColor: c.primary,
                  opacity: selectionOpacity,
                  transform: [{ translateX }, { translateY }],
                }}
              />
            ) : null}

            {weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={{ flexDirection: 'row' }}>
                {week.map((date, index) => {
                  if (!date) {
                    return (
                      <View
                        key={`blank-${weekIndex}-${index}`}
                        style={{ flex: 1, height: 48 }}
                      />
                    )
                  }

                  const iso = toISODate(date)
                  const selected = iso === selectedDate
                  const isToday = iso === today
                  const dayEntries = byDate.get(iso) || []
                  const missed = dayEntries.filter((entry) => isPlanEntryMissed(entry))
                  const dots = [...dayEntries]
                    .sort((a, b) => {
                      const rank = (entry) =>
                        isPlanEntryMissed(entry) ? 0 : entry.done ? 2 : 1
                      return rank(a) - rank(b)
                    })
                    .slice(0, 3)
                  const countLabel = dayEntries.length
                    ? `, ${dayEntries.length} ${dayEntries.length === 1 ? 'entry' : 'entries'}${
                        missed.length ? `, ${missed.length} missed` : ''
                      }`
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
                      })}${isToday ? ', today' : ''}${countLabel}`}
                      onPress={() => {
                        if (selected) return
                        Haptics.selectionAsync().catch(() => {})
                        onSelectDate(iso)
                      }}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 48,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          borderRadius: radius.pill,
                          borderWidth: !selected && isToday ? 1 : 0,
                          borderColor: c.primary,
                        }}
                      >
                          <Text
                            style={{
                              fontFamily: selected ? fonts.monoSemiBold : fonts.mono,
                              fontSize: text.caption,
                              color: selected
                                ? c.onPrimary
                                : missed.length
                                  ? c.destructiveText
                                  : isToday
                                    ? c.primaryFg
                                    : c.foreground,
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {date.getDate()}
                          </Text>
                          {dots.length ? (
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              {dots.map((entry) => (
                                <View
                                  key={entry.id}
                                  style={{
                                    width: 3,
                                    height: 3,
                                    borderRadius: radius.pill,
                                    backgroundColor: isPlanEntryMissed(entry)
                                      ? c.destructive
                                      : selected
                                        ? c.onPrimary
                                        : entry.done
                                          ? c.mutedForeground
                                          : c.primary,
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
            ))}
          </View>
        </View>
      </FadeSwap>
    </View>
  )
}
