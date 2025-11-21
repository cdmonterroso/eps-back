use db_sidecc_ddo;

-- 1. Crear la base de datos
-- CREATE DATABASE IF NOT EXISTS db_unidades;

-- drop table subprogramas_cursos;
-- drop table subprogramas;
-- drop table unidades_ejecutoras;
-- DROP TABLE temporal;

/*
select * from unidades_ejecutoras;
select * from subprogramas;
select * from subprogramas_cursos;
select * from temporal;

SELECT 
				s.id_subprograma,
                s.partida, 
                s.nombre_subprograma, 
                s.codigo_unidad_fk,
                u.nombre_unidad 
             FROM subprogramas s
             JOIN unidades_ejecutoras u ON s.codigo_unidad_fk = u.codigo_unidad
             WHERE s.codigo_unidad_fk = 32;
             
select
		sc.id_subprograma_fk,
        s.partida,
        s.codigo_unidad_fk
        from subprogramas_cursos sc
        join subprogramas s on sc.id_subprograma_fk = s.id_subprograma
        where sc.id_curso = 'DDO07,64,105'  and s.partida = 105 and s.codigo_unidad_fk = 64;;
*/


/*
-- 2. Crear las tablas principales
CREATE TABLE unidades_ejecutoras (
    codigo_unidad INT NOT NULL,
    nombre_unidad VARCHAR(255) NOT NULL,
    PRIMARY KEY (codigo_unidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE subprogramas (
    id_subprograma INT NOT NULL AUTO_INCREMENT,
    codigo_unidad_fk INT NOT NULL,
    partida INT NOT NULL,
    nombre_subprograma VARCHAR(255) NOT NULL,
    PRIMARY KEY (id_subprograma),
    INDEX idx_partida (partida),
    CONSTRAINT fk_unidad_ejecutora
        FOREIGN KEY (codigo_unidad_fk)
        REFERENCES unidades_ejecutoras(codigo_unidad)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Almacena el ID del subprograma local y el ID del curso de la API externa.
CREATE TABLE subprogramas_cursos (
    id_subprograma_fk INT NOT NULL,
    -- Usamos VARCHAR para ser flexibles con el ID de la API (puede ser '123' o 'abc-123')
    id_curso VARCHAR(255) NOT NULL,
    
    -- Llave primaria compuesta para asegurar que un curso solo se vincule una vez por subprograma
    PRIMARY KEY (id_subprograma_fk, id_curso), 
    
    -- Mantenemos la relación con la tabla local 'subprogramas'
    CONSTRAINT fk_sc_subprograma
        FOREIGN KEY (id_subprograma_fk)
        REFERENCES subprogramas(id_subprograma)
        ON DELETE CASCADE ON UPDATE CASCADE
    -- No hay llave foránea para id_curso, ya que es un dato externo
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Crear la tabla temporal (Staging) para la carga masiva
CREATE TABLE temporal (
    codigo_unidad INT,
    nombre_unidad_ejecutora VARCHAR(255),
    partida INT,
    nombre_subprograma VARCHAR(255)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Cargar los datos del CSV a la tabla temporal
-- Esta ruta funciona porque el CSV estará en el mismo directorio de inicialización
-- LOAD DATA INFILE '/docker-entrypoint-initdb.d/UNIDADES_SUBPROGRAMA.csv'

SET GLOBAL local_infile = 1;
-- LOAD DATA LOCAL INFILE 'D:/Users/Daniel/Downloads/UNIDADES_SUBPROGRAMA.csv'
-- LOAD DATA LOCAL INFILE '/docker-entrypoint-initdb.d/unidades_subprogramas.csv'
INTO TABLE temporal
CHARACTER SET latin1
FIELDS TERMINATED BY ';'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS;

-- 5. Poblar la tabla 'unidades_ejecutoras' con datos únicos
INSERT INTO unidades_ejecutoras (codigo_unidad, nombre_unidad)
SELECT DISTINCT
    codigo_unidad,
    nombre_unidad_ejecutora
FROM temporal
WHERE codigo_unidad IS NOT NULL;

-- 6. Poblar la tabla 'subprogramas' con todos los registros
INSERT INTO subprogramas (codigo_unidad_fk, partida, nombre_subprograma)
SELECT
    codigo_unidad,
    partida,
    nombre_subprograma
FROM temporal
WHERE codigo_unidad IS NOT NULL AND partida IS NOT NULL;*/