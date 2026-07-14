# QA REPORT — DELIVER ASSETS Customer v2.6

## Resultado automatizado

- TypeScript: aprobado.
- ESLint: aprobado.
- Separación Customer: 14/14.
- Auditoría Customer: 34/34.
- Pruebas del carrito: 9/9.
- Regresiones: 21/21.
- Multi-carrito: 8/8.
- Mensajes y perfil: 16/16.
- Tamaño y aislamiento: aprobado.
- Fotografías de producto: 16/16.
- Versión: 2.6.0.
- Android `versionCode`: 26.
- iOS `buildNumber`: 26.

## Fotografías

Verificado:

- `productImages` por comercio y producto;
- migración desde schema v8;
- normalización de snapshots incompletos;
- catálogo con imagen;
- detalle con imagen;
- carrito con imagen;
- checkout con imagen;
- fallback al símbolo;
- recuperación tras error HTTP;
- URL versionada;
- soporte JPEG, PNG y WebP;
- Hub compartido;
- reemplazo automático de un Hub antiguo;
- prueba real de publicación y lectura de imagen.

## Integridad

No se modificaron:

- categorías;
- catálogos;
- precios;
- extras;
- notas;
- múltiples carritos;
- perfil;
- mensajes propios;
- DA Express;
- checkout;
- pedidos activos.

## Prueba manual recomendada

1. En Business, abre Barrio Burger.
2. Desactiva Combo Doble A y sincroniza.
3. Actívalo de nuevo y confirma que permanece activo.
4. Abre la ficha del producto.
5. Publica una fotografía y espera `PUBLICADA`.
6. Detén Metro de Business con `Ctrl + C`.
7. Inicia Customer con `start-customer.ps1`.
8. Abre Barrio Burger.
9. Comprueba la foto en catálogo y detalle.
10. Agrégalo al carrito.
11. Comprueba la misma foto en carrito y checkout.
12. Retira la foto desde Business.
13. Sincroniza y comprueba que Customer vuelve al símbolo original.
