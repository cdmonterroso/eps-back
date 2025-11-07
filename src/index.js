const express = require('express');
const Keycloak = require("keycloak-connect");
const session = require('express-session');
const axios = require('axios');
const morgan = require('morgan');
const cors = require ("cors");
const bodyParser = require('body-parser');
const pool = require('./config/db')
const {config} = require('dotenv');
config();

//const PORT = process.env.PORT || 3000;
const app = express(); //Creando una instancia de express

app.use(morgan('dev')); //MIDDLEWARES
//app.use(express.json()); //la informacion que entra a la api es de tipo json
app.use(bodyParser.json());
app.use(cors());


// Configurar Keycloak con sesiones
const memoryStore = new session.MemoryStore();

app.use(
  session({
    secret: 'clave-secreta',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  })
);

const keycloak = new Keycloak({ store: memoryStore }, {
  clientId: 'cliente_nodejs',
  bearerOnly: true,
  //serverUrl: 'http://localhost:8080',
  serverUrl: 'http://10.17.1.36:3092',
  realm: 'ddo',
  credentials: {
    secret: '07GIrDkQdpKSNVxMVwLtwR6ow8FOzcBr',
  },
});

app.use(keycloak.middleware()); // Middleware de Keycloak

// Endpoint para autenticar al usuario
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
    }

    try {
        const grant = await keycloak.grantManager.obtainDirectly(username, password);
        res.status(200).json({
            accessToken: grant.access_token.token,
            refreshToken: grant.refresh_token.token,
            expiresIn: grant.access_token.content.exp,
        });
        console.log('Autenticado con Keycloak');
    } catch (error) {
        console.error('Error al autenticar al usuario:', error);
        res.status(401).json({ message: 'Credenciales inválidas' });
    }
});
  
/**RUTA PROTEGIDA */
app.get('/protected', keycloak.protect(), (req, res) => {
    res.json({ message: 'Acceso permitido', user: req.kauth.grant.access_token.content });
});

app.post('/logout', keycloak.protect(), async (req, res)=> {
    const token = req.kauth.grant.access_token.token; // Token del usuario actual
    try {
        await keycloak.grantManager.invalidate(token); // Revoca el token en Keycloak
        req.logout(); // Borra la sesión local
        res.redirect('/'); // Redirige al cliente
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        res.status(500).json({ message: 'Error al cerrar sesión' });
    }
});


app.get('/', (req, res) => {
    res.send('Hola, Proyecto EPS');
    console.log('Bienvenido!');
});

//Endpoint para obtener todas las unidades ejecutoras almacenadas
app.get('/unidades', async (req, res) => {
    try {
        // Usamos 'await' para esperar la respuesta de la base de datos
        // pool.query() usa una conexión del pool y la libera automáticamente
        const [rows] = await pool.query('SELECT * FROM unidades_ejecutoras');
        
        console.log(`Consulta exitosa, ${rows.length} filas devueltas.`);
        // Devolvemos los resultados como un JSON
        res.json(rows);

    } catch (error) {
        // Si algo sale mal, capturamos el error
        console.error('Error al consultar la base de datos: ', error);
        res.status(500).json({
            message: 'Error interno del servidor al consultar la base de datos'
        });
    }
});

//Endpoint para obtener los subprogrmas de una unidad ejecutora en específico 
app.get('/unidades/:codigo_unidad/subprogramas', async (req, res) => {
    const { codigo } = req.params;
    try {
        const [rows] = await pool.query(
            // Hacemos un JOIN para obtener también el nombre de la unidad ejecutora
            `SELECT 
                s.id_subprograma, 
                s.partida, 
                s.nombre_subprograma, 
                s.codigo_unidad_fk,
                u.nombre_unidad 
             FROM subprogramas s
             JOIN unidades_ejecutoras u ON s.codigo_unidad_fk = u.codigo_unidad
             WHERE s.codigo_unidad_fk = ?`,
            [codigo]
        );
        
        if (rows.length === 0) {
            console.log('No se encontraron subprogramas para esa unidad o la unidad no existe.');
            return res.status(404).json({ message: 'No se encontraron subprogramas para el código de unidad ejecutora proporcionado' });
        }

        console.log(`Consulta exitosa, ${rows.length} filas devueltas.`);
        res.json(rows);

    } catch (error) {
        console.error('Error al consultar subprogramas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

//IMPORTS
const routerCursos = require('./routers/cursos');
const routerUsuarios = require('./routers/usuarios');

//ROUTERS
//app.use('/cursos',routerCursos); //anteponer la palabra 'cursos' en los endpoint
app.use(routerCursos)
app.use(routerUsuarios);


//AL USAR DOCKER-COMPOSE, CAMBIAR A NODE_DOCKER_PORT
//app.listen(process.env.NODE_LOCAL_PORT, () => console.log('Running on port ' + process.env.NODE_LOCAL_PORT));
app.listen(process.env.NODE_DOCKER_PORT, "0.0.0.0", () => console.log('Running on port ' + process.env.NODE_DOCKER_PORT));
