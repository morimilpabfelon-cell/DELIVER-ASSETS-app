# QA REPORT — DELIVER ASSETS Rider v2.3

## Flujo verificado

```text
Customer crea pedido
→ Business prepara
→ Rider acepta oferta
→ Rider se une al mismo chat
→ cualquiera solicita Control
→ Control entra explícitamente
→ pedido termina
→ conversación queda solo lectura
```

## Seguridad por rol

### Rider

- requiere `operation.riderId === rider-demo`;
- no ve chats antes de aceptar;
- no ve datos de tarjeta;
- puede escalar;
- puede enviar evidencia;
- conserva historial de sus entregas.

### Control

- requiere conversación escalada;
- debe unirse antes de responder;
- no entra en chats normales;
- puede revisar boleta e historial;
- no modifica conversaciones cerradas;
- su ingreso queda registrado.

## Integridad

- participantes fusionados por rol e ID;
- mensajes fusionados por ID;
- Rider y Control preservados;
- boleta preservada;
- estado de pago preservado;
- cierre automático preservado;
- fotografías compartidas mediante URL;
- 4 MB máximo por imagen.

## Resultados

- TypeScript Rider: aprobado.
- ESLint Rider: aprobado.
- Rider aislamiento: 11/11.
- Rider Fase 3: 26/26.
- TypeScript Control: aprobado.
- ESLint Control: aprobado.
- Control aislamiento: 11/11.
- Control Fase 3: 26/26.
- Hub Phase 3: 5/5.
- E2E de fotografía: aprobado.

## Exportación Android

La exportación adicional de Rider inició correctamente, pero Metro excedió el tiempo disponible aproximadamente al 24.6 %. No aparecieron errores de TypeScript, ESLint ni dominio antes del límite.
