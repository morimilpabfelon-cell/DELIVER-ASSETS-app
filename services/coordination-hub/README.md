# DELIVER ASSETS Coordination Hub v2.3

Servicio local de desarrollo para la Fase 3.

Coordina:

- Customer;
- Business;
- Rider asignado;
- Control cuando existe escalamiento;
- mensajes de texto;
- fotografías;
- boletas;
- estado de pago;
- participantes;
- cierre histórico al entregar o cancelar;
- identidad y catálogo comercial.

## Capacidades

```text
product-media-v1
business-media-v1
catalog-v2
coordination-v2
chat-media-v1
receipt-v1
rider-chat-v1
control-intervention-v1
```

## Reglas

- Rider entra únicamente después de aceptar una oferta.
- Control entra únicamente cuando una conversación fue escalada.
- Los mensajes se fusionan por ID.
- La boleta conserva sus importes originales.
- Al finalizar el pedido, el chat pasa a solo lectura.
- Los datos compartidos permanecen en `C:\DA\deliver-assets-hub`.

## Ejecución

```powershell
.\start-hub.ps1
```

## Pruebas

```powershell
node .\coordination-test.mjs
node .\e2e-chat-test.mjs
node .\phase3-test.mjs
```

Este Hub es para desarrollo local. Producción requiere autenticación, autorización de servidor, cifrado, almacenamiento externo, retención y auditoría formal.
