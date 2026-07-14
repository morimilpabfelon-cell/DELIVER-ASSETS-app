# BUSINESS IDENTITY COMPATIBILITY — Customer v2.7

## Datos recibidos desde Business

```text
publicProfile
├── name
├── descriptor
├── description
├── address
├── email
├── phone
├── businessType
├── logoUrl
└── coverUrl

catalog
├── product
├── status
├── price
├── brand
├── presentation
├── attributes
└── variants
```

## Reglas

- Business es la autoridad del catálogo.
- Customer solo consume productos publicados o agotados.
- Borradores y archivados quedan ocultos.
- Los cambios se identifican mediante `storeId` y `productId`.
- Las imágenes utilizan URL pública del Sync Hub.
- Un carrito con precio antiguo no puede confirmarse.
- Los pedidos históricos conservan su copia del producto.
- El archivado no elimina productos de boletas anteriores.

## Resultado automatizado

- Auditoría Customer: 34/34.
- Carrito: 9/9.
- Regresiones: 21/21.
- Multi-carrito: 8/8.
- Mensajes: 16/16.
- Imágenes: 16/16.
- Fase 1 Customer: 23/23.
