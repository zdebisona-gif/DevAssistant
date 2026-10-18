import { Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  multiline = false,
  keyboardType,
  autoFocus = false,
}) {
  const { c, fonts, radius, text } = useTheme()
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        style={{
          minHeight: multiline ? 88 : 46,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.background,
          paddingHorizontal: 12,
          paddingTop: multiline ? 10 : 0,
          paddingBottom: multiline ? 10 : 0,
          color: c.foreground,
          fontFamily: fonts.sans,
          fontSize: text.body,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {hint ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}
