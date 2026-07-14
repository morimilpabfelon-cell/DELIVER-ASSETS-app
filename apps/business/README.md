# DELIVER ASSETS Business v2.5

Fase 2 de coordinación por pedido.

Conserva todo lo implementado hasta Business v2.4:

- logo y portada;
- perfil comercial;
- catálogo profesional;
- productos y variantes;
- inventario reversible;
- pedidos;
- finanzas;
- identidad por comercio;
- Sync Hub.

## Chat del pedido

Cada tarjeta de pedido incorpora:

```text
CHAT · cantidad de mensajes
PAGO CONFIRMADO / EFECTIVO PENDIENTE
```

Business puede:

- responder al cliente;
- enviar fotografías;
- tomar evidencias con cámara;
- leer cambios automáticos del pedido;
- solicitar intervención de Control;
- consultar la boleta;
- revisar el historial cerrado.

El acceso se limita al comercio seleccionado. Un negocio no puede abrir el chat ni la boleta de otro negocio desde Business.

## Boleta y pago

Business conoce desde el ingreso del pedido:

- total;
- productos;
- método;
- estado financiero;
- número de boleta.

La boleta no reemplaza la facturación fiscal real. Es el comprobante operativo del prototipo.

## Cierre

Cuando el pedido queda entregado o cancelado:

```text
CHAT CERRADO
SOLO LECTURA
HISTORIAL CONSERVADO
```

## Ejecución

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start-business.ps1
```

Activa:

```text
Business → 8082
Coordination Hub → 9090
```

Customer puede permanecer cerrado mientras Business responde. Los cambios quedan en el Hub.

## QA

```powershell
npm run qa
```

Todas las auditorías de Business y la Fase 2 fueron aprobadas.
