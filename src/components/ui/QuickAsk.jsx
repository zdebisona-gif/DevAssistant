import { useRouter } from 'expo-router'
import { PaperPlaneRight, Sparkle } from '../../icons.js'
import { useState } from 'react'
import { Keyboard, StyleSheet, TextInput, View } from 'react-native'
import { useData } from '../../data/store.jsx'
import { deriveSuggestions } from '../../lib/ask.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import Button from './Button.jsx'
import Chip from './Chip.jsx'

export default function QuickAsk() {
  const { c, fonts, radius, text } = useTheme()
  const { data } = useData()
  const router = useRouter()
  const [value, setValue] = useState('')
  const suggestions = deriveSuggestions(data, 3)

  const submit = (raw) => {
    const q = raw.trim()
    if (!q) return
    Keyboard.dismiss()
    setValue('')
    router.push({ pathname: '/ask', params: { q } })
  }

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          backgroundColor: c.card,
          paddingLeft: 14,
          paddingRight: 8,
        }}
      >
        <Sparkle size={18} weight="fill" color={c.primary} />
        <TextInput
          value={value}
          onChangeText={setValue}
          onSubmitEditing={() => submit(value)}
          returnKeyType="send"
          placeholder="Ask Zen-I about your money, notes, plans or study"
          placeholderTextColor={c.mutedForeground}
          accessibilityLabel="Ask Zen-I"
          style={{
            flex: 1,
            paddingVertical: 12,
            fontFamily: fonts.sans,
            fontSize: text.body,
            color: c.foreground,
          }}
        />
        <Button
          variant="primary"
          size="icon"
          icon={PaperPlaneRight}
          accessibilityLabel="Send question"
          disabled={!value.trim()}
          onPress={() => submit(value)}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {suggestions.map((suggestion) => (
          <Chip key={suggestion} onPress={() => submit(suggestion)}>
            {suggestion}
          </Chip>
        ))}
      </View>
    </View>
  )
}
