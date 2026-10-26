import { useId } from 'react'
import { Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  multiline = false,
  keyboardType,
  autoFocus = false,
  secureTextEntry = false,
  autoCapitalize,
  autoComplete,
  textContentType,
  onSubmitEditing,
  returnKeyType,
  editable = true,
  disabled = false,
}) {
  const { c, fonts, radius, text } = useTheme()
  const labelId = useId()
  const enabled = editable && !disabled

  return (
    <View style={{ gap: 6 }}>
      <Text
        nativeID={labelId}
        style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}
      >
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
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        textContentType={textContentType}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        editable={enabled}
        accessibilityLabel={label}
        accessibilityHint={error || hint || undefined}
        accessibilityLabelledBy={labelId}
        accessibilityState={{ disabled: !enabled }}
        style={{
          minHeight: multiline ? 96 : 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? c.destructive : c.border,
          backgroundColor: c.background,
          paddingHorizontal: 12,
          paddingTop: multiline ? 10 : 0,
          paddingBottom: multiline ? 10 : 0,
          color: c.foreground,
          fontFamily: fonts.sans,
          fontSize: text.body,
          textAlignVertical: multiline ? 'top' : 'center',
          opacity: enabled ? 1 : 0.6,
        }}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.destructiveText }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}
