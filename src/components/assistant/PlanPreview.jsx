import { Pressable, Text, View } from 'react-native'
import { Check } from '../../icons.js'
import { formatDateShort } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function metaFor(item) {
  if (item.kind === 'unit') return `Unit · ${item.course}`
  const date = formatDateShort(item.date)
  const time = item.time ? String(item.time).slice(0, 5) : null
  return [date, time, item.tag].filter(Boolean).join(' · ')
}

/* Checkbox list of proposed plan items; the user picks what to add. */
export default function PlanPreview({ items, selected, onToggle }) {
  const { c, fonts, radius, text } = useTheme()

  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => {
        const checked = selected.has(item.key)
        return (
          <Pressable
            key={item.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={item.title}
            onPress={() => onToggle(item.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: checked ? c.primary : c.border,
              backgroundColor: checked ? c.primarySoft : c.card,
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: radius.sm,
                borderWidth: checked ? 0 : 1.5,
                borderColor: c.border,
                backgroundColor: checked ? c.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {checked ? <Check size={13} weight="bold" color={c.onPrimary} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                numberOfLines={2}
                style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
              >
                {item.title}
              </Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                {metaFor(item)}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
