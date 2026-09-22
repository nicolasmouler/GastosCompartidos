// Configuración del proyecto. Completá esto antes de publicar el sitio.
//
// 1) FIREBASE_CONFIG: lo copiás del panel de tu proyecto en Firebase
//    (Configuración del proyecto → tus apps → SDK setup and configuration).
//    Si ya tenés un proyecto de Firebase (por ejemplo el que usás para el
//    dashboard del crédito UVA), podés reutilizarlo: estos datos se guardan
//    en una rama distinta (ver DB_PATH), así que no pisan nada.
//
// 2) APP_PASSWORD: si querés que el sitio pida contraseña antes de mostrar
//    los movimientos, escribila acá entre comillas. Dejala como cadena
//    vacía ('') para que no pida nada.
//    Ojo: esto es solo una traba visual en el navegador, no es seguridad
//    real (cualquiera que sepa mirar el código la puede ver). La
//    protección real de los datos la da la regla de Firebase de más abajo.
//
// 3) DB_PATH: la "carpeta" dentro de tu base de datos donde se guardan
//    los movimientos. No hace falta tocarla salvo que quieras varias
//    instancias de esta app en el mismo proyecto de Firebase.

window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyCcuQFhXGdJsLp6CjWhWOlUKC3Ua3rL_JI",
    authDomain: "gastos-compartidos-ae28e.firebaseapp.com",
    databaseURL: "https://gastos-compartidos-ae28e-default-rtdb.firebaseio.com",
    projectId: "gastos-compartidos-ae28e",
    storageBucket: "gastos-compartidos-ae28e.firebasestorage.app",
    messagingSenderId: "1086836591660",
    appId: "1:1086836591660:web:5e10f64948c7be35621589"
};

window.APP_PASSWORD = "CasitaZapata2026$";

window.DB_PATH = "gastosCompartidos";

