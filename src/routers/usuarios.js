const {Router} = require('express'); //obteniendo solamente Router de express
const axios = require('axios');
const xml2js = require('xml2js');
const routerUsuarios = Router();
const pool = require('../config/db');

// Detalles de la API de Moodle
const WEB_SERVICE_URL = 'https://pruebassiif.usac.edu.gt/WSDatosTrabajador/WSDatosTrabajadorSoapHttpPort';
const MOODLE_URL = 'https://radd15.virtual.usac.edu.gt/ddo/webservice/rest/server.php';
const TOKEN = '64d0d9123eb0ad4f4a84744c055ba746'; 
const MOODLE_WS_FORMAT = 'json';


// Función para obtener los datos del usuario logueado
async function getUserData(username) {
    try {
        const response = await axios.get(MOODLE_URL, {
            params: {
                wstoken: TOKEN,
                wsfunction: 'core_user_get_users_by_field',
                moodlewsrestformat: MOODLE_WS_FORMAT,
                //criteria: JSON.stringify([{ key: '', value: '' }]) // Criterio vacío para obtener todos los usuarios
                field: 'username',
                'values[0]': username 
            }
        });
        return response.data[0];
    } catch (error) {
        console.error('Error al obtener los usuarios:', error.message);
        throw error;
    }
}

routerUsuarios.get('/datousuario/:username', async (req, res) => {

    const {username} = req.params;

    if (!username) {
        return res.status(400).json({ message: 'El parámetro id es requerido.' });
    }
    try {
        const userData = await getUserData(username);
        //console.log(users.json);
        res.json(userData).status(200); // Envía la información del usuario como respuesta en formato JSON
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
});


// Función para obtener todos los usuarios de Moodle
async function getAllUsers() {
    try {
        const response = await axios.get(MOODLE_URL, {
            params: {
                wstoken: TOKEN,
                wsfunction: 'core_user_get_users',
                moodlewsrestformat: MOODLE_WS_FORMAT,
                //criteria: JSON.stringify([{ key: '', value: '' }]) // Criterio vacío para obtener todos los usuarios
                'criteria[0][key]': '',
                'criteria[0][value]': '' 
            }
        });
        return response.data.users;
    } catch (error) {
        console.error('Error al obtener los usuarios:', error.message);
        throw error;
    }
}

routerUsuarios.get('/listadousuarios', async (req, res) => {
    try {
        const users = await getAllUsers();
        //console.log(users.json);
        res.json(users); // Envía la lista de usuarios como respuesta en formato JSON
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
});



/**CÓDIGO LIMPIO Y OPTIMIZADO */

// Función para obtener el listado de estudiantes asignados a un curso específico por ID
async function getEstudiantesDelCurso(idCurso) {
    try {
        const response = await axios.get(MOODLE_URL, {
            params: {
                wstoken: TOKEN,
                //Obtiene todos los usuarios matriculados del curso, se puede filtrar por rol.
                wsfunction: 'core_enrol_get_enrolled_users',
                moodlewsrestformat: MOODLE_WS_FORMAT,
                courseid: Number(idCurso) //Casteo a number
            }
        });

        const usuarios = response.data;

        // Filtra usuarios con rol "student", (OBTIENE TODAS LAS COINCIDENCIAS)
        const estudiantes = usuarios.filter(user => // 'filter' devuelve un arreglo si hay varios)
            user.roles.some(role => role.shortname === 'student')
        );
        return estudiantes;
    } catch (error) {
        console.error('Error al obtener los estudiantes del curso: ', error.message);
        throw new Error('No se pudo obtener la lista de estudiantes');
    }
}

// Endpoint /getEstudiantes que acepta un parámetro de consulta (idCurso)
routerUsuarios.get('/getEstudiantes/:idCurso', async (req, res) => {
    const {idCurso} = req.params;

    if (!idCurso || isNaN(Number(idCurso)) ) {
        return res.status(400).json({ message: 'El parámetro idCurso es requerido y debe ser numérico.' });
    }

    try {
        const estudiantes = await getEstudiantesDelCurso(idCurso);

        if (estudiantes.length > 0) {
            return res.status(200).json(estudiantes); // Envía al FRONT el listado de estudiantes como respuesta en formato JSON
        } else {
            return res.status(404).json({message:'No se encontraron estudiantes en este curso'}); // Envía al FRONT un mensaje de no encontrado
        }
    } catch (error) {
        console.error('Error en /getEstudiantes:', error);
        return res.status(500).json({ message: 'Error al obtener los estudiantes del curso' });
    }
});



// Función para obtener el estado del estudiante a traves de su ID en un determinado curso
async function getEstadoEstudiante(idCurso, idUsuario) {
    try {
        const response = await axios.get(MOODLE_URL, {
            params: {
                wstoken: TOKEN,
                //Obtiene el estado del estudiante en un determinado curso.
                wsfunction: 'core_completion_get_course_completion_status',
                moodlewsrestformat: MOODLE_WS_FORMAT,
                courseid: Number(idCurso), //Casteo a number
                userid: Number(idUsuario) //Casteo a number
            }
        });

        return response.data;

    } catch (error) {
        console.error('Error al obtener el estado del estudiante: ', error.message);
        throw new Error('No se pudo obtener el estado del estudiante');
    }
}

// Endpoint /getEstadoEstudiante que recibe un objeto JSON como body, tiene que ser POST
routerUsuarios.post('/getEstadoEstudiante', async (req, res) => {
    const {idCurso, idUsuario} = req.body;

    if (!idCurso || !idUsuario ) {
        return res.status(400).json({ message: 'Faltan parametro obligatorios' });
    }

    try {
        const estadoEstudiante = await getEstadoEstudiante(idCurso,idUsuario);
        return res.status(200).json(estadoEstudiante);
        //return res.send(estadoEstudiante);
    } catch (error) {
        console.error('Error en /getEstadoEstudiante:', error);
        return res.status(500).json({ message: 'Error al obtener el estado del estudiante' });
    }
});



// Función para consumir el web service SIIF
async function getPuestoTrabajo(registroPersonal) { // (registro) 201602560
    //const registroPersonal = 20150881
    const soapXml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:typ="http://siif/WSDatosTrabajador.wsdl/types/">
      <soapenv:Header/>
      <soapenv:Body>
        <typ:getdatosTrabajadorElement>
          <typ:pxml><![CDATA[
            <SOLICITUD_DATOS_TRABAJADOR>
              <REGISTRO_PERSONAL>${registroPersonal}</REGISTRO_PERSONAL>
            </SOLICITUD_DATOS_TRABAJADOR>
          ]]></typ:pxml>
        </typ:getdatosTrabajadorElement>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

    try {
        //axios.get() si envío datos en params; si envío datos en headers o un body, se usa axios.post()
        const response = await axios.post(WEB_SERVICE_URL, soapXml, {
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8'
            },
            timeout: 1000
        });

        return response.data;

    } catch (error) {
        console.error('Error al conectar con el web service SIIF: ', error.message);
        throw new Error('No se pudo obtener los datos del trabajador');
    }
}

// Endpoint /getDatosTrabajador 
routerUsuarios.post('/getPuestoTrabajo', async (req, res) => {
    const {registro} = req.body;

    if (!registro) {
        return res.status(400).json({ message: 'El registro del usuario es obligatorio' });
    }

    var respuesta;

    try {
        const trabajador = await getPuestoTrabajo(registro);
        //res.type('application/xml').send(trabajador); // Devuelve la respuesta XML como está

        const parser1 = new xml2js.Parser({ explicitArray: false, trim: true });
        parser1.parseString(trabajador, (err, result) => {
            if (err) {
                console.error('Error al parsear XML:', err);
                return res.status(500).json({ message: 'Error al convertir XML a JSON.' });
            }

            //res.json(result);
            // Opcional: puedes navegar hasta el nodo que contiene la respuesta real
            // Ejemplo: result['soapenv:Envelope']['soapenv:Body']
            respuesta = result["env:Envelope"]["env:Body"]["ns0:getdatosTrabajadorResponseElement"]["ns0:result"] // Devuelve la respuesta en formato JSON
            //res.status(200).json(respuesta); 
        });

    } catch (error) {
        console.error('Error al consultar el servicio SOAP:', error.message);
        return res.status(500).json({ message: 'Error al conectar con el web service SIIF.' });
    }

    try {
        const parser2 = new xml2js.Parser({ explicitArray: false, trim: true });
        parser2.parseString(respuesta, (err, result)=>{
            if (err) {
                console.error('Error al parsear la respuesta interna:', err);
                return res.status(500).json({ message: 'Error al convertir XML interno a JSON.' });
            }
            const codigoUnidad = result.RESPUESTA_DATOS_TRABAJADOR.DETALLE_PUESTOS.CODIGO_UNIDAD
            const codigoSubUnidad = result.RESPUESTA_DATOS_TRABAJADOR.DETALLE_PUESTOS.COD_SUB_UNIDAD
            const arregloUnidad = [
                String(codigoUnidad),
                String(codigoSubUnidad)
            ];
            res.status(200).json(arregloUnidad); //string ("32, 105")
        });


    } catch (error) {
        console.error('Error al obtener el puesto de trabajo:', error.message);
        return res.status(500).json({ message: 'Error al obtener el puesto de trabajo.' + error.message});
    }
});







routerUsuarios.get('/usuario', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const resultado = await connection.query('select * from Persona');
        res.status(200).json(resultado[0]);
    } catch (error) {
        res.status(500).send('Error al realizar la consulta: ', error);
    } finally {
        connection.release();
    }

});

routerUsuarios.get('/tipo_usuario', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        /*const resultado = await connection.query('select * from TipoPersona');
        res.status(200).json(resultado);*/

        const [rows, fields] = await connection.query('select * from TipoPersona');
        console.log(rows);
        res.json(rows);
        console.log(rows[1].id_tipoPersona, ' - ', rows[1].nombre, ' - ', res.statusCode);

        /*Usuarios = [];
        rows.map( usuarios => {
            let usuarioEsquema = {

            }
        });*/

    } catch (error) {
        res.status(500).send('Error al realizar la consulta: ', error);
    } finally {
        connection.release();
    }
});

routerUsuarios.get('/usuario/:id', async (req, res)=>{
    const connection = await pool.getConnection();
    try {
        const {id} = req.params;
        const sql = 'select * from Persona where id_persona = ?'
        const values = [id]
        const [rows, fields] = await connection.execute(sql,values);
        console.log(rows[0]);
        res.json(rows[0]); //Respuesta (Devuelve directamente el objeto)
    } catch (error) {
        res.send('Error al realizar la consulta: ', error);
    } finally {
        connection.release();
    }
});

routerUsuarios.get('/tipo_usuario/:id', async (req, res)=>{
    const connection = await pool.getConnection();
    try {
        const {id} = req.params;
        const sql = 'select * from TipoPersona where id_tipoPersona = ?'
        const values = [id]
        const [rows, fields] = await connection.execute(sql,values);
        console.log(rows[0]);
        res.json(rows[0]); //Respuesta (Devuelve directamente el objeto)
    } catch (error) {
        res.send('Error al realizar la consulta: ', error);
    } finally {
        connection.release();
    }
});

module.exports = routerUsuarios;
