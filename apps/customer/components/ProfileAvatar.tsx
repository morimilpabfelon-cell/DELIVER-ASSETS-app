import { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { C } from '@/theme'

export function ProfileAvatar({ photoUri, initials, size = 64, backgroundColor = C.blue }: { photoUri?: string | null; initials: string; size?: number; backgroundColor?: string }) {
  const radius = size / 2
  const [failedUri, setFailedUri] = useState<string | null>(null)
  const showPhoto = Boolean(photoUri && failedUri !== photoUri)

  useEffect(() => { setFailedUri(null) }, [photoUri])

  return <View style={[styles.root, { width: size, height: size, borderRadius: radius, backgroundColor }]}>
    {showPhoto
      ? <Image key={photoUri} source={{ uri: photoUri! }} style={[styles.image, { borderRadius: radius - 3 }]} resizeMode="cover" onError={() => setFailedUri(photoUri ?? null)}/>
      : <Text style={[styles.text, { fontSize: Math.max(13, size * .34) }]}>{initials}</Text>}
  </View>
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: C.black },
  image: { width: '100%', height: '100%' },
  text: { color: C.white, fontWeight: '900' },
})
