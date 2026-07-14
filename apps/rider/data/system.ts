import type { Tone } from '@/theme'

export type AppRole = 'cliente' | 'negocio' | 'repartidor' | 'admin'
export type Address = { id: string; label: string; line: string; detail: string; selected: boolean }
export type PaymentMethod = { id: string; kind: 'card' | 'wallet' | 'cash'; label: string; detail: string; selected: boolean }
export type AppNotice = { id: string; title: string; body: string; time: string; read: boolean; tone: Tone; icon: string }
export type SupportMessage = { id: string; from: 'user' | 'support'; text: string; time: string }
export type OrderStatus = 'Entregado' | 'Cancelado'
export type OrderRecord = {
  id: string
  kind: 'order' | 'shipment'
  storeId?: number
  title: string
  date: string
  total: number
  status: OrderStatus
  summary: string
  rated?: boolean
}

export const roleProfiles: Record<AppRole, { title: string; subtitle: string; symbol: string; tone: Tone; description: string; permissions: string[] }> = {
  cliente: { title: 'Cliente', subtitle: 'Compra y recibe', symbol: 'C', tone: 'yellow', description: 'Comida, mercado, farmacia y envíos sin mezclar categorías.', permissions: ['Comprar', 'Enviar', 'Pagar', 'Seguir pedidos', 'Usar soporte'] },
  negocio: { title: 'Negocio', subtitle: 'Opera tu tienda', symbol: 'N', tone: 'red', description: 'Pedidos, catálogo, inventario, promociones y liquidaciones.', permissions: ['Aceptar pedidos', 'Editar catálogo', 'Gestionar inventario', 'Ver métricas', 'Configurar tienda'] },
  repartidor: { title: 'Repartidor', subtitle: 'Muévete y gana', symbol: 'R', tone: 'blue', description: 'Ofertas, rutas, ganancias, seguridad y soporte operativo.', permissions: ['Recibir ofertas', 'Completar entregas', 'Ver ganancias', 'Reportar incidentes', 'Gestionar disponibilidad'] },
  admin: { title: 'Administración', subtitle: 'Control central', symbol: 'A', tone: 'mint', description: 'Supervisión de pedidos, usuarios, zonas, finanzas e incidentes.', permissions: ['Supervisar red', 'Gestionar usuarios', 'Controlar zonas', 'Revisar finanzas', 'Resolver incidentes'] },
}

export const initialAddresses: Address[] = [
  { id: 'home', label: 'Casa', line: 'Av. Arequipa 1480, Miraflores', detail: 'Dpto. 604 · Portería', selected: true },
  { id: 'work', label: 'Trabajo', line: 'Av. Javier Prado 560, San Isidro', detail: 'Oficina 804 · Recepción', selected: false },
]

export const initialPayments: PaymentMethod[] = [
  { id: 'visa', kind: 'card', label: 'Visa •••• 4242', detail: 'Vence 08/29', selected: true },
  { id: 'wallet', kind: 'wallet', label: 'Billetera DA', detail: 'Saldo demo S/ 180.00', selected: false },
  { id: 'cash', kind: 'cash', label: 'Efectivo', detail: 'Paga al recibir', selected: false },
]

export const initialNotices: AppNotice[] = [
  { id: 'n1', title: 'Tu envío llegó', body: 'DA Express completó el documento #DX-2302.', time: 'Hace 2 h', read: false, tone: 'mint', icon: 'checkmark' },
  { id: 'n2', title: 'Beneficio disponible', body: 'Usa MERCADO8 en productos de mercado.', time: 'Ayer', read: false, tone: 'yellow', icon: 'pricetag' },
  { id: 'n3', title: 'Nuevo inicio de sesión', body: 'Android · Lima · sesión demo reconocida.', time: '08 Jul', read: true, tone: 'blue', icon: 'shield-checkmark' },
  { id: 'n4', title: 'Pedido entregado', body: 'Mercado 24 fue entregado correctamente.', time: '08 Jul', read: true, tone: 'red', icon: 'bag-check' },
]

export const initialSupport: SupportMessage[] = [
  { id: 's1', from: 'support', text: 'Hola, soy DA Support. ¿En qué podemos ayudarte?', time: '10:20' },
]

export const initialHistory: OrderRecord[] = [
  { id: '#DX-2302', kind: 'shipment', title: 'DA Express · Documento', date: '09 Jul · 10:20', total: 10.9, status: 'Entregado', summary: 'Miraflores → San Isidro', rated: true },
  { id: '#DA-2321', kind: 'order', storeId: 4, title: 'Mercado 24', date: '08 Jul · 18:10', total: 86.4, status: 'Entregado', summary: '7 productos de mercado', rated: false },
  { id: '#DA-2188', kind: 'order', storeId: 7, title: 'Farma Central', date: '03 Jul · 21:26', total: 34.9, status: 'Entregado', summary: '2 productos de farmacia', rated: true },
  { id: '#DA-2044', kind: 'order', storeId: 3, title: 'Pizza 33', date: '28 Jun · 20:05', total: 72.5, status: 'Entregado', summary: '3 productos de comida', rated: true },
]

export type MerchantOrderState = 'nuevo' | 'aceptado' | 'preparando' | 'listo' | 'entregado' | 'cancelado'
export type MerchantOrder = { id: string; customer: string; items: string; total: number; eta: string; state: MerchantOrderState }
export const initialMerchantOrders: MerchantOrder[] = [
  { id: '#DA-2501', customer: 'Camila R.', items: '2 Smash Clásica · 1 Papas', total: 44.7, eta: '18 min', state: 'nuevo' },
  { id: '#DA-2498', customer: 'Luis M.', items: '1 Doble Barrio · 2 Limonadas', total: 52.8, eta: '11 min', state: 'preparando' },
  { id: '#DA-2494', customer: 'Ana P.', items: '1 Veggie · 1 Papas', total: 31.4, eta: '5 min', state: 'listo' },
]

export type RiderOffer = { id: string; orderId?: string; pickup: string; dropoff: string; distance: string; time: string; pay: number; category: string; attempt?: number }
export type RiderDeliveryRecord = {
  id: string
  title: string
  route: string
  pay: number
  completedAt: string
  completedAtIso?: string
  orderId?: string
  category: string
}
export const initialRiderOffers: RiderOffer[] = [
  { id: 'OF-901', pickup: 'Barrio Burger', dropoff: 'Av. Pardo 620', distance: '2.4 km', time: '21 min', pay: 8.9, category: 'Comida' },
  { id: 'OF-902', pickup: 'DA Express', dropoff: 'Calle Las Begonias 430', distance: '4.1 km', time: '34 min', pay: 13.6, category: 'Documento' },
  { id: 'OF-903', pickup: 'Farma Central', dropoff: 'Av. Petit Thouars 1840', distance: '1.8 km', time: '16 min', pay: 7.4, category: 'Farmacia' },
]

export const initialRiderHistory: RiderDeliveryRecord[] = [
  { id: '#R-889', title: 'DA Express · Documento', route: 'Miraflores → San Isidro', pay: 13.6, completedAt: '10:42', category: 'Documento' },
  { id: '#R-884', title: 'Barrio Burger', route: 'Av. Larco → Av. Pardo', pay: 8.9, completedAt: '09:58', category: 'Comida' },
  { id: '#R-879', title: 'Farma Central', route: 'Surquillo → Miraflores', pay: 7.4, completedAt: '09:21', category: 'Farmacia' },
  { id: '#R-871', title: 'Mercado 24', route: 'San Isidro → Lince', pay: 11.2, completedAt: '08:47', category: 'Mercado' },
  { id: '#R-866', title: 'Ruta Local · Sobre', route: 'Barranco → Miraflores', pay: 12.4, completedAt: '08:12', category: 'Documento' },
  { id: '#R-861', title: 'Casa Wok', route: 'Lince → San Isidro', pay: 9.8, completedAt: '07:43', category: 'Comida' },
  { id: '#R-857', title: 'Bodega Norte', route: 'Surquillo → Barranco', pay: 10.6, completedAt: '07:08', category: 'Mercado' },
  { id: '#R-852', title: 'Botica 7', route: 'San Isidro → Miraflores', pay: 10.4, completedAt: '06:35', category: 'Farmacia' },
]

export type Incident = { id: string; title: string; detail: string; severity: 'alta' | 'media' | 'baja'; status: 'abierto' | 'revisión' | 'resuelto' }
export const initialIncidents: Incident[] = [
  { id: 'INC-102', title: 'Demora de preparación', detail: 'Comercio superó el tiempo estimado por 18 min.', severity: 'media', status: 'abierto' },
  { id: 'INC-099', title: 'Dirección incompleta', detail: 'El destinatario no indicó número interior.', severity: 'baja', status: 'revisión' },
  { id: 'INC-091', title: 'Intento de contenido no declarado', detail: 'Envío bloqueado antes del recojo.', severity: 'alta', status: 'resuelto' },
]
