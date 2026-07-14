import { ReactNode, useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C } from '@/theme'

export function BusinessLogo({ uri, initials, size = 58 }: { uri?: string | null; initials: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null)
  const showPhoto = Boolean(uri && failedUri !== uri)
  useEffect(() => setFailedUri(null), [uri])
  return <View style={[styles.logo, { width: size, height: size, borderRadius: size / 2 }]}> 
    {showPhoto
      ? <Image key={uri} source={{ uri: uri! }} style={styles.fill} resizeMode="cover" onError={() => setFailedUri(uri ?? null)}/>
      : <Text style={[styles.logoText, { fontSize: Math.max(13, size * .3) }]}>{initials}</Text>}
  </View>
}

export function BusinessCover({ uri, children, height = 210 }: { uri?: string | null; children?: ReactNode; height?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null)
  const showPhoto = Boolean(uri && failedUri !== uri)
  useEffect(() => setFailedUri(null), [uri])
  return <View style={[styles.cover, { height }]}> 
    {showPhoto
      ? <Image key={uri} source={{ uri: uri! }} style={styles.coverImage} resizeMode="cover" onError={() => setFailedUri(uri ?? null)}/>
      : <View style={styles.coverFallback}><Ionicons name="storefront" size={42} color={C.white}/></View>}
    <View style={styles.overlay}/>
    <View style={styles.content}>{children}</View>
  </View>
}


export function ProductPhoto({ uri, symbol, size = 72 }: { uri?: string | null; symbol: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null)
  const showPhoto = Boolean(uri && failedUri !== uri)
  useEffect(() => setFailedUri(null), [uri])
  return <View style={[styles.productPhoto, { width: size, height: size }]}> 
    {showPhoto
      ? <Image key={uri} source={{ uri: uri! }} style={styles.fill} resizeMode="cover" onError={() => setFailedUri(uri ?? null)}/>
      : <View style={styles.productFallback}><Text style={styles.productFallbackText}>{symbol}</Text></View>}
  </View>
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  logoText: { color: C.black, fontWeight: '900' },
  fill: { width: '100%', height: '100%' },
  productPhoto: { overflow: 'hidden', borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  productFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.yellow },
  productFallbackText: { fontSize: 16, fontWeight: '900' },
  cover: { position: 'relative', overflow: 'hidden', borderWidth: 2, borderColor: C.black, backgroundColor: C.red },
  coverImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  coverFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.44)' },
  content: { flex: 1, padding: 16 },
})
