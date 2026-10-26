import { WarningCircle } from '../../icons.js'
import { Text, View } from 'react-native'
import Button from './Button.jsx'
import EmptyState from './EmptyState.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function ErrorState({ error, onRetry }) {
  const { c, fonts, text } = useTheme()
  const detail = __DEV__ ? error?.message : null
  return (
    <View>
      <EmptyState
        icon={WarningCircle}
        title="Couldn't load your data"
        description="Check your connection and try again. Your records are safe."
        action={<Button variant="secondary" size="sm" onPress={onRetry}>Try again</Button>}
      />
      {detail ? (
        <Text
          style={{
            marginTop: 4,
            textAlign: 'center',
            fontFamily: fonts.mono,
            fontSize: text.micro,
            color: c.mutedForeground,
          }}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  )
}
