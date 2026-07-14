# DELIVER ASSETS Customer v2.6

Actualización de compatibilidad visual con Business v2.3. Mantiene perfil, mensajes propios, múltiples carritos, checkout, DA Express y la identidad visual de Customer.

## Fotografías reales de productos

Customer ahora consume:

```text
merchantStates[storeId].productImages[productId]
```

Las imágenes publicadas desde Business aparecen en:

- catálogo del comercio;
- detalle del producto;
- carrito activo;
- checkout.

Si una imagen no existe, no carga o fue retirada, Customer vuelve al símbolo visual original sin bloquear la compra.

## Flujo de publicación

```text
Business selecciona una foto
→ Business publica al Sync Hub
→ Hub guarda el archivo y devuelve URL
→ Business sincroniza productImages
→ Customer descarga el estado
→ Customer muestra la foto
```

La URL lleva una versión para evitar que Android muestre una fotografía antigua desde caché.

## Inventario

Customer continúa respetando el estado publicado por Business:

```text
Producto activo  → puede abrirse y comprarse
Producto agotado → se muestra AGOTADO y queda bloqueado
Tienda pausada   → catálogo visible, compra bloqueada
```

La normalización del estado remoto conserva inventario e imágenes aunque el snapshot sea de una versión anterior.

## Sync Hub compartido

Customer y Business usan por defecto:

```text
C:\DA\deliver-assets-hub\hub-state.json
C:\DA\deliver-assets-hub\media\
```

El script detecta y reemplaza un Sync Hub antiguo que no tenga soporte para imágenes.

Iniciar solamente Customer:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start-customer.ps1
```

Procesos:

```text
Customer Metro → 8081
Sync Hub       → 9090
```

No es necesario abrir Business y Customer simultáneamente. Business puede publicar primero; después Customer utiliza el mismo estado y los mismos archivos compartidos.

## Instalación Android

No se añadieron dependencias nativas respecto de Customer v2.5. Primero prueba sin recompilar:

```powershell
npm ci
.\scripts\start-customer.ps1
```

Si el development build instalado no carga el código nuevo:

```powershell
npm run android:device
```

Package:

```text
com.deliverassets.customer
```

## Auditoría

```powershell
npm run qa
```

Incluye TypeScript, ESLint, aislamiento, perfil, multi-carrito, mensajes, tamaño e integración de fotografías publicadas por Business.
