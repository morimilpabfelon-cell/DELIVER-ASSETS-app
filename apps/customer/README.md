# DELIVER ASSETS Customer v2.8

Fase 2 de coordinación por pedido.

Conserva todo lo implementado hasta Customer v2.7:

- perfil y fotografía;
- mensajes propios;
- cinco universos;
- identidad pública;
- catálogo dinámico;
- multi-carrito;
- checkout;
- seguimiento;
- DA Express;
- persistencia;
- Sync Hub.

## Chat del pedido

Cada pedido dispone de un canal privado entre sus participantes.

Customer puede:

- enviar texto;
- adjuntar desde galería;
- tomar una fotografía;
- revisar mensajes del negocio;
- revisar eventos automáticos;
- solicitar ayuda de Control;
- abrir la boleta;
- consultar el historial después de finalizar.

Rutas:

```text
Pedidos → pedido → Abrir chat
Seguimiento → Chat del pedido
```

Los pedidos activos adicionales también aparecen en la pestaña Pedidos. Ya no se pierde el acceso al chat cuando existe más de una operación en curso.

## Boleta

Se genera al crear el pedido.

Incluye productos, cantidades, cargos, descuentos, total, método y estado.

Estados visibles:

```text
PAGO CONFIRMADO
EFECTIVO PENDIENTE
PAGO PENDIENTE
PAGO FALLIDO
REEMBOLSADO
```

## Fotografías

Las fotografías se comprimen mediante ImagePicker y se publican en Coordination Hub.

Límite de publicación:

```text
4 MB
```

Al tocarlas se abren en vista completa.

## Ejecución

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start-customer.ps1
```

Activa:

```text
Customer → 8081
Coordination Hub → 9090
```

No necesitas abrir Business simultáneamente. El Hub conserva mensajes, pedidos, boletas e imágenes.

## QA

```powershell
npm run qa
```

Todas las auditorías de Customer y la Fase 2 fueron aprobadas.

La exportación Android adicional se inició, pero Metro excedió el tiempo disponible del entorno durante el bundling. La validación visual final corresponde al teléfono.
