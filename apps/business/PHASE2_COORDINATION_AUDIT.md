# PHASE 2 COORDINATION AUDIT

## Alcance

La Fase 2 conecta Customer y Business mediante una conversación vinculada a cada operación.

Incluye:

- texto;
- fotografías;
- mensajes automáticos de estados;
- boleta;
- estado del pago;
- escalamiento hacia Control;
- historial de participantes;
- cierre automático;
- modo solo lectura después de entregar o cancelar.

Rider y Control todavía no incorporan pantallas de conversación. El modelo ya reconoce esos roles para la siguiente fase.

## Integridad

Cada conversación está anclada a:

```text
operationId
customerId
merchantId
riderId opcional
```

Customer solo puede abrir operaciones cuyo `customerId` le pertenece.

Business solo puede abrir operaciones cuyo `storeId` o `providerId` coincide con el comercio seleccionado.

La protección actual también se aplica en la interfaz y el contexto local. La autorización definitiva deberá repetirse en el backend de producción.

## Boleta

La boleta conserva:

- número;
- fecha;
- cliente;
- negocio;
- productos;
- cantidades;
- extras;
- subtotal;
- envío;
- servicio;
- descuento;
- total;
- método;
- estado de pago.

Los importes originales no se reescriben. La cancelación o devolución modifica el estado financiero sin destruir el documento inicial.

## Historial

Los mensajes no tienen funciones de editar ni eliminar.

Al finalizar:

```text
ENTREGADO / CANCELADO
→ CHAT CERRADO
→ SOLO LECTURA
→ HISTORIAL CONSERVADO
```

## Pruebas

- mensajes concurrentes Customer + Business: aprobado;
- fusión por ID: aprobado;
- fotografía publicada: aprobado;
- fotografía recuperada: aprobado;
- boleta preservada: aprobado;
- escalamiento preservado: aprobado;
- cierre al entregar: aprobado;
- TypeScript Customer: aprobado;
- ESLint Customer: aprobado;
- TypeScript Business: aprobado;
- ESLint Business: aprobado;
- auditoría Fase 2 Customer: 26/26;
- auditoría Fase 2 Business: 26/26.
