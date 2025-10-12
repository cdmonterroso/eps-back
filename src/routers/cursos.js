const {Router} = require('express'); //obteniendo solamente Router de express
const axios = require('axios');
const routerCursos = Router();
const pool = require('../config/db');

// Detalles de la API de Moodle
const MOODLE_URL = 'https://radd15.virtual.usac.edu.gt/ddo/webservice/rest/server.php';
const TOKEN = '64d0d9123eb0ad4f4a84744c055ba746'; 
const MOODLE_WS_FORMAT = 'json';

// Función para obtener todos los cursos de Moodle
async function getAllCourses() {
    try {
        const response = await axios.get(MOODLE_URL, { //.post o .get
            params: {
                wstoken: TOKEN,
                wsfunction: 'core_course_get_courses',
                moodlewsrestformat: MOODLE_WS_FORMAT
            }
        });
        return response.data; //Arreglo de objetos, cada objeto es un curso
    } catch (error) {
        console.error('Error al obtener los cursos:', error.message);
        throw error;
    }
}

routerCursos.get('/actividadesmoodle', async (req, res) => {
    try {
        const courses = await getAllCourses();
        res.json(courses).status(200); // Envía los cursos como respuesta en formato JSON
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los cursos' });
    }
});


// Función para obtener todos los cursos de Moodle que están asignados a un usuario
async function getCoursesAssigned(userid) { //ID DE MOODLE, NO REGISTRO ACADEMICO
    try {
        const response = await axios.get(MOODLE_URL, { //.post o .get
            params: {
                wstoken: TOKEN,
                wsfunction: 'core_enrol_get_users_courses',
                moodlewsrestformat: MOODLE_WS_FORMAT,
                userid: userid
            }
        });
        return response.data; //Arreglo de objetos, cada objeto es un curso
    } catch (error) {
        console.error('Error al obtener los cursos asignados:', error.message);
        throw error;
    }
}

routerCursos.get('/actividadesmatriculadas/:userid', async (req, res) => {
    const {userid} = req.params;

    if (!userid) {
        return res.status(400).json({ message: 'El parámetro id es requerido.' });
    }
    try {
        const courses = await getCoursesAssigned(userid);
        if (courses) {
            res.json(courses).status(200); // Envía los cursos como respuesta en formato JSON
        } else {
            res.status(404).json({ message: 'No hay cursos matriculados.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los cursos' });
    }

});


// Función para obtener la información de un curso específico por ID
async function getCourseDetail(courseId) {
    try {
        const response = await axios.get(MOODLE_URL, {
            params: {
                wstoken: TOKEN,
                wsfunction: 'core_course_get_courses_by_field',
                moodlewsrestformat: MOODLE_WS_FORMAT,
                field: 'id',
                value: courseId
            }
        });

        // Moodle devuelve un objeto que contiene un array con los detalles del curso
        const course = response.data.courses[0];
        return course;
    } catch (error) {
        console.error('Error al obtener el detalle del curso:', error.message);
        throw error;
    }
}

// Define el endpoint /detallecurso que acepta un parámetro de consulta (courseId)
routerCursos.get('/detallecurso/:id', async (req, res) => {
    //const courseId = req.query.courseId;
    const {id} = req.params;

    if (!id) {
        return res.status(400).json({ message: 'El parámetro id es requerido.' });
    }

    try {
        const courseDetail = await getCourseDetail(id);

        if (courseDetail) {
            res.json(courseDetail).status(200); // Envía los detalles del curso como respuesta en formato JSON
        } else {
            res.status(404).json({ message: 'Curso no encontrado.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el detalle del curso' });
    }
});



// Función para matricular un curso a un usuario
async function asignarCurso(idUsuario, idCurso) {
    try {
        const response = await axios.get(MOODLE_URL, {
            params: {
                wstoken: TOKEN,
                wsfunction: 'enrol_manual_enrol_users',
                moodlewsrestformat: MOODLE_WS_FORMAT,
                'enrolments[0][roleid]': 5,
                'enrolments[0][userid]': idUsuario,
                'enrolments[0][courseid]': idCurso
            }
        });

        // Moodle devuelve un objeto Null cuando se asigna correctamente el curso
        return response.data;
    } catch (error) {
        console.error('Error al matricular el curso:', error.message);
        throw error;
    }
}

// Define el endpoint /asignarCurso que acepta dos parámetros para la asignación del curso
routerCursos.get('/asignarCurso/:idUsuario/:idCurso', async (req, res) => {
    //const courseId = req.query.courseId;
    const {idUsuario, idCurso} = req.params;

    if (!idUsuario || !idCurso) {
        return res.status(400).json({ message: 'Los parámetros idCurso e idUsuario son requeridos.' });
    }

    try {
        const detalleCurso = await asignarCurso(idUsuario, idCurso);

        if (detalleCurso === null) {
            res.json(detalleCurso).status(200); //null
        } else {
            res.status(404).json({ message: 'No se pudo asignar el curso' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al asignar el curso' });
    }
});



/**CÓDIGO LIMPIO Y OPTIMIZADO */

// Función para obtener el profesor de un curso específico por ID
async function getProfesorDelCuros(idCurso) {
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

        //const usuarios = response.data[0]; //obtiene solo la primera posición del arreglo de objetos
        const usuarios = response.data;

        // Filtra por rol de profesor (editingteacher), (OBTIENE EL PRIMER PROFESOR QUE ENCUENTRE)
        const profesor = usuarios.find(user => // 'find' encuentra la primera coincidencia
            user.roles.some(role => role.shortname === 'editingteacher')
        );
        return profesor;
    } catch (error) {
        console.error('Error al obtener el detalle del profesor: ', error.message);
        throw new Error('No se pudo obtener el profesor del curso');
    }
}

// Endpoint /getProfesor que acepta un parámetro de consulta (idCurso)
routerCursos.get('/getProfesor/:idCurso', async (req, res) => {
    const {idCurso} = req.params;

    if (!idCurso || isNaN(Number(idCurso)) ) {
        return res.status(400).json({ message: 'El parámetro idCurso es requerido y debe ser numérico.' });
    }

    try {
        const profesor = await getProfesorDelCuros(idCurso);

        if (profesor) {
            return res.status(200).json(profesor); // Envía al FRONT los detalles del profesor como respuesta en formato JSON
        } else {
            return res.status(404).json({message:'Profesor no encontrado en este curso'}); // Envía al FRONT un mensaje de no encontrado
        }
    } catch (error) {
        console.error('Error en /getProfesor:', error);
        return res.status(500).json({ message: 'Error al obtener el detalle del profesor' });
    }
});



// Función para saber si un usuario ya está asignado a un curso
async function getCursoAsignado(idUsuario,idCurso) {
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

        // Verifica si el usuario ya está matriculado
        const yaMatriculado = usuarios.some(user => user.id == idUsuario);
        return yaMatriculado;
    } catch (error) {
        console.error('Error al obtener el detalle ', error.message);
        throw new Error('No se pudo obtener el detalle del curso asignado');
    }
}

// Endpoint /getCursoAsignado que acepta un objeto JSON como body, tiene que ser POST
routerCursos.post('/getCursoAsignado', async (req, res) => {
    const {idUsuario, idCurso} = req.body;

    if (!idCurso || !idUsuario ) {
        return res.status(400).json({ message: 'Faltan parametro obligatorios' });
    }

    try {
        const usuarioAsignado = await getCursoAsignado(idUsuario,idCurso);
        return res.send(usuarioAsignado); //true o false
    } catch (error) {
        console.error('Error en /getCursoAsignado:', error);
        return res.status(500).json({ message: 'Error al obtener el detalle del curso asignado' });
    }
});



// Función para obtener las categorias de las actividades
async function getCategorias() {
    try {
        const response = await axios.get(MOODLE_URL, {
            params: {
                wstoken: TOKEN,
                wsfunction: 'core_course_get_categories',
                moodlewsrestformat: MOODLE_WS_FORMAT,
                /*'criteria[0][key]': 'id',
                'criteria[0][value]': idCategoria*/
            }
        });

        const categorias = response.data;
        return categorias;
        
    } catch (error) {
        console.error('Error al obtener las categorías de los cursos ', error.message);
        throw new Error('No se pudo obtener las categorías de los cursos');
    }
}

// Endpoint /getCategorias que recibe un objeto JSON como body, tiene que ser POST
routerCursos.get('/getCategorias', async (req, res) => { //cambio a get ya que no envío el body
    /*const {idCategoria} = req.body;

    if (!idCategoria ) {
        return res.status(400).json({ message: 'El id de la categoría es obligatorio' });
    }*/

    try {
        const categorias = await getCategorias();
        return res.status(200).json(categorias);
    } catch (error) {
        console.error('Error en /getCategorias:', error);
        return res.status(500).json({ message: 'Error al obtener el detalle de la categoría' });
    }
});






routerCursos.get('/actividad', async (req, res) => {
    //response.send(infoPersonas);
    //response.send(JSON.stringify(infoPersonas)) //Formato JSON
    //const resultado = await pool.query("select NOW()");
    const connection = await pool.getConnection();
    try {
        /*const resultado = await connection.query('select * from Actividad');
        res.status(202).json(resultado[0]);*/
        const [rows, fields] = await connection.query('select * from Actividad');
        console.log(rows);
        res.json(rows);
        console.log(rows[1].id_actividad, ' - ', rows[1].nombre, ' - ', res.statusCode);

        //CONSTRUYENDO UNA RESPUESTA EN FORMATO JSON
        /*res.json({
            message: "API connection established.",
            status: "success"
          })
          .status(200);*/
    } catch (error) {
        res.send('Error al realizar la consulta: ', error);
    } finally {
        connection.release();
    }
    //res.send(JSON.stringify(resultado[0]));
});


routerCursos.get('/tipo_actividad', async (req, res)=> {
    const connection = await pool.getConnection();
    try {
        const [rows, fields] = await connection.query('select * from TipoActividad');
        console.log(rows);
        res.json(rows).status(200); //Respuesta (Devuelve un arreglo de objetos)
    } catch (error) {
        res.send('Error al realizar la consulta: ', error);
    } finally {
        connection.release();
    }
});

routerCursos.get('/actividad/:id', async (req, res)=>{
    const connection = await pool.getConnection();
    try {
        const {id} = req.params;
        const sql = 'select * from Actividad where id_actividad = ?'
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


routerCursos.get('/tipo_actividad/:id', async (req, res)=>{
    const connection = await pool.getConnection();
    try {
        const {id} = req.params;
        const sql = 'select * from TipoActividad where id_TipoActividad = ?'
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

routerCursos.get('/estudiantesAsignados/:id', async (req,res)=>{ //id de la actividad
    const connection = await pool.getConnection();
    try {
        const {id} = req.params;
        const sql = `SELECT p.id_persona, p.registro, p.nombre, p.apellido, p.correo
                    FROM Persona p
                    JOIN Matricula m ON p.id_persona = m.id_personaEstudiante
                    JOIN Actividad a ON m.id_actividad = a.id_actividad
                    WHERE a.id_actividad = ?;`
        const values = [id]
        const [rows, fields] = await connection.execute(sql,values);
        console.log(rows);
        res.json(rows); //Respuesta (Devuelve un arreglo de objetos)  
    } catch (error) {
        res.send('Error al realizar la consulta: ', error);
    } finally {
        connection.release();
    }
})


module.exports = routerCursos;
