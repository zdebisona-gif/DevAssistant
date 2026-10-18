import { WarningCircle } from '../../icons.js'
import { Text, View } from 'react-native'
import Button from './Button.jsx'
import EmptyState from './EmptyState.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function ErrorState({ error, onRetry }) {
  const { c, fonts, text } = useTheme()
  const message = error?.message || 'Something went wrong while reaching your data.'
  return (
    <View>
      <EmptyState
        icon={WarningCircle}
        title="Couldn't load your data"
        description={message}
        action={<Button variant="secondary" size="sm" onPress={onRetry}>Try again</Button>}
      />
      <Text
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontFamily: fonts.mono,
          fontSize: text.micro,
          color: c.mutedForeground,
        }}
      >
        Check your connection and Supabase keys
      </Text>
    </View>
  )
}
