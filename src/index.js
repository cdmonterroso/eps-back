const express = require('express');
const Keycloak = require("keycloak-connect");
const session = require('express-session');
const axios = require('axios');
const morgan = require('morgan');
const cors = require ("cors");
const bodyParser = require('body-parser');
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
  serverUrl: 'http://localhost:8080',
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


app.get('/', (req, res) => {
    res.send('Hola, Proyecto EPS');
    console.log('Bienvenido!');
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

//IMPORTS
const routerCursos = require('./routers/cursos');
const routerUsuarios = require('./routers/usuarios');

//ROUTERS
//app.use('/cursos',routerCursos); //anteponer la palabra 'cursos' en los endpoint
app.use(routerCursos)
app.use(routerUsuarios);


//AL USAR DOCKER-COMPOSE, CAMBIAR A NODE_DOCKER_PORT
//app.listen(process.env.NODE_LOCAL_PORT, () => console.log('Running on port ' + process.env.NODE_LOCAL_PORT));
app.listen(process.env.NODE_DOCKER_PORT, () => console.log('Running on port ' + process.env.NODE_DOCKER_PORT));
