import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { DotsThreeVertical, Minus, Plus } from '../../icons.js'
import { ACCOUNT_KIND_LABELS } from '../../data/constants.js'
import { moneyOr } from '../../lib/format.js'
import { accountColorGradients, accountGradients } from '../../theme/tokens.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import IconButton from './IconButton.jsx'

/*
 * A manual account drawn as a physical-looking card: a branded gradient surface with the
 * live balance and this month's tagged income. The balance is derived (opening balance
 * plus the transactions tagged to it), so it moves when spending is logged against it.
 */

const TONES = accountGradients

export const ACCOUNT_CARD_WIDTH = 280
export const ACCOUNT_CARD_HEIGHT = 172

function CardIconButton({ icon: Icon, accessibilityLabel, onPress }) {
  return (
    <IconButton
      icon={Icon}
      size={36}
      iconSize={15}
      color="#ffffff"
      background="rgba(255,255,255,0.16)"
      pressedBackground="rgba(255,255,255,0.32)"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      ripple={false}
      stopPropagation
    />
  )
}

function AccountCard({ account, hidden, onEdit, onAdjust, onMenu }) {
  const { fonts, text, radius } = useTheme()
  const [from, to] = accountColorGradients[account.color] || TONES[account.kind] || TONES.other
  const gradientId = `zeni-account-${account.id}`
  const kindLabel = ACCOUNT_KIND_LABELS[account.kind] || ACCOUNT_KIND_LABELS.other

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, balance ${moneyOr(account.balance, hidden, 2)}`}
      onPress={() => onEdit(account)}
      style={({ pressed }) => ({
        width: ACCOUNT_CARD_WIDTH,
        height: ACCOUNT_CARD_HEIGHT,
        borderRadius: radius.lg,
        overflow: 'hidden',
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        <Circle cx="86%" cy="16%" r="72" fill="rgba(255,255,255,0.10)" />
        <Circle cx="70%" cy="104%" r="96" fill="rgba(255,255,255,0.07)" />
      </Svg>
      <View
        style={{
          flex: 1,
          padding: 16,
          justifyContent: 'space-between',
          backgroundColor: 'transparent',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: '#ffffff' }}>
              {account.name}
            </Text>
            <View
              style={{
                alignSelf: 'flex-start',
                borderRadius: radius.pill,
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.mono,
                  fontSize: text.micro,
                  letterSpacing: 0.4,
                  color: '#ffffff',
                }}
              >
                {kindLabel}
              </Text>
            </View>
          </View>
          <CardIconButton
            icon={DotsThreeVertical}
            accessibilityLabel={`${account.name}, more options`}
            onPress={() => onMenu(account)}
          />
        </View>

        <View style={{ gap: 2 }}>
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: text.micro,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            Balance
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.monoSemiBold,
              fontSize: 26,
              color: '#ffffff',
              fontVariant: ['tabular-nums'],
            }}
          >
            {moneyOr(account.balance, hidden, 2)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.mono, fontSize: text.micro, color: 'rgba(255,255,255,0.82)' }}
          >
            In this month · {moneyOr(account.income, hidden, 2)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <CardIconButton
              icon={Plus}
              accessibilityLabel={`Add money to ${account.name}`}
              onPress={() => onAdjust(account, 'add')}
            />
            <CardIconButton
              icon={Minus}
              accessibilityLabel={`Take money out of ${account.name}`}
              onPress={() => onAdjust(account, 'subtract')}
            />
          </View>
        </View>
      </View>
    </Pressable>
  )
}

export default memo(AccountCard)