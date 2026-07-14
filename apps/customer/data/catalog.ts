import type { Tone } from '@/theme'

export type CategoryKey = 'comida' | 'mercado' | 'farmacia' | 'envios'
export type ProductOption = { label: string; price: number }
export type Product = {
  id: number
  name: string
  description: string
  price: number
  symbol: string
  group: string
  popular?: boolean
  options?: ProductOption[]
  notePlaceholder?: string
  tags?: string[]
}
export type Store = {
  id: number
  name: string
  descriptor: string
  category: CategoryKey
  eta: string
  rating: number
  delivery: number
  minimum: number
  tone: Tone
  symbol: string
  featured: string
  products: Product[]
}
export type CategoryMeta = {
  key: CategoryKey
  label: string
  symbol: string
  tagline: string
  tone: Tone
  heroTitle: string
  searchPlaceholder: string
  storeSection: string
  catalogLabel: string
  purity: string
}

export const categories: CategoryMeta[] = [
  { key: 'comida', label: 'Comida', symbol: 'B', tagline: 'Antojos sin espera', tone: 'red', heroTitle: 'HOY NO\nCOCINAS.', searchPlaceholder: 'Buscar restaurantes o platos', storeSection: 'RESTAURANTES CERCA', catalogLabel: 'MENÚ', purity: 'Solo restaurantes, platos, bebidas y postres.' },
  { key: 'mercado', label: 'Mercado', symbol: 'M', tagline: 'La despensa completa', tone: 'yellow', heroTitle: 'TODO PARA\nLA CASA.', searchPlaceholder: 'Buscar mercados o productos', storeSection: 'MERCADOS CERCA', catalogLabel: 'PRODUCTOS', purity: 'Solo abarrotes, frescos, bebidas y hogar.' },
  { key: 'farmacia', label: 'Farmacia', symbol: '+', tagline: 'Cuidado sin espera', tone: 'blue', heroTitle: 'CUIDADO\nSIN ESPERA.', searchPlaceholder: 'Buscar farmacias o cuidado personal', storeSection: 'FARMACIAS CERCA', catalogLabel: 'CUIDADO Y BIENESTAR', purity: 'Solo farmacia, higiene, bienestar y primeros auxilios.' },
  { key: 'envios', label: 'Envíos', symbol: '↗', tagline: 'Muévelo por la ciudad', tone: 'mint', heroTitle: 'MUÉVELO\nAHORA.', searchPlaceholder: 'Buscar documentos, paquetes o servicios', storeSection: 'SERVICIOS DE ENVÍO', catalogLabel: 'TIPOS DE ENVÍO', purity: 'Solo documentos, sobres, paquetes y mensajería.' },
]

const foodOptions = [
  { label: 'Salsa adicional', price: 1.5 },
  { label: 'Porción adicional', price: 4.5 },
  { label: 'Cubiertos', price: 0 },
]
const marketOptions = [
  { label: 'Permitir reemplazo equivalente', price: 0 },
  { label: 'Elegir la opción más fresca', price: 0 },
  { label: 'Sin bolsa adicional', price: 0 },
]
const pharmacyOptions = [
  { label: 'No sustituir la marca', price: 0 },
  { label: 'Permitir alternativa equivalente', price: 0 },
  { label: 'Empaque discreto', price: 0 },
]

export const stores: Store[] = [
  { id: 1, name: 'Barrio Burger', descriptor: 'Smash burgers · papas · shakes', category: 'comida', eta: '18–24 min', rating: 4.8, delivery: 4.9, minimum: 15, tone: 'red', symbol: 'BB', featured: 'DOBLE / CRUJIENTE / AHORA', products: [
    { id: 101, name: 'Combo Doble DA', description: 'Doble smash, queso, papas y bebida.', price: 31.9, symbol: 'DA', group: 'Combos', popular: true, options: foodOptions, notePlaceholder: 'Ej. sin cebolla o salsa aparte', tags: ['burger','hamburguesa','combo'] },
    { id: 102, name: 'Burger Clásica', description: 'Smash, queso, pepinillos y salsa de casa.', price: 18.9, symbol: 'B', group: 'Burgers', options: foodOptions, notePlaceholder: 'Ej. sin pepinillos', tags: ['burger','hamburguesa'] },
    { id: 103, name: 'Papas Fuego', description: 'Papas crocantes, especias y salsa picante.', price: 10.9, symbol: 'F', group: 'Acompañamientos', options: [{label:'Salsa aparte',price:0},{label:'Salsa adicional',price:1.5}], notePlaceholder: 'Ej. poco picante', tags: ['papas','acompañamiento'] },
    { id: 104, name: 'Shake Limón', description: 'Bebida cremosa, cítrica y fría.', price: 12.5, symbol: 'L', group: 'Bebidas', options: [{label:'Sin crema',price:0},{label:'Extra frío',price:0}], notePlaceholder: 'Indicaciones para la bebida', tags: ['bebida','shake'] },
  ]},
  { id: 2, name: 'Casa Wok', descriptor: 'Woks · arroces · noodles', category: 'comida', eta: '22–30 min', rating: 4.7, delivery: 4.9, minimum: 15, tone: 'yellow', symbol: 'CW', featured: 'WOK / FUEGO / SABOR', products: [
    { id: 201, name: 'Wok Teriyaki', description: 'Pollo, vegetales, arroz y salsa teriyaki.', price: 27.9, symbol: 'W', group: 'Woks', popular: true, options: foodOptions, notePlaceholder: 'Ej. sin brócoli', tags: ['wok','pollo','arroz'] },
    { id: 202, name: 'Arroz Chaufa', description: 'Arroz salteado, pollo, huevo y cebolla china.', price: 22.9, symbol: 'A', group: 'Arroces', options: foodOptions, notePlaceholder: 'Ej. sin cebolla china', tags: ['chaufa','arroz'] },
    { id: 203, name: 'Noodles Picantes', description: 'Fideos, vegetales y salsa de ají ahumado.', price: 24.5, symbol: 'N', group: 'Noodles', options: foodOptions, notePlaceholder: 'Ej. nivel de picante bajo', tags: ['noodles','fideos'] },
    { id: 204, name: 'Té Jazmín', description: 'Té frío aromático con limón.', price: 7.9, symbol: 'T', group: 'Bebidas', options: [{label:'Sin azúcar',price:0},{label:'Poco hielo',price:0}], notePlaceholder: 'Indicaciones para la bebida', tags: ['té','bebida'] },
  ]},
  { id: 3, name: 'Pizza 33', descriptor: 'Pizzas · entradas · postres', category: 'comida', eta: '24–32 min', rating: 4.8, delivery: 5.5, minimum: 18, tone: 'blue', symbol: '33', featured: 'HORNO / QUESO / 33', products: [
    { id: 301, name: 'Pizza Pepperoni', description: 'Masa artesanal, mozzarella y pepperoni.', price: 36.9, symbol: 'P', group: 'Pizzas', popular: true, options: [{label:'Extra queso',price:5},{label:'Borde con ajo',price:3},{label:'Salsa aparte',price:0}], notePlaceholder: 'Indicaciones para la pizza', tags: ['pizza','pepperoni'] },
    { id: 302, name: 'Pizza Vegetales', description: 'Mozzarella, pimiento, champiñón y aceituna.', price: 34.9, symbol: 'V', group: 'Pizzas', options: [{label:'Extra queso',price:5},{label:'Sin aceituna',price:0},{label:'Salsa aparte',price:0}], notePlaceholder: 'Indicaciones para la pizza', tags: ['pizza','vegetales'] },
    { id: 303, name: 'Pan de Ajo', description: 'Seis piezas horneadas con mantequilla de ajo.', price: 12.9, symbol: 'A', group: 'Entradas', options: [{label:'Dip de tomate',price:2},{label:'Dip de queso',price:3}], notePlaceholder: 'Indicaciones para la entrada', tags: ['pan','ajo'] },
    { id: 304, name: 'Brownie 33', description: 'Brownie de chocolate con centro suave.', price: 10.5, symbol: 'BR', group: 'Postres', options: [{label:'Sin azúcar impalpable',price:0}], notePlaceholder: 'Indicaciones para el postre', tags: ['brownie','postre'] },
  ]},

  { id: 4, name: 'Mercado 24', descriptor: 'Abarrotes · frescos · hogar', category: 'mercado', eta: '25–35 min', rating: 4.6, delivery: 5.9, minimum: 20, tone: 'yellow', symbol: 'M24', featured: 'FRESCO / RÁPIDO / COMPLETO', products: [
    { id: 401, name: 'Canasta Esencial', description: 'Arroz, leche, huevos, pan y frutas.', price: 42.8, symbol: 'CE', group: 'Despensa', popular: true, options: marketOptions, notePlaceholder: 'Ej. reemplazar solo por precio similar', tags: ['arroz','leche','huevos','pan'] },
    { id: 402, name: 'Pack Fresco', description: 'Verduras y frutas seleccionadas.', price: 34.6, symbol: 'PF', group: 'Frescos', options: marketOptions, notePlaceholder: 'Ej. plátanos maduros', tags: ['frutas','verduras'] },
    { id: 403, name: 'Desayuno DA', description: 'Café, avena, yogurt y plátanos.', price: 26.9, symbol: 'D', group: 'Despensa', options: marketOptions, notePlaceholder: 'Preferencias de reemplazo', tags: ['café','avena','yogurt'] },
    { id: 404, name: 'Limpieza Rápida', description: 'Detergente, paños y desinfectante.', price: 31.5, symbol: 'LR', group: 'Hogar', options: marketOptions, notePlaceholder: 'Preferencias de marca o reemplazo', tags: ['limpieza','detergente','hogar'] },
  ]},
  { id: 5, name: 'Fresco', descriptor: 'Frutas · verduras · lácteos', category: 'mercado', eta: '20–28 min', rating: 4.8, delivery: 4.5, minimum: 18, tone: 'mint', symbol: 'FR', featured: 'COSECHA / COLOR / FRESCO', products: [
    { id: 501, name: 'Frutas de Semana', description: 'Selección de seis frutas de temporada.', price: 29.9, symbol: 'FS', group: 'Frutas', popular: true, options: marketOptions, notePlaceholder: 'Ej. evitar frutas muy maduras', tags: ['frutas','temporada'] },
    { id: 502, name: 'Verduras para Ensalada', description: 'Lechuga, tomate, pepino y zanahoria.', price: 18.9, symbol: 'VE', group: 'Verduras', options: marketOptions, notePlaceholder: 'Preferencias de frescura', tags: ['verduras','ensalada'] },
    { id: 503, name: 'Pack Lácteos', description: 'Leche, yogurt natural y queso fresco.', price: 32.5, symbol: 'LA', group: 'Lácteos', options: marketOptions, notePlaceholder: 'Preferencias de marca', tags: ['leche','yogurt','queso'] },
    { id: 504, name: 'Panadería Diaria', description: 'Pan francés, integral y bollos frescos.', price: 16.8, symbol: 'PA', group: 'Panadería', options: marketOptions, notePlaceholder: 'Ej. mitad integral', tags: ['pan','panadería'] },
  ]},
  { id: 6, name: 'Bodega Norte', descriptor: 'Abarrotes · bebidas · snacks', category: 'mercado', eta: '18–25 min', rating: 4.5, delivery: 3.9, minimum: 12, tone: 'red', symbol: 'BN', featured: 'BARRIO / DESPENSA / HOY', products: [
    { id: 601, name: 'Pack Despensa', description: 'Arroz, fideos, aceite, azúcar y sal.', price: 39.9, symbol: 'PD', group: 'Abarrotes', popular: true, options: marketOptions, notePlaceholder: 'Preferencias de marca', tags: ['arroz','fideos','aceite'] },
    { id: 602, name: 'Bebidas para Casa', description: 'Agua, gaseosa y jugo familiar.', price: 24.9, symbol: 'BC', group: 'Bebidas', options: marketOptions, notePlaceholder: 'Ej. gaseosa sin azúcar', tags: ['agua','gaseosa','jugo'] },
    { id: 603, name: 'Snacks Mixtos', description: 'Galletas, chips y frutos secos.', price: 21.5, symbol: 'SM', group: 'Snacks', options: marketOptions, notePlaceholder: 'Preferencias de reemplazo', tags: ['snacks','galletas','chips'] },
    { id: 604, name: 'Papel y Cocina', description: 'Papel higiénico, servilletas y bolsas.', price: 27.5, symbol: 'PC', group: 'Hogar', options: marketOptions, notePlaceholder: 'Preferencias de presentación', tags: ['papel','servilletas','hogar'] },
  ]},

  { id: 7, name: 'Farma Central', descriptor: 'Cuidado · bienestar · primeros auxilios', category: 'farmacia', eta: '16–22 min', rating: 4.9, delivery: 3.9, minimum: 10, tone: 'blue', symbol: '+', featured: 'CUIDADO / CERCA / SEGURO', products: [
    { id: 701, name: 'Kit Cuidado Diario', description: 'Mascarillas, alcohol y pañuelos.', price: 24.9, symbol: '+', group: 'Cuidado', popular: true, options: pharmacyOptions, notePlaceholder: 'Preferencias de marca o empaque', tags: ['mascarillas','alcohol','pañuelos'] },
    { id: 702, name: 'Protector Solar', description: 'Protección facial SPF 50.', price: 38.9, symbol: 'SPF', group: 'Dermocosmética', options: pharmacyOptions, notePlaceholder: 'Preferencias de presentación', tags: ['protector','solar','spf'] },
    { id: 703, name: 'Hidratación Oral', description: 'Bebida rehidratante y sales de hidratación.', price: 14.5, symbol: 'H2O', group: 'Bienestar', options: pharmacyOptions, notePlaceholder: 'Preferencias de sabor o marca', tags: ['hidratación','sales'] },
    { id: 704, name: 'Botiquín Básico', description: 'Gasas, vendas, curitas y antiséptico.', price: 29.9, symbol: 'B', group: 'Primeros auxilios', options: pharmacyOptions, notePlaceholder: 'Preferencias de presentación', tags: ['botiquín','gasas','vendas'] },
  ]},
  { id: 8, name: 'Vita', descriptor: 'Higiene · bebé · salud oral', category: 'farmacia', eta: '18–25 min', rating: 4.7, delivery: 4.2, minimum: 10, tone: 'mint', symbol: 'V', featured: 'VITA / CUIDADO / DIARIO', products: [
    { id: 801, name: 'Higiene Personal', description: 'Jabón, shampoo y desodorante.', price: 32.9, symbol: 'HP', group: 'Higiene', popular: true, options: pharmacyOptions, notePlaceholder: 'Preferencias de marca o aroma', tags: ['jabón','shampoo','desodorante'] },
    { id: 802, name: 'Cuidado del Bebé', description: 'Toallitas, crema protectora y algodón.', price: 41.5, symbol: 'BB', group: 'Bebé', options: pharmacyOptions, notePlaceholder: 'Preferencias de marca', tags: ['bebé','toallitas','algodón'] },
    { id: 803, name: 'Salud Oral', description: 'Cepillo, pasta dental e hilo dental.', price: 25.8, symbol: 'SO', group: 'Salud oral', options: pharmacyOptions, notePlaceholder: 'Preferencias de marca', tags: ['dental','cepillo','pasta'] },
    { id: 804, name: 'Cuidado de Manos', description: 'Jabón líquido y crema hidratante.', price: 22.9, symbol: 'CM', group: 'Cuidado personal', options: pharmacyOptions, notePlaceholder: 'Preferencias de aroma', tags: ['manos','crema','jabón'] },
  ]},
  { id: 9, name: 'Botica 7', descriptor: 'Botiquín · higiene · bienestar', category: 'farmacia', eta: '14–20 min', rating: 4.6, delivery: 3.5, minimum: 8, tone: 'yellow', symbol: 'B7', featured: 'BOTICA / BARRIO / 7', products: [
    { id: 901, name: 'Curación Rápida', description: 'Curitas, gasas, cinta y antiséptico.', price: 18.9, symbol: 'CR', group: 'Primeros auxilios', popular: true, options: pharmacyOptions, notePlaceholder: 'Preferencias de presentación', tags: ['curitas','gasas','antiséptico'] },
    { id: 902, name: 'Cuidado Respiratorio', description: 'Mascarillas y solución salina.', price: 19.5, symbol: 'RS', group: 'Cuidado', options: pharmacyOptions, notePlaceholder: 'Preferencias de marca', tags: ['mascarillas','salina'] },
    { id: 903, name: 'Higiene de Viaje', description: 'Gel, pañuelos y toallitas personales.', price: 16.8, symbol: 'HV', group: 'Higiene', options: pharmacyOptions, notePlaceholder: 'Preferencias de presentación', tags: ['gel','pañuelos','toallitas'] },
    { id: 904, name: 'Cuidado Labial', description: 'Bálsamo hidratante y protector labial.', price: 14.9, symbol: 'CL', group: 'Bienestar', options: pharmacyOptions, notePlaceholder: 'Preferencias de aroma', tags: ['labial','bálsamo'] },
  ]},

  { id: 10, name: 'DA Express', descriptor: 'Documentos · sobres · paquetes', category: 'envios', eta: 'Recojo en 15 min', rating: 4.9, delivery: 0, minimum: 0, tone: 'mint', symbol: 'DA', featured: 'RECOGE / MUEVE / ENTREGA', products: [
    { id: 1001, name: 'Documento', description: 'Sobre o documento hasta 1 kg.', price: 8.9, symbol: 'DOC', group: 'Documentos', popular: true, options: [{label:'Firma al recibir',price:2},{label:'Foto de entrega',price:0},{label:'Sobre protector',price:1.5}], notePlaceholder: 'Describe brevemente el documento', tags: ['documento','sobre','firma'] },
    { id: 1002, name: 'Sobre Confidencial', description: 'Documentos sellados con entrega directa.', price: 12.9, symbol: 'SEC', group: 'Documentos', options: [{label:'Firma al recibir',price:2},{label:'Código de entrega',price:1.5},{label:'Foto de entrega',price:0}], notePlaceholder: 'Describe el tipo de sobre sin datos sensibles', tags: ['sobre','confidencial','documento'] },
    { id: 1003, name: 'Paquete Pequeño', description: 'Caja o bolsa sellada hasta 3 kg.', price: 13.9, symbol: 'S', group: 'Paquetes', options: [{label:'Protección adicional',price:3},{label:'Foto de entrega',price:0},{label:'Firma al recibir',price:2}], notePlaceholder: 'Describe el contenido de forma general', tags: ['paquete','pequeño','caja'] },
    { id: 1004, name: 'Paquete Mediano', description: 'Caja sellada hasta 8 kg.', price: 19.9, symbol: 'M', group: 'Paquetes', options: [{label:'Protección adicional',price:4.5},{label:'Foto de entrega',price:0},{label:'Firma al recibir',price:2}], notePlaceholder: 'Describe el contenido de forma general', tags: ['paquete','mediano','caja'] },
    { id: 1005, name: 'Entrega Prioritaria', description: 'Recorrido directo sin paradas intermedias.', price: 25.9, symbol: '!', group: 'Prioridad', options: [{label:'Código de entrega',price:1.5},{label:'Foto de entrega',price:0},{label:'Firma al recibir',price:2}], notePlaceholder: 'Describe el envío de forma general', tags: ['prioritaria','express','directa'] },
  ]},
  { id: 11, name: 'Ruta Local', descriptor: 'Rutas programadas · multi-entrega', category: 'envios', eta: 'Recojo en 25 min', rating: 4.7, delivery: 0, minimum: 0, tone: 'yellow', symbol: 'RL', featured: 'RUTA / AGENDA / ENTREGA', products: [
    { id: 1101, name: 'Entrega Programada', description: 'Agenda una entrega para una franja horaria.', price: 11.9, symbol: 'AG', group: 'Programados', popular: true, options: [{label:'Firma al recibir',price:2},{label:'Foto de entrega',price:0}], notePlaceholder: 'Describe el paquete o documento', tags: ['programada','agenda'] },
    { id: 1102, name: 'Ruta de 2 Paradas', description: 'Recojo único y dos destinos cercanos.', price: 21.9, symbol: '2X', group: 'Multi-entrega', options: [{label:'Confirmación por parada',price:2},{label:'Foto por entrega',price:0}], notePlaceholder: 'Describe los elementos de cada parada', tags: ['ruta','dos','paradas'] },
    { id: 1103, name: 'Retorno Firmado', description: 'Entrega y retorno de documento firmado.', price: 18.9, symbol: '↩', group: 'Documentos', options: [{label:'Sobre protector',price:1.5},{label:'Foto de entrega',price:0}], notePlaceholder: 'Describe el documento sin datos sensibles', tags: ['retorno','firma','documento'] },
    { id: 1104, name: 'Entrega Comercial', description: 'Paquete para tienda, oficina o cliente.', price: 15.9, symbol: 'CO', group: 'Paquetes', options: [{label:'Firma al recibir',price:2},{label:'Foto de entrega',price:0}], notePlaceholder: 'Describe el paquete de forma general', tags: ['comercial','oficina','paquete'] },
  ]},
  { id: 12, name: 'Flash Box', descriptor: 'Paquetería rápida · entrega directa', category: 'envios', eta: 'Recojo en 20 min', rating: 4.6, delivery: 0, minimum: 0, tone: 'red', symbol: 'FB', featured: 'FLASH / BOX / AHORA', products: [
    { id: 1201, name: 'Flash 60', description: 'Paquete pequeño con objetivo de 60 minutos.', price: 22.9, symbol: '60', group: 'Express', popular: true, options: [{label:'Código de entrega',price:1.5},{label:'Foto de entrega',price:0}], notePlaceholder: 'Describe el paquete de forma general', tags: ['flash','60','express'] },
    { id: 1202, name: 'Caja Pequeña', description: 'Caja sellada hasta 3 kg.', price: 12.5, symbol: 'S', group: 'Paquetes', options: [{label:'Protección adicional',price:3},{label:'Firma al recibir',price:2}], notePlaceholder: 'Describe el contenido de forma general', tags: ['caja','pequeña'] },
    { id: 1203, name: 'Caja Mediana', description: 'Caja sellada hasta 8 kg.', price: 18.5, symbol: 'M', group: 'Paquetes', options: [{label:'Protección adicional',price:4.5},{label:'Firma al recibir',price:2}], notePlaceholder: 'Describe el contenido de forma general', tags: ['caja','mediana'] },
    { id: 1204, name: 'Entrega con Código', description: 'El destinatario confirma con un código.', price: 16.9, symbol: '#', group: 'Seguridad', options: [{label:'Foto de entrega',price:0},{label:'Firma adicional',price:2}], notePlaceholder: 'Describe el envío de forma general', tags: ['código','seguridad','entrega'] },
  ]},
]

export const promos = [
  { code: 'PRIMER20', title: '20% en tu primer pedido', detail: 'Válido en comida, mercado y farmacia', tone: 'red' as Tone, category: 'all' as const },
  { code: 'COMIDA10', title: 'S/ 10 en comida', detail: 'Solo restaurantes y platos', tone: 'red' as Tone, category: 'comida' as CategoryKey },
  { code: 'MERCADO8', title: 'S/ 8 en mercado', detail: 'Solo abarrotes, frescos y hogar', tone: 'yellow' as Tone, category: 'mercado' as CategoryKey },
  { code: 'CUIDADO5', title: 'S/ 5 en farmacia', detail: 'Solo cuidado, higiene y bienestar', tone: 'blue' as Tone, category: 'farmacia' as CategoryKey },
  { code: 'EXPRESS0', title: 'Tarifa base gratis', detail: 'Solo servicios DA Express seleccionados', tone: 'mint' as Tone, category: 'envios' as CategoryKey },
]

export const categoryByKey = (key: CategoryKey) => categories.find((item) => item.key === key) ?? categories[0]
export const storeById = (id: number) => stores.find((store) => store.id === id)
