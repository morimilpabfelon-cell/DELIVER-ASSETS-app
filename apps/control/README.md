# DELIVER ASSETS Control v2.3

Fase 3 de intervención administrativa por pedido.

Control conserva:

- vista global;
- operaciones;
- red;
- finanzas;
- riesgo;
- políticas;
- incidentes;
- persistencia;
- sincronización.

La actualización incorpora conversaciones escaladas.

## Regla de privacidad

Control no puede entrar automáticamente en todos los chats.

```text
Customer, Business o Rider solicita ayuda
→ coordination.escalated = true
→ el caso aparece en Control
→ Control entra explícitamente
```

Cuando Control se une, todos los participantes ven un mensaje del sistema.

## Panel de casos

Control muestra:

- pedido;
- negocio;
- cliente;
- estado;
- cantidad de mensajes;
- pago confirmado o efectivo pendiente;
- si Control ya entró;
- acceso al chat;
- acceso a la boleta.

Los chats no escalados permanecen fuera del panel de intervención.

## Capacidades

Control puede:

- leer el historial completo del caso;
- enviar texto;
- adjuntar fotografías;
- revisar la boleta;
- revisar el estado del pago;
- consultar participantes;
- revisar un chat cerrado sin modificarlo.

## Cierre e historial

Si el pedido terminó antes de la revisión, Control puede abrirlo en modo histórico. La aplicación no agrega un nuevo participante ni altera mensajes antiguos.

## Ejecución individual

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start-control.ps1
```

Puertos:

```text
Control Metro    → 8084
Coordination Hub → 9090
```

## Instalación nativa

Esta versión agrega `expo-image-picker` y `expo-file-system`. Debe recompilarse Control una vez:

```powershell
npm ci
npm run android:device
```

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
