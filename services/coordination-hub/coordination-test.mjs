import assert from 'node:assert/strict'
import { applyEnvelope, createInitialState, mergeOperation } from './core.mjs'

const now = new Date().toISOString()
const base = {
  id: '#DA-CHAT-001',
  kind: 'order',
  category: 'comida',
  customerId: 'customer-demo',
  merchantId: 'merchant-1',
  storeId: 1,
  customerName: 'Cliente Demo',
  merchantName: 'Barrio Burger',
  pickupAddress: 'Local',
  dropoffAddress: 'Cliente',
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
  status: 'created',
  createdAt: now,
  updatedAt: now,
  offerAttempts: 0,
  events: [{ id: 'event-created', status: 'created', label: 'Pedido creado', at: now, actor: 'customer' }],
  coordination: {
    status: 'open',
    participants: [
      { role: 'customer', id: 'customer-demo', name: 'Cliente Demo', joinedAt: now },
      { role: 'merchant', id: 'merchant-1', name: 'Barrio Burger', joinedAt: now },
    ],
    messages: [{
      id: 'customer-message',
      operationId: '#DA-CHAT-001',
      senderRole: 'customer',
      senderId: 'customer-demo',
      senderName: 'Cliente Demo',
      type: 'text',
      text: '¿Cuánto falta?',
      createdAt: now,
      status: 'sent',
    }],
    escalated: false,
    receipt: {
      number: 'B001-2026-CHAT0001',
      operationId: '#DA-CHAT-001',
      issuedAt: now,
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

const merchant = structuredClone(base)
merchant.updatedAt = new Date(Date.now() + 1000).toISOString()
merchant.status = 'preparing'
merchant.coordination.messages.push({
  id: 'merchant-message',
  operationId: base.id,
  senderRole: 'merchant',
  senderId: 'merchant-1',
  senderName: 'Barrio Burger',
  type: 'text',
  text: 'Ya estamos terminando.',
  createdAt: merchant.updatedAt,
  status: 'sent',
})
merchant.coordination.escalated = true
merchant.coordination.escalatedAt = merchant.updatedAt

const merged = mergeOperation(base, merchant)
assert.equal(merged.status, 'preparing')
assert.equal(merged.coordination.messages.filter((message) => ['customer-message', 'merchant-message'].includes(message.id)).length, 2)
assert.equal(merged.coordination.receipt.number, base.coordination.receipt.number)
assert.equal(merged.coordination.escalated, true)

const delivered = structuredClone(merged)
delivered.status = 'delivered'
delivered.updatedAt = new Date(Date.now() + 2000).toISOString()
const closed = mergeOperation(merged, delivered)
assert.equal(closed.coordination.status, 'closed')
assert.ok(closed.coordination.closedAt)
assert.equal(closed.coordination.receipt.paymentState, 'captured')

let state = createInitialState()
let result = applyEnvelope(state, {
  appId: 'customer',
  domainRevisions: { operations: 0, merchants: 0, admin: 0 },
  shared: { operations: [base] },
}, 'customer-key')
state = result.state
result = applyEnvelope(state, {
  appId: 'business',
  domainRevisions: state.domainRevisions,
  shared: { operations: [merchant] },
}, 'business-key')
assert.equal(result.state.operations[0].coordination.messages.length, 2)
assert.equal(result.state.operations[0].coordination.escalated, true)

console.log('PASS · mensajes concurrentes preservados')
console.log('PASS · boleta inmutable preservada')
console.log('PASS · escalamiento preservado')
console.log('PASS · chat cerrado al entregar')
console.log('PASS · fusión Customer + Business')
