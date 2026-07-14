import assert from 'node:assert/strict'
import { mergeOperation } from './core.mjs'

const createdAt = new Date().toISOString()
const base = {
  id: '#DA-PHASE3-001',
  kind: 'order',
  category: 'comida',
  customerId: 'customer-demo',
  merchantId: 'merchant-1',
  riderId: 'rider-demo',
  customerName: 'Cliente Demo',
  merchantName: 'Barrio Burger',
  riderName: 'Alex Ramírez',
  pickupAddress: 'Barrio Burger',
  dropoffAddress: 'Av. Demo 100',
  items: [{ productId: 1, name: 'Combo', quantity: 1, unitPrice: 20, extras: [], note: '' }],
  itemSummary: '1 Combo',
  total: 24,
  subtotal: 20,
  deliveryFee: 3,
  serviceFee: 1,
  discount: 0,
  platformRevenue: 4,
  merchantNet: 15,
  riderPay: 5,
  payment: 'Visa •••• 4242',
  paymentKind: 'card',
  paymentState: 'captured',
  status: 'rider_assigned',
  createdAt,
  updatedAt: createdAt,
  offerAttempts: 0,
  events: [],
  coordination: {
    status: 'open',
    participants: [
      { role: 'customer', id: 'customer-demo', name: 'Cliente Demo', joinedAt: createdAt },
      { role: 'merchant', id: 'merchant-1', name: 'Barrio Burger', joinedAt: createdAt },
      { role: 'rider', id: 'rider-demo', name: 'Alex Ramírez', joinedAt: createdAt },
    ],
    messages: [{
      id: 'rider-message',
      operationId: '#DA-PHASE3-001',
      senderRole: 'rider',
      senderId: 'rider-demo',
      senderName: 'Alex Ramírez',
      type: 'text',
      text: 'Ya recogí el pedido.',
      createdAt,
      status: 'sent',
    }],
    escalated: true,
    escalatedAt: createdAt,
    receipt: {
      number: 'B001-2026-PHASE301',
      operationId: '#DA-PHASE3-001',
      issuedAt: createdAt,
      merchantName: 'Barrio Burger',
      customerName: 'Cliente Demo',
      currency: 'PEN',
      lines: [{ productId: 1, name: 'Combo', quantity: 1, unitPrice: 20, extras: [], note: '', lineTotal: 20 }],
      subtotal: 20,
      deliveryFee: 3,
      serviceFee: 1,
      discount: 0,
      total: 24,
      paymentLabel: 'Visa •••• 4242',
      paymentKind: 'card',
      paymentState: 'captured',
    },
  },
}

const admin = structuredClone(base)
admin.updatedAt = new Date(Date.now() + 1000).toISOString()
admin.coordination.adminJoinedAt = admin.updatedAt
admin.coordination.participants.push({
  role: 'admin',
  id: 'admin-demo',
  name: 'Control Central',
  joinedAt: admin.updatedAt,
})
admin.coordination.messages.push({
  id: 'admin-message',
  operationId: base.id,
  senderRole: 'admin',
  senderId: 'admin-demo',
  senderName: 'Control Central',
  type: 'text',
  text: 'Control está revisando la demora.',
  createdAt: admin.updatedAt,
  status: 'sent',
})

const merged = mergeOperation(base, admin)
assert.equal(merged.coordination.participants.some((item) => item.role === 'rider'), true)
assert.equal(merged.coordination.participants.some((item) => item.role === 'admin'), true)
assert.equal(merged.coordination.messages.some((item) => item.id === 'rider-message'), true)
assert.equal(merged.coordination.messages.some((item) => item.id === 'admin-message'), true)
assert.equal(merged.coordination.adminJoinedAt, admin.updatedAt)
assert.equal(merged.coordination.receipt.paymentState, 'captured')

const delivered = structuredClone(merged)
delivered.status = 'delivered'
delivered.updatedAt = new Date(Date.now() + 2000).toISOString()
const closed = mergeOperation(merged, delivered)
assert.equal(closed.coordination.status, 'closed')
assert.ok(closed.coordination.closedAt)

console.log('PASS · Rider preservado como participante')
console.log('PASS · Control preservado como participante')
console.log('PASS · mensajes de Rider y Control fusionados')
console.log('PASS · boleta preservada')
console.log('PASS · chat cerrado al entregar')
