# PRODUCT CATALOG AUDIT — DELIVER ASSETS Business v2.3

## Disponibilidad explícita

El inventario ya no invierte un valor ambiguo. Business envía el estado deseado de cada producto:

```text
ACTIVAR    → available = true
DESACTIVAR → available = false
```

La actualización usa la revisión comercial más reciente y mantiene el cambio local cuando el Sync Hub rechaza una revisión antigua. El estado se vuelve a conciliar sin regresar visualmente al valor anterior.

## Fotografías por producto

Cada producto dispone de una ficha propia:

```text
Catálogo → Editar producto
```

La ficha permite:

- elegir una foto desde Galería;
- tomar una foto con la cámara posterior;
- recortar en relación 4:3;
- guardar una copia privada en Business;
- publicar una copia en Sync Hub;
- retirar la imagen;
- consultar su estado de publicación;
- activar o agotar el producto.

## Separación entre archivo local y URL pública

Una URI privada de Business no puede abrirse desde Customer. Por eso la publicación sigue esta secuencia:

```text
Business localUri
→ Sync Hub /v1/media/product
→ archivo compartido
→ URL pública local
→ merchantStates.productImages[productId]
→ Customer
```

El Hub elimina la fotografía pública anterior del mismo producto y añade una versión a la URL para evitar caché visual.

## Integridad

No se modifican:

- IDs de tiendas;
- IDs de productos;
- precios;
- nombres;
- descripciones;
- pedidos existentes;
- conciliación financiera.

El editor completo de nombre, precio y descripción queda pendiente de un sistema de versiones de catálogo para no alterar operaciones históricas.
