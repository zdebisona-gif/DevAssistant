import { area, curveMonotoneX, line } from 'd3-shape'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const HEIGHT = 200
const PAD = { top: 12, right: 10, bottom: 24, left: 46 }

export function ChartLegend() {
  const { c, fonts } = useTheme()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: c.chart1 }} />
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: c.mutedForeground }}>
          Spend
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 16, borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.chart2 }} />
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: c.mutedForeground }}>
          Income
        </Text>
      </View>
    </View>
  )
}

export default function TrendAreaChart({ data, tableCaption = 'Monthly income and spend' }) {
  const { c, fonts } = useTheme()
  const [width, setWidth] = useState(0)
  const [tableOpen, setTableOpen] = useState(false)

  const avgSpend = Math.round(data.reduce((sum, d) => sum + d.spend, 0) / data.length)
  const avgIncome = Math.round(data.reduce((sum, d) => sum + d.income, 0) / data.length)

  const maxVal = Math.max(...data.map((d) => Math.max(d.spend, d.income)), 1)
  const niceMax = Math.ceil(maxVal / 1000) * 1000

  const innerW = Math.max(width - PAD.left - PAD.right, 0)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const x = (i) => PAD.left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW)
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

  const gridValues = [0, niceMax / 2, niceMax]
  const showEvery = data.length > 7 ? 2 : 1

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
                    x={PAD.left - 6}
                    y={y(value) + 4}
                    fontSize={10}
                    fill={c.mutedForeground}
                    textAnchor="end"
                  >
                    ₱{(value / 1000).toFixed(1)}k
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

            {data.map((row, i) =>
              i % showEvery === 0 ? (
                <SvgText
                  key={row.month}
                  x={x(i)}
                  y={HEIGHT - 6}
                  fontSize={10}
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
          marginTop: 8,
          fontFamily: fonts.sans,
          fontSize: 11,
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
        onPress={() => setTableOpen((open) => !open)}
        hitSlop={8}
        style={{ marginTop: 12 }}
      >
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: c.primaryFg }}>
          {tableOpen ? 'Hide data table' : 'View data table'}
        </Text>
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
            <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 11, color: c.mutedForeground }}>
              Month
            </Text>
            <Text
              style={{
                width: 90,
                textAlign: 'right',
                fontFamily: fonts.sansMedium,
                fontSize: 11,
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
                fontSize: 11,
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
              <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: c.foreground }}>
                {row.month}
              </Text>
              <Text
                style={{
                  width: 90,
                  textAlign: 'right',
                  fontFamily: fonts.mono,
                  fontSize: 12,
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
                  fontSize: 12,
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
