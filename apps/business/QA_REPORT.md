# QA REPORT — DELIVER ASSETS Business v2.3

## Resultado automatizado

- TypeScript: aprobado.
- ESLint: aprobado.
- Separación Business: 11/11.
- Auditoría Business: 17/17.
- Auditoría de medios comerciales: 15/15.
- Auditoría de inventario: 11/11.
- Auditoría de fotografías de producto: 16/16.
- Auditoría de mensajes: 7/7.
- Auditoría de tamaño y aislamiento: aprobada.
- Versión: 2.3.0.
- Android `versionCode`: 23.
- iOS `buildNumber`: 23.

## Disponibilidad

Verificado:

- activación explícita;
- desactivación explícita;
- estado independiente por producto;
- estado independiente por comercio;
- persistencia local;
- normalización de datos anteriores;
- protección frente a revisiones antiguas del Hub;
- reintento sin revertir el interruptor;
- disponibilidad consumible por Customer.

## Fotografías de producto

Verificado:

- ficha individual;
- Galería y Cámara;
- recorte 4:3;
- archivo local único;
- publicación HTTP;
- límite de 4 MB en el Hub;
- JPEG, PNG y WebP;
- eliminación de fotografía pública anterior;
- URL versionada contra caché;
- persistencia en `productImages`;
- fallback visual;
- eliminación segura.

Se ejecutó una prueba real del endpoint local: publicación y lectura posterior de una imagen PNG aprobadas.

## Integridad

No se modificaron nombres, precios, descripciones, IDs, operaciones ni reglas financieras. El editor de campos comerciales del producto seguirá bloqueado hasta incorporar versionado de catálogo.

## Prueba manual recomendada

1. Abre Barrio Burger.
2. En Catálogo, desactiva Combo Doble A.
3. Cambia de sección y vuelve.
4. Actívalo nuevamente.
5. Sincroniza y confirma que permanece activo.
6. Entra a `Editar`.
7. Elige una fotografía real.
8. Publica la imagen.
9. Comprueba el estado `PUBLICADA`.
10. Cierra Business y vuelve a abrir.
11. Confirma disponibilidad e imagen.
12. Ejecuta Customer compatible y comprueba la foto del mismo producto.

## Exportación Android

La validación estructural terminó correctamente. La validación visual de cámara, galería, alternancia y publicación debe completarse en el teléfono físico conectado al Sync Hub compartido.
