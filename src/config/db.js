const { createPool } = require('mysql2/promise');
const {config} = require('dotenv');
config();

/*console.log({
    host: process.env.MYSQLDB_HOST,
    password: process.env.MYSQLDB_PASSWORD,
    port: process.env.MYSQLDB_PORT
});*/


//BASE DE DATOS CON DOCKER
const pool = createPool({
    host: process.env.MYSQLDB_HOST, //Nombre del service en el docker-compose
    // host: 'localhost', //cuando la base de datos está en la máquina local
    user: process.env.MYSQLDB_USER,
    password: process.env.MYSQLDB_PASSWORD,
    database: process.env.MYSQLDB_DATABASE,
    port: process.env.MYSQLDB_DOCKER_PORT //cuando se está en la misma red (docker-compose xxx:3306)
    // port: 3307 //cuando se expone el puerto en la máquina local (3307:3306)
});
// Mensaje de éxito si el pool se crea
console.log('Pool de conexiones MySQL creado exitosamente.');

/*
//BASE DE DATOS LOCAL
const pool = createPool({
    host: process.env.MYSQLDB_LOCALHOST,
    user: process.env.MYSQLDB_LOCALUSER,
    password: process.env.MYSQLDB_LOCALPASSWORD, //'123'
    database: process.env.MYSQLDB_DATABASE, //'ddo'
    port: process.env.MYSQLDB_PORT //3306
});
*/
module.exports = pool;
