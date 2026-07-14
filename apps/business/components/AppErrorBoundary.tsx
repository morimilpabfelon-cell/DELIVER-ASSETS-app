import { Component, ErrorInfo, PropsWithChildren } from 'react'
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { C } from '@/theme'

type State = { error: Error | null }

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DELIVER ASSETS] Error de interfaz', error, info.componentStack)
  }

  private reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return <SafeAreaView style={styles.safe}>
      <View style={styles.mark}><Text style={styles.markText}>!</Text></View>
      <Text style={styles.kicker}>RECUPERACIÓN DE INTERFAZ</Text>
      <Text style={styles.title}>ALGO NO{'\n'}RESPONDIÓ.</Text>
      <Text style={styles.copy}>La aplicación contuvo el error para evitar una pantalla en blanco. Intenta reconstruir la vista. Si vuelve a ocurrir, revisa Metro y el Centro de resistencia.</Text>
      <View style={styles.errorBox}><Text style={styles.errorTitle}>DETALLE DE DESARROLLO</Text><Text style={styles.errorText} numberOfLines={5}>{this.state.error.message}</Text></View>
      <Pressable onPress={this.reset} style={({ pressed }) => [styles.button, pressed && { opacity: .72 }]}>
        <Text style={styles.buttonText}>INTENTAR DE NUEVO</Text><Text style={styles.arrow}>→</Text>
      </Pressable>
    </SafeAreaView>
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: C.red },
  mark: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.black, borderRadius: 36, backgroundColor: C.yellow },
  markText: { fontSize: 34, fontWeight: '900' },
  kicker: { marginTop: 22, color: C.white, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 12, color: C.white, fontSize: 53, lineHeight: 47, fontWeight: '900', letterSpacing: -2.5 },
  copy: { maxWidth: 520, marginTop: 15, color: C.white, fontSize: 11, lineHeight: 17 },
  errorBox: { marginTop: 20, padding: 13, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  errorTitle: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  errorText: { marginTop: 7, fontSize: 9, lineHeight: 14 },
  button: { minHeight: 52, marginTop: 16, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.black, backgroundColor: C.black },
  buttonText: { color: C.white, fontSize: 10, fontWeight: '900', letterSpacing: .8 },
  arrow: { color: C.white, fontSize: 22, fontWeight: '900' },
})
