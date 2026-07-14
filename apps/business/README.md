# DELIVER ASSETS Business v2.3

Actualización exclusiva de Business. Customer, Rider y Control no forman parte del paquete.

La interfaz principal, pedidos, finanzas y navegación permanecen intactos. Esta versión corrige el inventario reversible y añade fotografía comercial por producto.

## Inventario corregido

Business guarda el estado explícito que el operador solicita:

```text
ACTIVAR    → producto disponible
DESACTIVAR → producto agotado
```

El cambio no depende de invertir un valor anterior. Si la sincronización recibe una revisión comercial más antigua, Business conserva el valor local y vuelve a conciliarlo en lugar de apagar nuevamente el producto.

## Ficha profesional del producto

Ruta:

```text
Catálogo → Editar
```

Cada producto permite:

- foto desde Galería;
- foto con Cámara;
- recorte 4:3;
- publicación al Sync Hub;
- eliminación de fotografía;
- indicador de publicación;
- activación y agotamiento explícitos.

Estados visuales:

```text
SIN FOTO
GUARDADA EN EL TELÉFONO
PENDIENTE DE PUBLICAR
PUBLICANDO
PUBLICADA
```

La foto debe representar exactamente el producto que recibe el cliente.

## Publicación para Customer

Business guarda una copia privada y publica otra mediante:

```text
POST /v1/media/product
```

El Sync Hub devuelve una URL y la registra en:

```text
merchantStates[storeId].productImages[productId]
```

Customer necesita la versión compatible que renderiza esas URLs. Una URI privada de Android no puede compartirse directamente entre aplicaciones.

## Perfil comercial

Se mantiene por cada comercio:

- logo;
- foto del local;
- correo;
- teléfono;
- dirección;
- descripción.

El nombre canónico permanece bloqueado para proteger pedidos, catálogo e IDs.

## Mensajes propios

`FeedbackProvider` conserva los mensajes DELIVER ASSETS para inventario, imágenes, perfil, pedidos y sincronización. Los permisos oficiales de Android mantienen el diseño del sistema.

## Sync Hub compartido

Business utiliza por defecto:

```text
C:\DA\deliver-assets-hub\hub-state.json
C:\DA\deliver-assets-hub\media\
```

Eso permite que Business publique datos e imágenes que Customer puede leer cuando ambas apps se ejecutan de una en una contra el mismo Hub.

Iniciar solamente Business:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start-business.ps1
```

Procesos:

```text
Business Metro → 8082
Sync Hub       → 9090
```

Detener el Hub:

```powershell
.\scripts\stop-business.ps1
```

## Instalación Android

Business v2.2 ya incorporaba `expo-image-picker` y `expo-file-system`. Primero prueba v2.3 sin recompilar. Si el development build instalado no carga el código actualizado:

```powershell
npm run android:device
```

Package Android:

```text
com.deliverassets.business
```

## Auditoría

```powershell
npm run qa
```

Incluye TypeScript, ESLint, aislamiento, perfil comercial, medios, inventario reversible, publicación de imágenes, mensajes y tamaño.
