# BUSINESS PROFILE AUDIT — v2.2

## Decisión de arquitectura

Las imágenes comerciales son datos locales de Business y no forman parte de `merchantStates`.

Motivo:

```text
file:///data/user/.../com.deliverassets.business/...
```

Una URI privada de Business no puede ser leída por Customer, Rider o Control. Enviarla al Sync Hub produciría imágenes rotas en las otras aplicaciones.

El prototipo conserva las imágenes en:

```text
Paths.document/deliver-assets-business-media/
```

El backend futuro deberá:

1. recibir el archivo;
2. validarlo;
3. optimizarlo;
4. almacenarlo;
5. devolver una URL pública o firmada;
6. distribuir esa URL a Customer.

## Separación de identidades

Cada `storeId` mantiene:

```text
logoUri
coverUri
email
phone
address
description
updatedAt
```

Cambiar Barrio Burger no modifica Mercado 24. El nombre del catálogo no es editable en esta fase para proteger las asociaciones de pedidos.

## Persistencia

- Namespace principal conservado: `@deliver-assets/business-state-v2`.
- Schema actualizado: v7.
- Migración admitida: v1 a v6.
- Archivos antiguos se eliminan solo después de validar el nuevo archivo.
- Reset demo limpia medios administrados.
