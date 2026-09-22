# Cuentas claras — Delfina y Nicolás

Sitio estático para llevar el registro de gastos compartidos y pagos directos
entre Delfina y Nicolás, con saldo automático, agrupado por mes, y cotización
del dólar cargada sola. Pensado para publicarse en GitHub Pages y sincronizar
datos con Firebase Realtime Database (mismo esquema que el dashboard del
crédito UVA).

## 1. Crear (o reutilizar) un proyecto de Firebase

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com/) y creá un proyecto (o abrí uno que ya tengas).
2. En el menú lateral, andá a **Compilación → Realtime Database** y creá una base de datos (modo "bloqueado" está bien, las reglas se ajustan en el paso 3).
3. Andá a **Configuración del proyecto** (el engranaje) → pestaña **General** → sección "Tus apps" → **Agregar app → Web** (ícono `</>`). Ponele un nombre y registrala.
4. Firebase te va a mostrar un bloque `firebaseConfig = {...}`. Copiá esos valores.
5. Abrí `firebase-config.js` en este proyecto y pegalos en `window.FIREBASE_CONFIG`, reemplazando los placeholders (`TU_API_KEY`, etc.). Asegurate de que `databaseURL` esté completo (algo como `https://tu-proyecto-default-rtdb.firebaseio.com`).

Si ya tenés un proyecto de Firebase para otra cosa (como el dashboard UVA), podés
reutilizarlo tranquilamente: esta app guarda todo bajo una rama separada
(`gastosCompartidos` por defecto, configurable en `DB_PATH`), así que no pisa
nada de lo que ya tengas ahí.

## 2. Reglas de la base de datos

Para que solo ustedes dos puedan leer y escribir, lo más simple (sin armar
login) es dejar la base de datos abierta pero con un nombre de rama que nadie
más va a adivinar, y opcionalmente sumar la contraseña del paso 4. Si querés
algo más estricto, en **Realtime Database → Reglas** podés poner:

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

Esto abre lectura/escritura solo para la rama que usa esta app y bloquea el
resto de la base. No es autenticación real (cualquiera con el link y la URL
de tu base podría escribir), pero alcanza para un uso entre dos personas que
confían entre sí. Si más adelante querés algo más seguro, Firebase Auth con
email/contraseña es el siguiente paso natural.

## 3. Contraseña de acceso (opcional)

Si querés que el sitio pida una contraseña antes de mostrar los movimientos
(como el dashboard UVA), completá `window.APP_PASSWORD` en
`firebase-config.js` con el texto que quieras. Dejalo como `""` para que no
pida nada. Ojo: es una traba visual en el navegador, no reemplaza las reglas
de Firebase del paso 2.

## 4. Publicar en GitHub Pages

1. Creá un repositorio nuevo en GitHub (puede ser privado o público — si es
   público, cualquiera podrá ver el código y por lo tanto el `firebaseConfig`,
   pero eso no es un problema de seguridad en sí mismo: lo que protege los
   datos son las reglas de Firebase del paso 2, no ocultar esta clave).
2. Subí los 4 archivos de esta carpeta (`index.html`, `styles.css`, `app.js`,
   `firebase-config.js`) a la raíz del repo.
3. En el repo, andá a **Settings → Pages**, y en "Source" elegí la rama
   `main` (o la que uses) y la carpeta `/ (root)`.
4. Esperá un minuto y el sitio va a quedar publicado en
   `https://tu-usuario.github.io/nombre-del-repo/`.

Cada vez que quieras actualizar el sitio, alcanza con subir los cambios al
repo (`git push`); GitHub Pages se actualiza solo.

## Cómo funciona la cotización automática

Al elegir "Pago directo" → "Dólares", el sitio busca solo la cotización:

- Si la fecha cargada es **hoy**, usa la cotización actual de
  [dolarapi.com](https://dolarapi.com).
- Si es una fecha **pasada**, busca el valor histórico de ese día en
  [argentinadatos.com](https://argentinadatos.com) (que a su vez toma los
  datos de DolarApi).

Podés elegir el tipo de cotización (Blue, Oficial, MEP, CCL, Mayorista,
Cripto) con el selector. El valor se puede editar a mano en cualquier
momento — si tocás el campo, deja de autocompletarse hasta que uses el botón
⟳ para volver a buscarlo. Como son APIs públicas y gratuitas, puede fallar
alguna consulta puntual (fin de semana sin cotización cargada, corte del
servicio, etc.): en ese caso el sitio te avisa y podés cargar el número a
mano sin problema.

## Estructura del proyecto

```
index.html          — la página
styles.css           — estilos
app.js                — toda la lógica (formulario, saldo, Firebase, cotización)
firebase-config.js   — tus credenciales de Firebase + contraseña opcional
```
