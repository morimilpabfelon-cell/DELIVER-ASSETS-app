import assert from 'node:assert/strict'
import { applyEnvelope, createInitialState, mergeOperations } from './core.mjs'

const now = new Date().toISOString()
const operation = {
  id: '#DA-TEST-1', kind: 'order', category: 'comida', customerId: 'customer-demo', merchantId: 'merchant-1', storeId: 1,
  customerName: 'Cliente', merchantName: 'Barrio Burger', pickupAddress: 'A', dropoffAddress: 'B', items: [], itemSummary: 'Prueba',
  total: 20, subtotal: 15, deliveryFee: 3, serviceFee: 2, discount: 0, platformRevenue: 3, merchantNet: 12, riderPay: 5,
  payment: 'Visa', paymentKind: 'card', paymentState: 'captured', status: 'created', createdAt: now, updatedAt: now, offerAttempts: 0,
  events: [{ id: 'event-created', status: 'created', label: 'Creado', at: now, actor: 'customer' }],
}

let state = createInitialState()
let result = applyEnvelope(state, { appId: 'customer', domainRevisions: {}, shared: { operations: [operation] } }, 'customer-1')
assert.equal(result.state.operations.length, 1)
assert.equal(result.state.operations[0].status, 'created')
state = result.state

const acceptedAt = new Date(Date.now() + 1000).toISOString()
const accepted = { ...operation, status: 'accepted', updatedAt: acceptedAt, events: [...operation.events, { id: 'event-accepted', status: 'accepted', label: 'Aceptado', at: acceptedAt, actor: 'merchant' }] }
result = applyEnvelope(state, { appId: 'business', domainRevisions: { merchants: 0 }, shared: { operations: [accepted], merchantStates: { 1: { storeId: 1, open: true, autoAccept: false, stock: { 101: true } } } } }, 'business-1')
assert.equal(result.state.operations[0].status, 'accepted')
assert.equal(result.state.domainRevisions.merchants, 1)
state = result.state

const stale = { ...operation, updatedAt: now }
result = applyEnvelope(state, { appId: 'customer', domainRevisions: {}, shared: { operations: [stale] } }, 'customer-stale')
assert.equal(result.state.operations[0].status, 'accepted')
state = result.state

const readyAt = new Date(Date.now() + 2000).toISOString()
const ready = { ...accepted, status: 'ready', updatedAt: readyAt, events: [...accepted.events, { id: 'event-ready', status: 'ready', label: 'Listo', at: readyAt, actor: 'merchant' }] }
const riderAt = new Date(Date.now() + 3000).toISOString()
const delivered = { ...ready, status: 'delivered', updatedAt: riderAt, deliveredAt: riderAt, riderId: 'rider-demo', riderName: 'Alex', events: [...ready.events, { id: 'event-delivered', status: 'delivered', label: 'Entregado', at: riderAt, actor: 'rider' }] }
const merged = mergeOperations([ready], [delivered])
assert.equal(merged[0].status, 'delivered')
assert.equal(merged[0].events.length, 4)

const preparingAt = new Date(Date.now() + 2500).toISOString()
const preparing = { ...accepted, status: 'preparing', updatedAt: preparingAt, events: [...accepted.events, { id: 'event-preparing', status: 'preparing', label: 'Preparando', at: preparingAt, actor: 'merchant' }] }
state = applyEnvelope(state, { appId: 'business', domainRevisions: { merchants: 1 }, shared: { operations: [preparing] } }, 'business-preparing').state
const cancelAt = new Date(Date.now() + 3500).toISOString()
const invalidCustomerCancellation = { ...preparing, status: 'cancelled', updatedAt: cancelAt, cancelledAt: cancelAt, events: [...preparing.events, { id: 'event-cancel-invalid', status: 'cancelled', label: 'Cancelado por cliente', at: cancelAt, actor: 'customer' }] }
state = applyEnvelope(state, { appId: 'customer', domainRevisions: {}, shared: { operations: [invalidCustomerCancellation] } }, 'customer-cancel-invalid').state
assert.equal(state.operations[0].status, 'preparing')

result = applyEnvelope(state, { appId: 'business', domainRevisions: { merchants: 0 }, shared: { merchantStates: { 1: { storeId: 1, open: false, autoAccept: false, stock: {} } } } }, 'business-stale')
assert.equal(result.accepted.merchants, false)
assert.equal(result.state.merchantStates[1].open, true)

result = applyEnvelope(state, { appId: 'control', domainRevisions: { admin: 0 }, shared: { admin: { maintenance: true, blockUndeclared: true, enhancedVerification: true, incidents: [] } } }, 'control-1')
assert.equal(result.state.admin.maintenance, true)
assert.equal(result.state.domainRevisions.admin, 1)

const duplicate = applyEnvelope(result.state, { appId: 'control', domainRevisions: { admin: 1 }, shared: { admin: { maintenance: false, blockUndeclared: true, enhancedVerification: true, incidents: [] } } }, 'control-1')
assert.equal(duplicate.duplicate, true)
assert.equal(duplicate.state.admin.maintenance, true)

console.log('PASS · operación creada por Cliente')
console.log('PASS · transición de Negocio')
console.log('PASS · estado antiguo no retrocede la operación')
console.log('PASS · entrega de Rider conserva eventos')
console.log('PASS · cancelación tardía del Cliente es rechazada')
console.log('PASS · configuración antigua de Negocio no sobrescribe')
console.log('PASS · políticas de Control se sincronizan')
console.log('PASS · idempotencia evita solicitudes duplicadas')
console.log('8/8 pruebas del Sync Hub aprobadas.')
