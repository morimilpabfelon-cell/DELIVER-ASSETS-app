# DELIVER ASSETS Rider v2.3

Fase 3 de coordinación por pedido.

Rider conserva:

- conexión y ofertas;
- ruta de recojo y entrega;
- ganancias;
- historial;
- perfil;
- persistencia;
- sincronización central.

La actualización agrega acceso al mismo chat utilizado por Customer y Business.

## Regla de acceso

Rider no puede abrir chats generales.

```text
Oferta aceptada
→ riderId asignado
→ Rider se une al chat del pedido
```

Antes de aceptar la oferta, no existe acceso a mensajes, fotografías ni datos operativos del cliente.

## Chat

El repartidor asignado puede:

- enviar texto;
- tomar fotografías;
- elegir fotografías de la galería;
- registrar evidencia de recojo o entrega;
- leer mensajes de Customer y Business;
- solicitar ayuda de Control;
- ver cuándo Control se unió;
- consultar el historial después de completar la entrega.

## Cobro con privacidad

Rider solo ve:

- estado del pago;
- total operativo;
- instrucción para cobrar efectivo;
- nombre del negocio.

No recibe:

- número de tarjeta;
- correo del cliente;
- información financiera completa;
- liquidación interna del negocio.

## Cierre

Al entregar o cancelar:

```text
CHAT CERRADO
SOLO LECTURA
HISTORIAL CONSERVADO
```

## Ejecución individual

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start-rider.ps1
```

Puertos:

```text
Rider Metro      → 8083
Coordination Hub → 9090
```

## Instalación nativa

Esta versión agrega `expo-image-picker` y `expo-file-system`. Debe recompilarse Rider una vez:

```powershell
npm ci
npm run android:device
```

Después normalmente basta con `start-rider.ps1`.

## QA

```powershell
npm run qa
```

Resultados:

- TypeScript: aprobado.
- ESLint: aprobado.
- aislamiento: 11/11.
- Fase 3: 26/26.
- prueba Hub Rider + Control: aprobada.
