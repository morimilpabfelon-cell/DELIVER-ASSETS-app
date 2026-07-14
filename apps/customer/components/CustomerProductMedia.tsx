import { useState } from 'react'
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { C } from '@/theme'

export function CustomerProductMedia({
  uri,
  symbol,
  style,
  imageStyle,
}: {
  uri?: string | null
  symbol: string
  style?: StyleProp<ViewStyle>
  imageStyle?: StyleProp<ImageStyle>
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null)
  const visibleUri = uri && uri !== failedUri ? uri : null

  return <View style={[styles.frame, style]}>
    {visibleUri
      ? <Image
          key={visibleUri}
          source={{ uri: visibleUri }}
          resizeMode="cover"
          onError={() => setFailedUri(visibleUri)}
          accessibilityLabel="Fotografía real del producto"
          style={[StyleSheet.absoluteFillObject, styles.image, imageStyle]}
        />
      : <Text style={styles.symbol}>{symbol}</Text>}
  </View>
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.yellow,
  },
  image: { width: '100%', height: '100%' },
  symbol: { fontSize: 44, fontWeight: '900' },
})
