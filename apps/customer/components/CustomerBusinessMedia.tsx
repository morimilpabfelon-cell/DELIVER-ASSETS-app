import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import type { SharedBusinessProfile } from '@/data/merchantCatalog'
import type { Store } from '@/data/catalog'
import { C, tone } from '@/theme'

function useVisibleUri(uri?: string | null) {
  const [failedUri, setFailedUri] = useState<string | null>(null)

  useEffect(() => {
    setFailedUri(null)
  }, [uri])

  return {
    visibleUri: uri && uri !== failedUri ? uri : null,
    fail: () => uri && setFailedUri(uri),
  }
}

export function CustomerBusinessLogo({
  profile,
  store,
  size = 58,
  style,
}: {
  profile: SharedBusinessProfile
  store: Store
  size?: number
  style?: StyleProp<ViewStyle>
}) {
  const { visibleUri, fail } = useVisibleUri(profile.logoUrl)

  return <View
    accessibilityLabel={`Logo de ${profile.name}`}
    style={[
      styles.logo,
      {
        width: size,
        height: size,
        borderRadius: Math.round(size / 2),
        backgroundColor: tone(store.tone),
      },
      style,
    ]}
  >
    {visibleUri
      ? <Image
          key={visibleUri}
          source={{ uri: visibleUri }}
          resizeMode="cover"
          onError={fail}
          style={StyleSheet.absoluteFillObject}
        />
      : <Text style={[styles.logoText, { fontSize: Math.max(10, Math.round(size * .25)) }]}>{store.symbol}</Text>}
  </View>
}

export function CustomerBusinessCover({
  profile,
  store,
  style,
  children,
}: {
  profile: SharedBusinessProfile
  store: Store
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}) {
  const { visibleUri, fail } = useVisibleUri(profile.coverUrl)

  return <View
    accessibilityLabel={`Portada de ${profile.name}`}
    style={[styles.cover, { backgroundColor: tone(store.tone) }, style]}
  >
    {visibleUri && <Image
      key={visibleUri}
      source={{ uri: visibleUri }}
      resizeMode="cover"
      onError={fail}
      style={StyleSheet.absoluteFillObject}
    />}
    {visibleUri && <View style={styles.coverShade}/>}
    {children}
  </View>
}

const styles = StyleSheet.create({
  logo: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.black,
  },
  logoText: { fontWeight: '900', letterSpacing: -1 },
  cover: { overflow: 'hidden' },
  coverShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,.20)',
  },
})
