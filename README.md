# Cuentas claras — Delfina y Nicolás

Sitio estático para llevar el registro de gastos compartidos y pagos directos
entre Delfina y Nicolás. Publicado en GitHub Pages, sincroniza con Firebase
Realtime Database.

## Novedades de esta versión

- **Login con Google (opcional):** restringe quién puede cargar, editar o
  borrar movimientos a las cuentas que vos definas.
- **Deshacer al eliminar:** al borrar un movimiento aparece un botón
  "Deshacer" por 5 segundos.
- **Categorías** en los gastos compartidos, con filtro por categoría.
- **Exportar a CSV** (botón ⬇ junto a los filtros).
- **Gráfico** de evolución del saldo a lo largo del tiempo.
- **Foto del ticket** opcional en cada gasto.
- **App instalable (PWA):** desde el navegador del celu, "Agregar a la
  pantalla de inicio".
- **Botón + flotante** en mobile para ir directo al formulario.
- **Borrador automático:** si recargás sin querer con el formulario a
  medio llenar, lo recupera solo.

## 1. Firebase — lo de siempre

Los pasos para crear el proyecto, la Realtime Database y completar
`firebase-config.js` con tu `FIREBASE_CONFIG` son los mismos que ya
hiciste. Si es la primera vez, la sección "Crear un proyecto de Firebase"
de la versión anterior de este README te sirve igual.

## 2. Reglas de la base de datos

Si **no** vas a usar el login con Google (dejaste `ALLOWED_EMAILS` vacío),
seguí usando las reglas simples de siempre:

```json
{
  "rules": {
    "gastosCompartidos": {
      ".read": true,
      ".write": true
    },
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

## 3. Login con Google (opcional pero recomendado)

Esto es lo que da seguridad *real* — la contraseña del paso del gate es
solo una cortina visual.

1. En la consola de Firebase de tu proyecto, andá a **Authentication →
   Sign-in method** → habilitá **Google** como proveedor.
2. En **Authentication → Settings → Authorized domains**, agregá tu
   dominio de GitHub Pages (por ejemplo `nicolasmouler.github.io`) si no
   aparece ya solo.
3. En `firebase-config.js`, completá:
   ```js
   window.ALLOWED_EMAILS = ["nicolas@gmail.com", "delfina@gmail.com"];
   ```
   (con las cuentas de Google reales de cada uno).
4. En **Realtime Database → Reglas**, reemplazá por esto — cambiando los
   dos emails de ejemplo por los mismos que pusiste arriba:
   ```json
   {
     "rules": {
       "gastosCompartidos": {
         ".read": true,
         ".write": "auth != null && (auth.token.email === 'nicolas@gmail.com' || auth.token.email === 'delfina@gmail.com')"
       },
       "$other": {
         ".read": false,
         ".write": false
       }
     }
   }
   ```
5. Publicá las reglas.

Con esto, cualquiera con el link y la contraseña puede *ver* los
movimientos, pero solo ustedes dos — conectados con su cuenta de Google —
pueden cargar, editar o borrar. Si dejás `ALLOWED_EMAILS` vacío, el sitio
funciona exactamente como antes (sin pedir Google).

## 4. Ícono y nombre de la app instalable

Ya incluí `manifest.json` y dos íconos genéricos (`icon-192.png`,
`icon-512.png`) para que el sitio se pueda instalar como app. Si querés un
ícono propio, reemplazá esos dos archivos por tus PNG (mismos nombres y
tamaños) y volvé a subir.

## 5. Publicar en GitHub Pages

Subí **todos** los archivos de esta carpeta a la raíz del repo (no en una
subcarpeta): `index.html`, `styles.css`, `app.js`, `firebase-config.js`,
`manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`. Si ya tenías el
repo armado, alcanza con subir/reemplazar estos mismos archivos.

Si cambiás `app.js` o `styles.css` más adelante y ves que el celular sigue
mostrando la versión vieja, es el Service Worker cacheando: abrí `sw.js` y
cambiá `CACHE_NAME` (por ejemplo de `'cuentas-claras-v1'` a
`'cuentas-claras-v2'`), subí ese cambio, y en el celular forzá un refresh
una vez más.

## Sobre la foto del ticket

Se guarda directamente en la base de datos como imagen comprimida (no usa
Firebase Storage, para mantener todo simple). Cada foto pesa entre 50 y
150 KB aprox. Es un uso perfectamente razonable para uso personal, pero si
con el tiempo suman muchísimas fotos y notan que la app carga más lento,
se puede pasar a Firebase Storage más adelante.

## Cómo funciona la cotización automática

Al elegir "Pago directo" → "Dólares", el sitio busca solo la cotización:
actual (dolarapi.com) si la fecha es hoy, o histórica de ese día puntual
(argentinadatos.com) si es una fecha pasada. Podés elegir Blue, Oficial,
MEP, CCL, Mayorista o Cripto. El valor es editable a mano en cualquier
momento.

## Estructura del proyecto

```
index.html                  — la página
styles.css                  — estilos
app.js                       — toda la lógica
firebase-config.js          — tus credenciales de Firebase + contraseña + emails autorizados
manifest.json                — metadata para instalar como app
sw.js                        — service worker (caché del sitio, no de los datos)
icon-192.png, icon-512.png  — íconos de la app
```
