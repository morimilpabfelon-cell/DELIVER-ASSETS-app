# PRODUCT MEDIA COMPATIBILITY — Customer v2.6 / Business v2.3

## Regla técnica

Las aplicaciones Android tienen almacenamiento privado independiente. Customer no puede leer una ruta como:

```text
file:///data/user/0/com.deliverassets.business/...
```

Por eso Business publica la imagen en Sync Hub y comparte una URL HTTP local.

## Persistencia

El Hub conserva:

```text
C:\DA\deliver-assets-hub\media\product-<store>-<product>-<timestamp>.<ext>
```

El estado compartido conserva la URL. Al reemplazar o retirar una fotografía, el archivo público anterior se elimina.

## Producción

El Sync Hub es infraestructura local de desarrollo. En producción se sustituirá por:

- almacenamiento de objetos;
- URLs HTTPS;
- transformación de imágenes;
- CDN;
- validación de contenido;
- autenticación y permisos;
- historial de cambios.
