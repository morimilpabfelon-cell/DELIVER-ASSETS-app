import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Button, Header, Kicker } from '@/components/UI'
import { useFeedback } from '@/components/FeedbackProvider'
import { businessTemplates, stores } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { parseAttributes, parseVariants, productHints } from '@/utils/productForm'
import { C, shadow, tone } from '@/theme'

export default function CreateProduct() {
  const router = useRouter()
  const { showToast, showDialog } = useFeedback()
  const { currentMerchantStoreId, currentMerchantPublicProfile, createMerchantProduct, syncNow } = useApp()
  const store = stores.find((item) => item.id === currentMerchantStoreId) ?? stores[0]
  const template = businessTemplates[currentMerchantPublicProfile.businessType]
  const hints = productHints(currentMerchantPublicProfile.businessType)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [symbol, setSymbol] = useState('')
  const [group, setGroup] = useState('')
  const [brand, setBrand] = useState('')
  const [unit, setUnit] = useState('')
  const [presentation, setPresentation] = useState('')
  const [tags, setTags] = useState('')
  const [attributes, setAttributes] = useState('')
  const [variants, setVariants] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = useMemo(() => name.trim().length >= 2 && description.trim().length >= 8 && Number(price) > 0 && group.trim().length > 0, [description, group, name, price])

  const create = async (publish: boolean) => {
    if (saving) return
    setSaving(true)
    const result = createMerchantProduct({
      name,
      description,
      price: Number(price),
      symbol,
      group,
      brand,
      unit,
      presentation,
      tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
      attributes: parseAttributes(attributes),
      variants: parseVariants(variants),
      status: publish ? 'published' : 'draft',
    })
    if (!result.ok || !result.productId) {
      setSaving(false)
      showToast({ title: 'No se creó el producto', message: result.message, tone: 'error' })
      return
    }
    const synced = await syncNow()
    setSaving(false)
    showDialog({
      title: publish ? 'Producto publicado' : 'Borrador guardado',
      message: synced ? `${name.trim()} quedó sincronizado. Ahora agrega una fotografía real.` : `${name.trim()} quedó guardado en Business y se sincronizará después.`,
      tone: synced ? 'success' : 'warning',
      actions: [
        { label: 'Volver al catálogo', tone: 'secondary', onPress: () => router.replace('/business') },
        { label: 'Agregar fotografía', tone: 'primary', onPress: () => router.replace({ pathname: '/product/[id]', params: { id: String(result.productId) } }) },
      ],
    })
  }

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <Header title="NUEVO PRODUCTO" kicker={`${store.name.toUpperCase()} · ${template.label.toUpperCase()}`} onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { backgroundColor: tone(template.accent) }]}>
        <Kicker>{template.catalogTitle}</Kicker>
        <Text style={styles.heroTitle}>CREA UNA{`\n`}FICHA REAL.</Text>
        <Text style={styles.heroCopy}>{template.catalogSubtitle}</Text>
      </View>

      <Field label="NOMBRE" value={name} onChangeText={setName} placeholder="Nombre visible para el cliente"/>
      <Field label="DESCRIPCIÓN" value={description} onChangeText={setDescription} placeholder="Qué recibe exactamente el cliente" multiline/>
      <View style={styles.twoCols}>
        <View style={styles.col}><Field label="PRECIO" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad"/></View>
        <View style={styles.col}><Field label="SÍMBOLO" value={symbol} onChangeText={setSymbol} placeholder="DA" maxLength={5}/></View>
      </View>
      <Field label={template.groupLabel} value={group} onChangeText={setGroup} placeholder={hints.group}/>
      <Field label="MARCA" value={brand} onChangeText={setBrand} placeholder="Opcional"/>
      <View style={styles.twoCols}>
        <View style={styles.col}><Field label="UNIDAD / PESO" value={unit} onChangeText={setUnit} placeholder="Ej. 1 kg"/></View>
        <View style={styles.col}><Field label="PRESENTACIÓN" value={presentation} onChangeText={setPresentation} placeholder="Ej. Caja"/></View>
      </View>
      <Field label="ETIQUETAS" value={tags} onChangeText={setTags} placeholder="separadas, por, comas"/>
      <Field label="ATRIBUTOS" value={attributes} onChangeText={setAttributes} placeholder={`${hints.primary}\nEj. garantía: 12 meses`} multiline/>
      <Field label="VARIANTES" value={variants} onChangeText={setVariants} placeholder={`${hints.variants}\nFormato: nombre | stock | adicional`} multiline/>

      <View style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={24}/>
        <Text style={styles.noticeText}>El producto se identifica por un ID interno único. Si luego lo archivas, seguirá apareciendo en pedidos y boletas anteriores.</Text>
      </View>

      <Button label={saving ? 'GUARDANDO…' : 'GUARDAR BORRADOR'} onPress={() => void create(false)} color="white" disabled={!canSave || saving}/>
      <Button label={saving ? 'PUBLICANDO…' : 'PUBLICAR PRODUCTO'} onPress={() => void create(true)} color="black" disabled={!canSave || saving}/>
    </ScrollView>
  </SafeAreaView>
}

function Field({ label, multiline, ...props }: ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.textArea]} textAlignVertical={multiline ? 'top' : 'center'}/></View>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 42 },
  hero: { minHeight: 210, padding: 17, justifyContent: 'flex-end', borderWidth: 3, borderColor: C.black, ...shadow },
  heroTitle: { marginTop: 10, fontSize: 40, lineHeight: 35, fontWeight: '900', letterSpacing: -2 },
  heroCopy: { marginTop: 9, maxWidth: 280, fontSize: 9, lineHeight: 13, fontWeight: '800' },
  field: { marginTop: 16 },
  label: { marginBottom: 6, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  input: { minHeight: 52, paddingHorizontal: 12, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, fontSize: 10, fontWeight: '700' },
  textArea: { minHeight: 104, paddingTop: 12 },
  twoCols: { flexDirection: 'row', gap: 9 },
  col: { flex: 1 },
  notice: { minHeight: 84, marginVertical: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint },
  noticeText: { flex: 1, fontSize: 8, lineHeight: 12 },
})
