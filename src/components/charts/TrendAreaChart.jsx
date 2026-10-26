import { area, curveMonotoneX, line } from 'd3-shape'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import { CaretDown } from '../../icons.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const HEIGHT = 200
const PAD = { top: 16, right: 16, bottom: 26, left: 48 }
const AXIS_SIZE = 10

const trimZero = (value) => String(Number(value.toFixed(2)))

function compactMoney(value) {
  if (value >= 1000000) return `₱${trimZero(value / 1000000)}M`
  if (value >= 1000) return `₱${trimZero(value / 1000)}k`
  return `₱${Math.round(value).toLocaleString()}`
}

function axisMax(value) {
  if (value <= 0) return 100
  if (value < 1000) return Math.ceil(value / 100) * 100
  if (value < 100000) return Math.ceil(value / 1000) * 1000
  return Math.ceil(value / 10000) * 10000
}

export function ChartLegend() {
  const { c, fonts, text } = useTheme()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: c.chart1 }} />
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          Spend
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 16, borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.chart2 }} />
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          Income
        </Text>
      </View>
    </View>
  )
}

export default function TrendAreaChart({ data, tableCaption = 'Monthly income and spend' }) {
  const { c, fonts, text } = useTheme()
  const [width, setWidth] = useState(0)
  const [tableOpen, setTableOpen] = useState(false)

  const count = data.length || 1
  const avgSpend = Math.round(data.reduce((sum, d) => sum + d.spend, 0) / count)
  const avgIncome = Math.round(data.reduce((sum, d) => sum + d.income, 0) / count)

  const maxVal = Math.max(...data.map((d) => Math.max(d.spend, d.income)), 0)
  const niceMax = axisMax(maxVal)

  const innerW = Math.max(width - PAD.left - PAD.right, 0)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const x = (i) => PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v) => PAD.top + innerH - (v / niceMax) * innerH

  const areaPath =
    width > 0
      ? area()
          .x((_, i) => x(i))
          .y0(PAD.top + innerH)
          .y1((d) => y(d.spend))
          .curve(curveMonotoneX)(data)
      : ''
  const incomePath =
    width > 0
      ? line()
          .x((_, i) => x(i))
          .y((d) => y(d.income))
          .curve(curveMonotoneX)(data)
      : ''

  const gridValues = [niceMax, niceMax / 2, 0]
  const labelEvery = data.length > 7 ? 2 : 1
  const showLabel = (i) => (data.length - 1 - i) % labelEvery === 0
  const last = data.length ? data[data.length - 1] : null
  const lastX = data.length ? x(data.length - 1) : 0

  return (
    <View>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height: HEIGHT, width: '100%' }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Area chart comparing monthly spend against income over the last ${data.length} months. Spend averages ₱${avgSpend.toLocaleString()} and income averages ₱${avgIncome.toLocaleString()} per month.`}
      >
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={c.chart1} stopOpacity={0.28} />
                <Stop offset="100%" stopColor={c.chart1} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            <G>
              {gridValues.map((value) => (
                <G key={value}>
                  <Line
                    x1={PAD.left}
                    y1={y(value)}
                    x2={width - PAD.right}
                    y2={y(value)}
                    stroke={c.chartGrid}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={PAD.left - 8}
                    y={y(value) + 3.5}
                    fontFamily={fonts.mono}
                    fontSize={AXIS_SIZE}
                    fill={c.mutedForeground}
                    textAnchor="end"
                  >
                    {compactMoney(value)}
                  </SvgText>
                </G>
              ))}
            </G>

            <Path d={areaPath} fill="url(#spendFill)" />
            <Path
              d={areaPath}
              fill="none"
              stroke={c.chart1}
              strokeWidth={2}
            />
            <Path
              d={incomePath}
              fill="none"
              stroke={c.chart2}
              strokeWidth={2}
              strokeDasharray="6 3"
            />

            {last && last.spend > 0 ? (
              <Circle
                cx={lastX}
                cy={y(last.spend)}
                r={3.5}
                fill={c.chart1}
                stroke={c.card}
                strokeWidth={2}
              />
            ) : null}
            {last && last.income > 0 ? (
              <Circle
                cx={lastX}
                cy={y(last.income)}
                r={3.5}
                fill={c.chart2}
                stroke={c.card}
                strokeWidth={2}
              />
            ) : null}

            {data.map((row, i) =>
              showLabel(i) ? (
                <SvgText
                  key={row.month}
                  x={x(i)}
                  y={HEIGHT - 8}
                  fontFamily={fonts.sans}
                  fontSize={AXIS_SIZE}
                  fill={c.mutedForeground}
                  textAnchor="middle"
                >
                  {row.month}
                </SvgText>
              ) : null,
            )}
          </Svg>
        ) : null}
      </View>

      <Text
        style={{
          marginTop: 12,
          fontFamily: fonts.sans,
          fontSize: text.caption,
          color: c.mutedForeground,
        }}
      >
        Averages{' '}
        <Text style={{ fontFamily: fonts.mono, color: c.body }}>₱{avgSpend.toLocaleString()}</Text>{' '}
        spend ·{' '}
        <Text style={{ fontFamily: fonts.mono, color: c.body }}>₱{avgIncome.toLocaleString()}</Text>{' '}
        income
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: tableOpen }}
        accessibilityHint={
          tableOpen
            ? 'Hides the monthly income and spend table'
            : 'Shows the monthly income and spend table'
        }
        onPress={() => setTableOpen((open) => !open)}
        hitSlop={2}
        style={({ pressed }) => ({
          marginTop: 12,
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingTop: 16,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.line,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
          {tableOpen ? 'Hide data table' : 'View data table'}
        </Text>
        <View style={{ transform: [{ rotate: tableOpen ? '180deg' : '0deg' }] }}>
          <CaretDown size={14} weight="bold" color={c.primaryFg} />
        </View>
      </Pressable>

      {tableOpen ? (
        <View style={{ marginTop: 8 }} accessibilityLabel={tableCaption}>
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: c.line,
              paddingBottom: 6,
            }}
          >
            <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.mutedForeground }}>
              Month
            </Text>
            <Text
              style={{
                width: 90,
                textAlign: 'right',
                fontFamily: fonts.sansMedium,
                fontSize: text.micro,
                color: c.mutedForeground,
              }}
            >
              Income
            </Text>
            <Text
              style={{
                width: 90,
                textAlign: 'right',
                fontFamily: fonts.sansMedium,
                fontSize: text.micro,
                color: c.mutedForeground,
              }}
            >
              Spend
            </Text>
          </View>
          {data.map((row) => (
            <View
              key={row.month}
              style={{
                flexDirection: 'row',
                borderBottomWidth: 1,
                borderBottomColor: c.line,
                paddingVertical: 6,
              }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: text.caption, color: c.foreground }}>
                {row.month}
              </Text>
              <Text
                style={{
                  width: 90,
                  textAlign: 'right',
                  fontFamily: fonts.mono,
                  fontSize: text.caption,
                  color: c.body,
                  fontVariant: ['tabular-nums'],
                }}
              >
                ₱{row.income.toLocaleString()}
              </Text>
              <Text
                style={{
                  width: 90,
                  textAlign: 'right',
                  fontFamily: fonts.mono,
                  fontSize: text.caption,
                  color: c.body,
                  fontVariant: ['tabular-nums'],
                }}
              >
                ₱{row.spend.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
