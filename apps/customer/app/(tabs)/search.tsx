import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { categories, CategoryKey, categoryByKey, stores, templateForStore } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { CustomerBusinessLogo } from '@/components/CustomerBusinessMedia'
import { C, tone } from '@/theme'
import { CartDock } from '@/components/CartDock'

type SearchCategory = CategoryKey | 'all'

export default function Search() {
  const router = useRouter()
  const params = useLocalSearchParams<{ category?: string }>()
  const { getStoreProducts, getStorePublicProfile } = useApp()
  const initial = categories.some((item) => item.key === params.category) ? params.category as CategoryKey : 'all'
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<SearchCategory>(initial)

  useEffect(() => { setCategory(initial) }, [initial])

  const meta = category === 'all' ? null : categoryByKey(category)
  const results = useMemo(() => {
    const normalized = q.trim().toLowerCase()
    return stores.filter((store) => {
      if (category !== 'all' && store.category !== category) return false
      if (!normalized) return true
      const publicProfile = getStorePublicProfile(store.id)
      const products = getStoreProducts(store.id)
      const searchable = [
        publicProfile.name,
        publicProfile.descriptor,
        publicProfile.description,
        templateForStore(store).label,
        ...products.flatMap((product) => [
          product.name,
          product.group,
          product.brand ?? '',
          product.presentation ?? '',
          product.unit ?? '',
          ...(product.tags ?? []),
          ...Object.values(product.attributes ?? {}),
          ...(product.variants ?? []).map((variant) => variant.label),
        ]),
      ].join(' ').toLowerCase()
      return searchable.includes(normalized)
    })
  }, [q, category, getStoreProducts, getStorePublicProfile])

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={[styles.header, { backgroundColor: meta ? tone(meta.tone) : C.mint }]}>
      <Text style={styles.kicker}>BÚSQUEDA POR UNIVERSO</Text>
      <Text style={styles.title}>{meta ? `SOLO\n${meta.label.toUpperCase()}.` : 'ENCUENTRA\nLO QUE QUIERAS.'}</Text>
      <View style={styles.input}>
        <Ionicons name="search" size={20}/>
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder={meta?.searchPlaceholder ?? 'Tienda, categoría o producto'} placeholderTextColor={C.gray} style={styles.inputText}/>
        {q.length > 0 && <Pressable onPress={() => setQ('')}><Ionicons name="close-circle" size={20}/></Pressable>}
      </View>
    </View>

    <View style={styles.filters}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
      <Pressable onPress={() => setCategory('all')} style={[styles.filter, category === 'all' && styles.filterActive]}><Text style={[styles.filterText, category === 'all' && styles.filterTextActive]}>TODO</Text></Pressable>
      {categories.map((item) => <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.filter, category === item.key && { backgroundColor: tone(item.tone) }]}><Text style={styles.filterText}>{item.label.toUpperCase()}</Text></Pressable>)}
    </ScrollView></View>

    <ScrollView contentContainerStyle={styles.content}>
      {meta && <View style={styles.rule}><Ionicons name="shield-checkmark" size={18}/><Text style={styles.ruleText}>{meta.purity}</Text></View>}
      <Text style={styles.count}>{results.length} RESULTADOS {category !== 'all' ? `EN ${meta?.label.toUpperCase()}` : ''}</Text>
      {results.map((store) => {
        const publicProfile = getStorePublicProfile(store.id)
        const products = getStoreProducts(store.id)
        const template = templateForStore(store)
        return <Pressable key={store.id} onPress={() => router.push({ pathname: '/store/[id]', params: { id: String(store.id) } })} style={styles.row}>
          <CustomerBusinessLogo profile={publicProfile} store={store} size={62}/>
          <View style={{ flex: 1 }}>
            <Text style={styles.categoryLabel}>{categoryByKey(store.category).label.toUpperCase()} · {template.label.toUpperCase()}</Text>
            <Text style={styles.name}>{publicProfile.name.toUpperCase()}</Text>
            <Text style={styles.desc}>{publicProfile.descriptor || store.descriptor}</Text>
            <Text style={styles.meta}>{store.eta} · ★ {store.rating} · {products.length} publicados</Text>
          </View>
          <Ionicons name="arrow-forward" size={22}/>
        </Pressable>
      })}
      {results.length === 0 && <View style={styles.empty}><Text style={styles.emptyIcon}>○</Text><Text style={styles.emptyTitle}>SIN RESULTADOS.</Text><Text style={styles.emptyCopy}>Prueba otro término dentro de {meta?.label.toLowerCase() ?? 'las categorías'}.</Text></View>}
    </ScrollView>
    <CartDock/>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.paper},header:{padding:18,paddingBottom:16,borderBottomWidth:2,borderColor:C.black},kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{marginTop:10,fontSize:42,lineHeight:35,fontWeight:'900',letterSpacing:-2.2},input:{minHeight:50,marginTop:18,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:9,borderWidth:2,borderColor:C.black,backgroundColor:C.white},inputText:{flex:1,fontSize:12,fontWeight:'600'},filters:{borderBottomWidth:2,borderColor:C.black,backgroundColor:C.white},filterContent:{padding:10,gap:7},filter:{minHeight:36,paddingHorizontal:11,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,backgroundColor:C.white},filterActive:{backgroundColor:C.black},filterText:{fontSize:8,fontWeight:'900'},filterTextActive:{color:C.white},content:{padding:16,paddingBottom:100},rule:{minHeight:52,marginBottom:13,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:9,borderWidth:2,borderColor:C.black,backgroundColor:C.yellow},ruleText:{flex:1,fontSize:8,fontWeight:'800',lineHeight:12},count:{marginBottom:10,fontSize:8,fontWeight:'900'},row:{minHeight:92,padding:10,flexDirection:'row',alignItems:'center',gap:11,borderWidth:2,borderColor:C.black,backgroundColor:C.white,marginBottom:9},categoryLabel:{color:C.red,fontSize:6,fontWeight:'900',letterSpacing:.6},name:{marginTop:3,fontSize:17,fontWeight:'900'},desc:{marginTop:2,color:C.gray,fontSize:8},meta:{marginTop:6,fontSize:8,fontWeight:'800'},empty:{minHeight:350,alignItems:'center',justifyContent:'center'},emptyIcon:{fontSize:70,fontWeight:'900'},emptyTitle:{fontSize:32,fontWeight:'900'},emptyCopy:{marginTop:7,paddingHorizontal:25,color:C.gray,fontSize:10,textAlign:'center'}
})
