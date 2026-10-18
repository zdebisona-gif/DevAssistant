import { Text, View } from 'react-native'
import Chip from './Chip.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function TagPicker({ label, options, value, onChange, style }) {
  const { fonts, text, c } = useTheme()
  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? (
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => (
          <Chip key={option} active={value === option} onPress={() => onChange(option)}>
            {option}
          </Chip>
        ))}
      </View>
    </View>
  )
}
