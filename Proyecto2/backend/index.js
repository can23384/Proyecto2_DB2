import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import neo4j from "neo4j-driver";
import { getSession, closeDriver } from "./neo4j.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const serializeNeo4jValue = (value) => {
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map(serializeNeo4jValue);
  }

  if (value && typeof value === "object") {
    if (
      value.year !== undefined &&
      value.month !== undefined &&
      value.day !== undefined &&
      typeof value.toString === "function"
    ) {
      return value.toString();
    }

    const serializedObject = {};

    for (const key in value) {
      serializedObject[key] = serializeNeo4jValue(value[key]);
    }

    return serializedObject;
  }

  return value;
};


//LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({
      ok: false,
      message: "Email y contraseña son obligatorios"
    });
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:Usuario)
      WHERE u.email = $email
        AND u.contrasena = $contrasena
        AND u.activo = true
      RETURN elementId(u) AS neo4jId, properties(u) AS usuario
      LIMIT 1
      `,
      {
        email,
        contrasena
      }
    );

    if (result.records.length === 0) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales incorrectas o usuario inactivo"
      });
    }

    const record = result.records[0];

    const neo4jId = record.get("neo4jId");
    const usuario = serializeNeo4jValue(record.get("usuario"));

    return res.status(200).json({
      ok: true,
      message: "Inicio de sesión exitoso",
      usuario: {
        neo4jId,
        ...usuario
      }
    });

  } catch (error) {
    console.error("Error en login:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});

//Juegos de usuarios
app.get("/api/usuarios/:username/videojuegos", async (req, res) => {
  const { username } = req.params;

  const session = getSession();

  try {
    const userResult = await session.run(
      `
      MATCH (u:Usuario {username: $username})
      RETURN elementId(u) AS neo4jId, properties(u) AS usuario
      LIMIT 1
      `,
      { username }
    );

    if (userResult.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    const usuarioRecord = userResult.records[0];

    const usuario = {
      neo4jId: usuarioRecord.get("neo4jId"),
      ...serializeNeo4jValue(usuarioRecord.get("usuario"))
    };

    const result = await session.run(
      `
      MATCH (u:Usuario {username: $username})-[relUsuario:JUEGO|CALIFICO|FAVORITO|COMPRO]->(v:Videojuego)

      WITH u, v, collect({
        tipo: type(relUsuario),
        direccion: "Usuario -> Videojuego",
        propiedades: properties(relUsuario)
      }) AS relacionesConUsuario

      ORDER BY v.titulo

      OPTIONAL MATCH (v)-[relVideojuego]-(n)
      WHERE n:Genero OR n:Plataforma OR n:Desarrollador

      WITH v, relacionesConUsuario, collect(
        CASE
          WHEN relVideojuego IS NULL THEN null
          ELSE {
            tipo: type(relVideojuego),
            direccion: CASE
              WHEN startNode(relVideojuego) = v THEN "Videojuego -> NodoRelacionado"
              ELSE "NodoRelacionado -> Videojuego"
            END,
            propiedades: properties(relVideojuego),
            nodoRelacionado: {
              neo4jId: elementId(n),
              etiquetas: labels(n),
              propiedades: properties(n)
            }
          }
        END
      ) AS relacionesDelVideojuego

      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego,
        relacionesConUsuario,
        [rel IN relacionesDelVideojuego WHERE rel IS NOT NULL] AS relacionesDelVideojuego
      `,
      { username }
    );

    const videojuegos = result.records.map((record) => ({
      neo4jId: record.get("neo4jId"),
      ...serializeNeo4jValue(record.get("videojuego")),
      relacionesConUsuario: serializeNeo4jValue(record.get("relacionesConUsuario")),
      relacionesDelVideojuego: serializeNeo4jValue(record.get("relacionesDelVideojuego"))
    }));

    return res.status(200).json({
      ok: true,
      usuario,
      total: videojuegos.length,
      videojuegos
    });

  } catch (error) {
    console.error("Error obteniendo videojuegos del usuario:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//calificaciones de juegos
app.get("/api/videojuegos/:neo4jId/calificaciones", async (req, res) => {
  const { neo4jId } = req.params;

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      WHERE elementId(v) = $neo4jId

      OPTIONAL MATCH (u:Usuario)-[r:CALIFICO]->(v)

      RETURN
        elementId(v) AS videojuegoId,
        properties(v) AS videojuego,
        collect(
          CASE
            WHEN r IS NULL THEN null
            ELSE {
              relacionId: elementId(r),
              tipo: type(r),
              direccion: "Usuario -> Videojuego",
              propiedades: properties(r),
              usuario: {
                neo4jId: elementId(u),
                propiedades: properties(u)
              }
            }
          END
        ) AS calificaciones
      `,
      { neo4jId }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Videojuego no encontrado"
      });
    }

    const record = result.records[0];

    const calificaciones = serializeNeo4jValue(
      record.get("calificaciones")
    ).filter((calificacion) => calificacion !== null);

    return res.status(200).json({
      ok: true,
      videojuego: {
        neo4jId: record.get("videojuegoId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      },
      total: calificaciones.length,
      calificaciones
    });

  } catch (error) {
    console.error("Error obteniendo calificaciones del videojuego:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//post resena
app.post("/api/usuarios/:usuarioId/videojuegos/:videojuegoId/calificar", async (req, res) => {
  const { usuarioId, videojuegoId } = req.params;
  const { puntuacion, fecha, comentario } = req.body;

  if (puntuacion === undefined || !fecha || !comentario) {
    return res.status(400).json({
      ok: false,
      message: "puntuacion, fecha y comentario son obligatorios"
    });
  }

  const puntuacionNumerica = Number(puntuacion);

  if (Number.isNaN(puntuacionNumerica) || puntuacionNumerica < 0 || puntuacionNumerica > 10) {
    return res.status(400).json({
      ok: false,
      message: "La puntuacion debe ser un número entre 0 y 10"
    });
  }

  const session = getSession();

  try {
    const nodesResult = await session.run(
      `
      MATCH (u:Usuario), (v:Videojuego)
      WHERE elementId(u) = $usuarioId
        AND elementId(v) = $videojuegoId
      RETURN u, v
      LIMIT 1
      `,
      {
        usuarioId,
        videojuegoId
      }
    );

    if (nodesResult.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Usuario o videojuego no encontrado"
      });
    }

    const existingResult = await session.run(
      `
      MATCH (u:Usuario)-[r:CALIFICO]->(v:Videojuego)
      WHERE elementId(u) = $usuarioId
        AND elementId(v) = $videojuegoId
      RETURN r
      LIMIT 1
      `,
      {
        usuarioId,
        videojuegoId
      }
    );

    if (existingResult.records.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Este usuario ya calificó este videojuego"
      });
    }

    const result = await session.run(
      `
      MATCH (u:Usuario), (v:Videojuego)
      WHERE elementId(u) = $usuarioId
        AND elementId(v) = $videojuegoId

      CREATE (u)-[r:CALIFICO {
        puntuacion: toFloat($puntuacion),
        fecha: date($fecha),
        comentario: $comentario
      }]->(v)

      RETURN
        elementId(r) AS relacionId,
        type(r) AS tipo,
        properties(r) AS relacion,
        elementId(u) AS usuarioId,
        properties(u) AS usuario,
        elementId(v) AS videojuegoId,
        properties(v) AS videojuego
      `,
      {
        usuarioId,
        videojuegoId,
        puntuacion: puntuacionNumerica,
        fecha,
        comentario
      }
    );

    const record = result.records[0];

    return res.status(201).json({
      ok: true,
      message: "Calificación creada correctamente",
      calificacion: {
        relacionId: record.get("relacionId"),
        tipo: record.get("tipo"),
        direccion: "Usuario -> Videojuego",
        propiedades: serializeNeo4jValue(record.get("relacion")),
        usuario: {
          neo4jId: record.get("usuarioId"),
          ...serializeNeo4jValue(record.get("usuario"))
        },
        videojuego: {
          neo4jId: record.get("videojuegoId"),
          ...serializeNeo4jValue(record.get("videojuego"))
        }
      }
    });

  } catch (error) {
    console.error("Error creando calificación:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//obtener juegos mayor a 2020
app.get("/api/videojuegos/mayores-a-2020", async (req, res) => {
  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      WHERE v.fechaLanzamiento > date("2020-12-31")
      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego
      ORDER BY v.fechaLanzamiento ASC
      `
    );

    const videojuegos = result.records.map((record) => ({
      neo4jId: record.get("neo4jId"),
      ...serializeNeo4jValue(record.get("videojuego"))
    }));

    return res.status(200).json({
      ok: true,
      total: videojuegos.length,
      videojuegos
    });

  } catch (error) {
    console.error("Error obteniendo videojuegos mayores a 2020:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//juego por titulo
app.get("/api/videojuegos/titulo/:titulo", async (req, res) => {
  const { titulo } = req.params;

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego {titulo: $titulo})
      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego
      LIMIT 1
      `,
      { titulo }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Videojuego no encontrado"
      });
    }

    const record = result.records[0];

    return res.status(200).json({
      ok: true,
      videojuego: {
        neo4jId: record.get("neo4jId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      }
    });

  } catch (error) {
    console.error("Error buscando videojuego por título:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});

//crear relacion comprar
app.post("/api/usuarios/:usuarioId/videojuegos/:videojuegoId/comprar", async (req, res) => {
  const { usuarioId, videojuegoId } = req.params;
  const { fechaCompra, precioPagado, metodoPago } = req.body;

  if (!fechaCompra || precioPagado === undefined || !metodoPago) {
    return res.status(400).json({
      ok: false,
      message: "fechaCompra, precioPagado y metodoPago son obligatorios"
    });
  }

  const precioNumerico = Number(precioPagado);

  if (Number.isNaN(precioNumerico) || precioNumerico < 0) {
    return res.status(400).json({
      ok: false,
      message: "precioPagado debe ser un número mayor o igual a 0"
    });
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:Usuario), (v:Videojuego)
      WHERE elementId(u) = $usuarioId
        AND elementId(v) = $videojuegoId

      OPTIONAL MATCH (u)-[compraExistente:COMPRO]->(v)

      WITH u, v, compraExistente
      WHERE compraExistente IS NULL

      CREATE (u)-[r:COMPRO {
        fechaCompra: date($fechaCompra),
        precioPagado: toFloat($precioPagado),
        metodoPago: $metodoPago
      }]->(v)

      RETURN
        elementId(r) AS relacionId,
        type(r) AS tipo,
        properties(r) AS relacion,
        elementId(u) AS usuarioId,
        properties(u) AS usuario,
        elementId(v) AS videojuegoId,
        properties(v) AS videojuego
      `,
      {
        usuarioId,
        videojuegoId,
        fechaCompra,
        precioPagado: precioNumerico,
        metodoPago
      }
    );

    if (result.records.length === 0) {
      const existsResult = await session.run(
        `
        MATCH (u:Usuario), (v:Videojuego)
        WHERE elementId(u) = $usuarioId
          AND elementId(v) = $videojuegoId
        OPTIONAL MATCH (u)-[r:COMPRO]->(v)
        RETURN u, v, r
        LIMIT 1
        `,
        { usuarioId, videojuegoId }
      );

      if (existsResult.records.length === 0) {
        return res.status(404).json({
          ok: false,
          message: "Usuario o videojuego no encontrado"
        });
      }

      return res.status(409).json({
        ok: false,
        message: "Este usuario ya compró este videojuego"
      });
    }

    const record = result.records[0];

    return res.status(201).json({
      ok: true,
      message: "Compra creada correctamente",
      compra: {
        relacionId: record.get("relacionId"),
        tipo: record.get("tipo"),
        direccion: "Usuario -> Videojuego",
        propiedades: serializeNeo4jValue(record.get("relacion")),
        usuario: {
          neo4jId: record.get("usuarioId"),
          ...serializeNeo4jValue(record.get("usuario"))
        },
        videojuego: {
          neo4jId: record.get("videojuegoId"),
          ...serializeNeo4jValue(record.get("videojuego"))
        }
      }
    });

  } catch (error) {
    console.error("Error creando compra:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});

//borrar relacion calificacion
app.delete("/api/usuarios/:usuarioId/videojuegos/:videojuegoId/calificacion", async (req, res) => {
  const { usuarioId, videojuegoId } = req.params;

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:Usuario), (v:Videojuego)
      WHERE elementId(u) = $usuarioId
        AND elementId(v) = $videojuegoId

      OPTIONAL MATCH (u)-[r:CALIFICO]->(v)

      WITH u, v, collect(r) AS rels

      WITH
        u,
        v,
        [rel IN rels WHERE rel IS NOT NULL | {
          relacionId: elementId(rel),
          tipo: type(rel),
          direccion: "Usuario -> Videojuego",
          propiedades: properties(rel)
        }] AS relacionesEliminadas,
        [rel IN rels WHERE rel IS NOT NULL] AS relacionesParaEliminar

      FOREACH (rel IN relacionesParaEliminar | DELETE rel)

      RETURN
        elementId(u) AS usuarioId,
        properties(u) AS usuario,
        elementId(v) AS videojuegoId,
        properties(v) AS videojuego,
        relacionesEliminadas
      `,
      {
        usuarioId,
        videojuegoId
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Usuario o videojuego no encontrado"
      });
    }

    const record = result.records[0];

    const relacionesEliminadas = serializeNeo4jValue(
      record.get("relacionesEliminadas")
    );

    if (relacionesEliminadas.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No existe una relación CALIFICO entre este usuario y este videojuego"
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Relación CALIFICO eliminada correctamente",
      usuario: {
        neo4jId: record.get("usuarioId"),
        ...serializeNeo4jValue(record.get("usuario"))
      },
      videojuego: {
        neo4jId: record.get("videojuegoId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      },
      totalEliminadas: relacionesEliminadas.length,
      relacionesEliminadas
    });

  } catch (error) {
    console.error("Error eliminando calificación:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//borrar relaciones entre usuarios y videojuego
app.delete("/api/usuarios/:usuarioId/videojuegos/:videojuegoId/relaciones", async (req, res) => {
  const { usuarioId, videojuegoId } = req.params;

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:Usuario), (v:Videojuego)
      WHERE elementId(u) = $usuarioId
        AND elementId(v) = $videojuegoId

      OPTIONAL MATCH (u)-[r]-(v)

      WITH u, v, collect(r) AS rels

      WITH
        u,
        v,
        [rel IN rels WHERE rel IS NOT NULL | {
          relacionId: elementId(rel),
          tipo: type(rel),
          direccion: CASE
            WHEN startNode(rel) = u THEN "Usuario -> Videojuego"
            ELSE "Videojuego -> Usuario"
          END,
          propiedades: properties(rel)
        }] AS relacionesEliminadas,
        [rel IN rels WHERE rel IS NOT NULL] AS relacionesParaEliminar

      FOREACH (rel IN relacionesParaEliminar | DELETE rel)

      RETURN
        elementId(u) AS usuarioId,
        properties(u) AS usuario,
        elementId(v) AS videojuegoId,
        properties(v) AS videojuego,
        relacionesEliminadas
      `,
      {
        usuarioId,
        videojuegoId
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Usuario o videojuego no encontrado"
      });
    }

    const record = result.records[0];

    const relacionesEliminadas = serializeNeo4jValue(
      record.get("relacionesEliminadas")
    );

    return res.status(200).json({
      ok: true,
      message:
        relacionesEliminadas.length > 0
          ? "Relaciones eliminadas correctamente"
          : "No había relaciones entre este usuario y este videojuego",
      usuario: {
        neo4jId: record.get("usuarioId"),
        ...serializeNeo4jValue(record.get("usuario"))
      },
      videojuego: {
        neo4jId: record.get("videojuegoId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      },
      totalEliminadas: relacionesEliminadas.length,
      relacionesEliminadas
    });

  } catch (error) {
    console.error("Error eliminando relaciones:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});

//cambiar propiedad de relacion juego
app.patch("/api/usuarios/:usuarioId/videojuegos/:videojuegoId/juego/completado", async (req, res) => {
  const { usuarioId, videojuegoId } = req.params;
  const { completado } = req.body;

  if (typeof completado !== "boolean") {
    return res.status(400).json({
      ok: false,
      message: "La propiedad completado es obligatoria y debe ser true o false"
    });
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:Usuario)-[r:JUEGO]->(v:Videojuego)
      WHERE elementId(u) = $usuarioId
        AND elementId(v) = $videojuegoId

      SET r.completado = $completado

      RETURN
        elementId(r) AS relacionId,
        type(r) AS tipo,
        properties(r) AS relacion,
        elementId(u) AS usuarioId,
        properties(u) AS usuario,
        elementId(v) AS videojuegoId,
        properties(v) AS videojuego
      `,
      {
        usuarioId,
        videojuegoId,
        completado
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No existe una relación JUEGO entre este usuario y este videojuego"
      });
    }

    const record = result.records[0];

    return res.status(200).json({
      ok: true,
      message: "Propiedad completado actualizada correctamente",
      juego: {
        relacionId: record.get("relacionId"),
        tipo: record.get("tipo"),
        direccion: "Usuario -> Videojuego",
        propiedades: serializeNeo4jValue(record.get("relacion")),
        usuario: {
          neo4jId: record.get("usuarioId"),
          ...serializeNeo4jValue(record.get("usuario"))
        },
        videojuego: {
          neo4jId: record.get("videojuegoId"),
          ...serializeNeo4jValue(record.get("videojuego"))
        }
      }
    });

  } catch (error) {
    console.error("Error actualizando completado:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//obtener todos los nodos juegos
app.get("/api/videojuegos", async (req, res) => {
  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego
      ORDER BY v.titulo
      `
    );

    const videojuegos = result.records.map((record) => ({
      neo4jId: record.get("neo4jId"),
      ...serializeNeo4jValue(record.get("videojuego"))
    }));

    return res.status(200).json({
      ok: true,
      total: videojuegos.length,
      videojuegos
    });

  } catch (error) {
    console.error("Error obteniendo videojuegos:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//cambiar o añadir propiedad de juego
app.patch("/api/videojuegos/:videojuegoId/propiedad", async (req, res) => {
  const { videojuegoId } = req.params;
  const { propiedad, valor } = req.body;

  if (!propiedad || valor === undefined) {
    return res.status(400).json({
      ok: false,
      message: "La propiedad y el valor son obligatorios"
    });
  }

  // Evita inyección en Cypher permitiendo solo nombres válidos de propiedades
  const propiedadValida = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(propiedad);

  if (!propiedadValida) {
    return res.status(400).json({
      ok: false,
      message: "Nombre de propiedad inválido"
    });
  }

  let valorFinal = valor;
  let cypherSet = `SET v.${propiedad} = $valor`;

  // Conversión especial para propiedades conocidas
  if (propiedad === "precio") {
    valorFinal = Number(valor);

    if (Number.isNaN(valorFinal) || valorFinal < 0) {
      return res.status(400).json({
        ok: false,
        message: "El precio debe ser un número mayor o igual a 0"
      });
    }

    cypherSet = `SET v.${propiedad} = toFloat($valor)`;
  }

  if (propiedad === "fechaLanzamiento") {
    if (typeof valor !== "string") {
      return res.status(400).json({
        ok: false,
        message: "La fechaLanzamiento debe enviarse como string en formato YYYY-MM-DD"
      });
    }

    cypherSet = `SET v.${propiedad} = date($valor)`;
  }

  if (propiedad === "idiomas" || propiedad === "requisitos") {
    if (!Array.isArray(valor)) {
      return res.status(400).json({
        ok: false,
        message: `La propiedad ${propiedad} debe ser una lista`
      });
    }
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      WHERE elementId(v) = $videojuegoId

      ${cypherSet}

      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego
      `,
      {
        videojuegoId,
        valor: valorFinal
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Videojuego no encontrado"
      });
    }

    const record = result.records[0];

    return res.status(200).json({
      ok: true,
      message: "Propiedad actualizada correctamente",
      videojuego: {
        neo4jId: record.get("neo4jId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      }
    });

  } catch (error) {
    console.error("Error actualizando propiedad del videojuego:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//eliminar propiedad de juego
app.delete("/api/videojuegos/:videojuegoId/propiedad", async (req, res) => {
  const { videojuegoId } = req.params;
  const { propiedad } = req.body;

  if (!propiedad) {
    return res.status(400).json({
      ok: false,
      message: "La propiedad es obligatoria"
    });
  }

  // Evita inyección en Cypher, porque el nombre de la propiedad no se puede parametrizar directamente
  const propiedadValida = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(propiedad);

  if (!propiedadValida) {
    return res.status(400).json({
      ok: false,
      message: "Nombre de propiedad inválido"
    });
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      WHERE elementId(v) = $videojuegoId

      WITH 
        v,
        $propiedad IN keys(v) AS propiedadExistia,
        properties(v)[$propiedad] AS valorAnterior

      REMOVE v.${propiedad}

      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego,
        propiedadExistia,
        valorAnterior
      `,
      {
        videojuegoId,
        propiedad
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Videojuego no encontrado"
      });
    }

    const record = result.records[0];
    const propiedadExistia = record.get("propiedadExistia");

    return res.status(200).json({
      ok: true,
      message: propiedadExistia
        ? "Propiedad eliminada correctamente"
        : "La propiedad no existía en el videojuego",
      propiedadEliminada: propiedad,
      valorAnterior: serializeNeo4jValue(record.get("valorAnterior")),
      videojuego: {
        neo4jId: record.get("neo4jId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      }
    });

  } catch (error) {
    console.error("Error eliminando propiedad del videojuego:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});

//eliminar nodo juego
app.delete("/api/videojuegos/:videojuegoId", async (req, res) => {
  const { videojuegoId } = req.params;

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      WHERE elementId(v) = $videojuegoId

      OPTIONAL MATCH (v)-[r]-(n)

      WITH
        v,
        elementId(v) AS neo4jId,
        properties(v) AS videojuego,
        collect(
          CASE
            WHEN r IS NULL THEN null
            ELSE {
              relacionId: elementId(r),
              tipo: type(r),
              direccion: CASE
                WHEN startNode(r) = v THEN "Videojuego -> NodoRelacionado"
                ELSE "NodoRelacionado -> Videojuego"
              END,
              propiedades: properties(r),
              nodoRelacionado: {
                neo4jId: elementId(n),
                etiquetas: labels(n),
                propiedades: properties(n)
              }
            }
          END
        ) AS relaciones

      WITH
        v,
        neo4jId,
        videojuego,
        [rel IN relaciones WHERE rel IS NOT NULL] AS relacionesEliminadas

      DETACH DELETE v

      RETURN
        neo4jId,
        videojuego,
        relacionesEliminadas
      `,
      { videojuegoId }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Videojuego no encontrado"
      });
    }

    const record = result.records[0];

    const relacionesEliminadas = serializeNeo4jValue(
      record.get("relacionesEliminadas")
    );

    return res.status(200).json({
      ok: true,
      message: "Videojuego eliminado correctamente",
      videojuegoEliminado: {
        neo4jId: record.get("neo4jId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      },
      totalRelacionesEliminadas: relacionesEliminadas.length,
      relacionesEliminadas
    });

  } catch (error) {
    console.error("Error eliminando videojuego:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//agreagar nodo juego
app.post("/api/videojuegos", async (req, res) => {
  const {
    titulo,
    fechaLanzamiento,
    precio,
    descripcion,
    idiomas,
    requisitos
  } = req.body;

  if (!titulo || !fechaLanzamiento || precio === undefined || !descripcion) {
    return res.status(400).json({
      ok: false,
      message: "titulo, fechaLanzamiento, precio y descripcion son obligatorios"
    });
  }

  if (!Array.isArray(idiomas) || !Array.isArray(requisitos)) {
    return res.status(400).json({
      ok: false,
      message: "idiomas y requisitos deben ser listas"
    });
  }

  const precioNumerico = Number(precio);

  if (Number.isNaN(precioNumerico) || precioNumerico < 0) {
    return res.status(400).json({
      ok: false,
      message: "precio debe ser un número mayor o igual a 0"
    });
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      CREATE (v:Videojuego {
        titulo: $titulo,
        fechaLanzamiento: date($fechaLanzamiento),
        precio: toFloat($precio),
        descripcion: $descripcion,
        idiomas: $idiomas,
        requisitos: $requisitos
      })

      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego
      `,
      {
        titulo,
        fechaLanzamiento,
        precio: precioNumerico,
        descripcion,
        idiomas,
        requisitos
      }
    );

    const record = result.records[0];

    return res.status(201).json({
      ok: true,
      message: "Videojuego creado correctamente",
      videojuego: {
        neo4jId: record.get("neo4jId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      }
    });

  } catch (error) {
    console.error("Error creando videojuego:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//añadir o modificar propiedad multiple
app.patch("/api/videojuegos/propiedades/multiple", async (req, res) => {
  const { videojuegoIds, propiedad, valor } = req.body;

  if (!Array.isArray(videojuegoIds) || videojuegoIds.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "videojuegoIds debe ser una lista con al menos un ID"
    });
  }

  if (!propiedad || valor === undefined) {
    return res.status(400).json({
      ok: false,
      message: "propiedad y valor son obligatorios"
    });
  }

  // Evita inyección en Cypher porque el nombre de la propiedad se inserta dinámicamente
  const propiedadValida = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(propiedad);

  if (!propiedadValida) {
    return res.status(400).json({
      ok: false,
      message: "Nombre de propiedad inválido"
    });
  }

  let valorFinal = valor;
  let cypherSet = `SET v.${propiedad} = $valor`;

  // Conversiones especiales para propiedades conocidas del nodo Videojuego
  if (propiedad === "precio") {
    valorFinal = Number(valor);

    if (Number.isNaN(valorFinal) || valorFinal < 0) {
      return res.status(400).json({
        ok: false,
        message: "El precio debe ser un número mayor o igual a 0"
      });
    }

    cypherSet = `SET v.${propiedad} = toFloat($valor)`;
  }

  if (propiedad === "fechaLanzamiento") {
    if (typeof valor !== "string") {
      return res.status(400).json({
        ok: false,
        message: "fechaLanzamiento debe enviarse como string en formato YYYY-MM-DD"
      });
    }

    cypherSet = `SET v.${propiedad} = date($valor)`;
  }

  if (propiedad === "idiomas" || propiedad === "requisitos") {
    if (!Array.isArray(valor)) {
      return res.status(400).json({
        ok: false,
        message: `La propiedad ${propiedad} debe ser una lista`
      });
    }
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      WHERE elementId(v) IN $videojuegoIds

      ${cypherSet}

      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego
      ORDER BY v.titulo
      `,
      {
        videojuegoIds,
        valor: valorFinal
      }
    );

    const videojuegos = result.records.map((record) => ({
      neo4jId: record.get("neo4jId"),
      ...serializeNeo4jValue(record.get("videojuego"))
    }));

    const idsEncontrados = videojuegos.map((v) => v.neo4jId);
    const idsNoEncontrados = videojuegoIds.filter(
      (id) => !idsEncontrados.includes(id)
    );

    return res.status(200).json({
      ok: true,
      message: "Propiedad actualizada en múltiples videojuegos",
      propiedadActualizada: propiedad,
      valorAsignado: valorFinal,
      totalActualizados: videojuegos.length,
      totalNoEncontrados: idsNoEncontrados.length,
      idsNoEncontrados,
      videojuegos
    });

  } catch (error) {
    console.error("Error actualizando múltiples videojuegos:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//eliminar propiedad multiple
app.delete("/api/videojuegos/propiedades/multiple", async (req, res) => {
  const { videojuegoIds, propiedad } = req.body;

  if (!Array.isArray(videojuegoIds) || videojuegoIds.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "videojuegoIds debe ser una lista con al menos un ID"
    });
  }

  if (!propiedad) {
    return res.status(400).json({
      ok: false,
      message: "La propiedad es obligatoria"
    });
  }

  // Evita inyección Cypher, porque el nombre de la propiedad se inserta dinámicamente
  const propiedadValida = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(propiedad);

  if (!propiedadValida) {
    return res.status(400).json({
      ok: false,
      message: "Nombre de propiedad inválido"
    });
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      WHERE elementId(v) IN $videojuegoIds

      WITH 
        v,
        $propiedad IN keys(v) AS propiedadExistia,
        properties(v)[$propiedad] AS valorAnterior

      REMOVE v.${propiedad}

      RETURN
        elementId(v) AS neo4jId,
        properties(v) AS videojuego,
        propiedadExistia,
        valorAnterior
      ORDER BY v.titulo
      `,
      {
        videojuegoIds,
        propiedad
      }
    );

    const videojuegos = result.records.map((record) => ({
      neo4jId: record.get("neo4jId"),
      propiedadExistia: record.get("propiedadExistia"),
      valorAnterior: serializeNeo4jValue(record.get("valorAnterior")),
      videojuego: serializeNeo4jValue(record.get("videojuego"))
    }));

    const idsEncontrados = videojuegos.map((v) => v.neo4jId);

    const idsNoEncontrados = videojuegoIds.filter(
      (id) => !idsEncontrados.includes(id)
    );

    const totalConPropiedad = videojuegos.filter(
      (v) => v.propiedadExistia === true
    ).length;

    const totalSinPropiedad = videojuegos.filter(
      (v) => v.propiedadExistia === false
    ).length;

    return res.status(200).json({
      ok: true,
      message: "Proceso de eliminación de propiedad completado",
      propiedadEliminada: propiedad,
      totalEncontrados: videojuegos.length,
      totalConPropiedadEliminada: totalConPropiedad,
      totalSinPropiedad: totalSinPropiedad,
      totalNoEncontrados: idsNoEncontrados.length,
      idsNoEncontrados,
      videojuegos
    });

  } catch (error) {
    console.error("Error eliminando propiedad en múltiples videojuegos:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//eliminar varios nodos juegos
app.delete("/api/videojuegos/eliminar/multiple", async (req, res) => {
  const { videojuegoIds } = req.body;

  if (!Array.isArray(videojuegoIds) || videojuegoIds.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "videojuegoIds debe ser una lista con al menos un ID"
    });
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (v:Videojuego)
      WHERE elementId(v) IN $videojuegoIds

      OPTIONAL MATCH (v)-[r]-(n)

      WITH
        v,
        elementId(v) AS neo4jId,
        properties(v) AS videojuego,
        collect(
          CASE
            WHEN r IS NULL THEN null
            ELSE {
              relacionId: elementId(r),
              tipo: type(r),
              direccion: CASE
                WHEN startNode(r) = v THEN "Videojuego -> NodoRelacionado"
                ELSE "NodoRelacionado -> Videojuego"
              END,
              propiedades: properties(r),
              nodoRelacionado: {
                neo4jId: elementId(n),
                etiquetas: labels(n),
                propiedades: properties(n)
              }
            }
          END
        ) AS relaciones

      WITH
        collect({
          neo4jId: neo4jId,
          propiedades: videojuego,
          relacionesEliminadas: [rel IN relaciones WHERE rel IS NOT NULL]
        }) AS videojuegosEliminados,
        collect(v) AS videojuegosParaEliminar

      FOREACH (videojuego IN videojuegosParaEliminar | DETACH DELETE videojuego)

      RETURN videojuegosEliminados
      `,
      { videojuegoIds }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No se encontró ningún videojuego"
      });
    }

    const videojuegosEliminados = serializeNeo4jValue(
      result.records[0].get("videojuegosEliminados")
    );

    const idsEliminados = videojuegosEliminados.map((v) => v.neo4jId);

    const idsNoEncontrados = videojuegoIds.filter(
      (id) => !idsEliminados.includes(id)
    );

    return res.status(200).json({
      ok: true,
      message: "Videojuegos eliminados correctamente",
      totalEliminados: videojuegosEliminados.length,
      totalNoEncontrados: idsNoEncontrados.length,
      idsNoEncontrados,
      videojuegosEliminados
    });

  } catch (error) {
    console.error("Error eliminando múltiples videojuegos:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});


//SISTEMA DE RECOMENDACION
app.get("/api/usuarios/:usuarioId/recomendaciones", async (req, res) => {
  const { usuarioId } = req.params;

  const limit = Number(req.query.limit || 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({
      ok: false,
      message: "El limit debe ser un número entero entre 1 y 50"
    });
  }

  const session = getSession();

  try {
    const userResult = await session.run(
      `
      MATCH (u:Usuario)
      WHERE elementId(u) = $usuarioId
      RETURN elementId(u) AS neo4jId, properties(u) AS usuario
      LIMIT 1
      `,
      { usuarioId }
    );

    if (userResult.records.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    const usuarioRecord = userResult.records[0];

    const usuario = {
      neo4jId: usuarioRecord.get("neo4jId"),
      ...serializeNeo4jValue(usuarioRecord.get("usuario"))
    };

    const result = await session.run(
      `
      MATCH (u:Usuario)
      WHERE elementId(u) = $usuarioId

      // ============================
      // A. FILTRADO COLABORATIVO
      // ============================
      CALL {
        WITH u

        MATCH (u)-[:JUEGO|COMPRO|CALIFICO|FAVORITO]->(base:Videojuego)
              <-[:JUEGO|COMPRO|CALIFICO|FAVORITO]-(otro:Usuario)
        WHERE otro <> u

        WITH u, otro, count(DISTINCT base) AS coincidencias

        MATCH (otro)-[relRec:JUEGO|COMPRO|CALIFICO|FAVORITO]->(rec:Videojuego)
        WHERE NOT (u)-[:JUEGO|COMPRO|CALIFICO|FAVORITO]->(rec)

        WITH
          rec,
          sum(
            coincidencias *
            CASE type(relRec)
              WHEN "COMPRO" THEN 4.0
              WHEN "FAVORITO" THEN 3.0
              WHEN "CALIFICO" THEN coalesce(relRec.puntuacion, 5.0) / 2.0
              WHEN "JUEGO" THEN 1.0
              ELSE 1.0
            END
          ) AS scoreColaborativo,
          count(DISTINCT otro) AS usuariosSimilares,
          collect(DISTINCT otro.username)[0..5] AS usuariosEjemplo

        RETURN collect({
          rec: rec,
          scoreColaborativo: scoreColaborativo,
          scoreContenido: 0.0,
          usuariosSimilares: usuariosSimilares,
          usuariosEjemplo: usuariosEjemplo,
          generosCoincidentes: 0,
          desarrolladoresCoincidentes: 0,
          plataformasCoincidentes: 0
        }) AS resultadosColaborativos
      }

        // ============================
        // B. FILTRADO POR CONTENIDO
        // ============================
        CALL {
        WITH u

        OPTIONAL MATCH (u)-[:PREFIERE]->(gp:Genero)
        WITH u, collect(DISTINCT gp) AS generosPreferidos

        OPTIONAL MATCH (u)-[:JUEGO|COMPRO|CALIFICO|FAVORITO]->(:Videojuego)-[:PERTENECE_A]->(g:Genero)
        WITH u, generosPreferidos, collect(DISTINCT g) AS generosPorJuegos
        WITH u, [x IN generosPreferidos + generosPorJuegos WHERE x IS NOT NULL] AS generosUsuario

        OPTIONAL MATCH (u)-[:JUEGO|COMPRO|CALIFICO|FAVORITO]->(:Videojuego)-[:DESARROLLADO_POR]->(d:Desarrollador)
        WITH u, generosUsuario, collect(DISTINCT d) AS desarrolladoresPorJuegos
        WITH u, generosUsuario, [x IN desarrolladoresPorJuegos WHERE x IS NOT NULL] AS desarrolladoresUsuario

        OPTIONAL MATCH (u)-[:USA]->(pu:Plataforma)
        WITH u, generosUsuario, desarrolladoresUsuario, collect(DISTINCT pu) AS plataformasDirectas

        OPTIONAL MATCH (u)-[:JUEGO|COMPRO|CALIFICO|FAVORITO]->(:Videojuego)-[:DISPONIBLE_EN]->(p:Plataforma)
        WITH
            u,
            generosUsuario,
            desarrolladoresUsuario,
            plataformasDirectas,
            collect(DISTINCT p) AS plataformasPorJuegos

        WITH
            u,
            generosUsuario,
            desarrolladoresUsuario,
            [x IN plataformasDirectas + plataformasPorJuegos WHERE x IS NOT NULL] AS plataformasUsuario

        MATCH (rec:Videojuego)
        WHERE NOT (u)-[:JUEGO|COMPRO|CALIFICO|FAVORITO]->(rec)

        OPTIONAL MATCH (rec)-[:PERTENECE_A]->(rg:Genero)
        WITH
            u,
            rec,
            generosUsuario,
            desarrolladoresUsuario,
            plataformasUsuario,
            collect(DISTINCT rg) AS generosRec

        WITH
            u,
            rec,
            generosUsuario,
            desarrolladoresUsuario,
            plataformasUsuario,
            [x IN generosRec WHERE x IS NOT NULL] AS generosRec

        OPTIONAL MATCH (rec)-[:DESARROLLADO_POR]->(rd:Desarrollador)
        WITH
            u,
            rec,
            generosUsuario,
            desarrolladoresUsuario,
            plataformasUsuario,
            generosRec,
            collect(DISTINCT rd) AS desarrolladoresRec

        WITH
            u,
            rec,
            generosUsuario,
            desarrolladoresUsuario,
            plataformasUsuario,
            generosRec,
            [x IN desarrolladoresRec WHERE x IS NOT NULL] AS desarrolladoresRec

        OPTIONAL MATCH (rec)-[:DISPONIBLE_EN]->(rp:Plataforma)
        WITH
            rec,
            generosUsuario,
            desarrolladoresUsuario,
            plataformasUsuario,
            generosRec,
            desarrolladoresRec,
            collect(DISTINCT rp) AS plataformasRec

        WITH
            rec,
            size([g IN generosRec WHERE g IN generosUsuario]) AS generosCoincidentes,
            size([d IN desarrolladoresRec WHERE d IN desarrolladoresUsuario]) AS desarrolladoresCoincidentes,
            size([p IN plataformasRec WHERE p IN plataformasUsuario]) AS plataformasCoincidentes

        WITH
            rec,
            generosCoincidentes,
            desarrolladoresCoincidentes,
            plataformasCoincidentes,
            (
            generosCoincidentes * 3.0 +
            desarrolladoresCoincidentes * 2.0 +
            plataformasCoincidentes * 1.0
            ) AS scoreContenido

        WHERE scoreContenido > 0

        RETURN collect({
            rec: rec,
            scoreColaborativo: 0.0,
            scoreContenido: scoreContenido,
            usuariosSimilares: 0,
            usuariosEjemplo: [],
            generosCoincidentes: generosCoincidentes,
            desarrolladoresCoincidentes: desarrolladoresCoincidentes,
            plataformasCoincidentes: plataformasCoincidentes
        }) AS resultadosContenido
        }

      // ============================
      // C. COMBINACIÓN HÍBRIDA
      // ============================
      WITH resultadosColaborativos + resultadosContenido AS resultados
      UNWIND resultados AS item

      WITH
        item.rec AS rec,
        sum(item.scoreColaborativo) AS scoreColaborativo,
        sum(item.scoreContenido) AS scoreContenido,
        max(item.usuariosSimilares) AS usuariosSimilares,
        reduce(lista = [], usuarios IN collect(item.usuariosEjemplo) | lista + usuarios) AS usuariosEjemplo,
        max(item.generosCoincidentes) AS generosCoincidentes,
        max(item.desarrolladoresCoincidentes) AS desarrolladoresCoincidentes,
        max(item.plataformasCoincidentes) AS plataformasCoincidentes

      WITH
        rec,
        scoreColaborativo,
        scoreContenido,
        scoreColaborativo + scoreContenido AS scoreTotal,
        usuariosSimilares,
        usuariosEjemplo[0..5] AS usuariosEjemplo,
        generosCoincidentes,
        desarrolladoresCoincidentes,
        plataformasCoincidentes

      ORDER BY scoreTotal DESC, rec.titulo ASC
      LIMIT $limit

      RETURN
        elementId(rec) AS neo4jId,
        properties(rec) AS videojuego,
        scoreColaborativo,
        scoreContenido,
        scoreTotal,
        usuariosSimilares,
        usuariosEjemplo,
        generosCoincidentes,
        desarrolladoresCoincidentes,
        plataformasCoincidentes
      `,
      {
        usuarioId,
        limit: neo4j.int(limit)
      }
    );

    const recomendaciones = result.records.map((record) => ({
      videojuego: {
        neo4jId: record.get("neo4jId"),
        ...serializeNeo4jValue(record.get("videojuego"))
      },
      scores: {
        colaborativo: serializeNeo4jValue(record.get("scoreColaborativo")),
        contenido: serializeNeo4jValue(record.get("scoreContenido")),
        total: serializeNeo4jValue(record.get("scoreTotal"))
      },
      razones: {
        usuariosSimilares: serializeNeo4jValue(record.get("usuariosSimilares")),
        usuariosEjemplo: serializeNeo4jValue(record.get("usuariosEjemplo")),
        generosCoincidentes: serializeNeo4jValue(record.get("generosCoincidentes")),
        desarrolladoresCoincidentes: serializeNeo4jValue(record.get("desarrolladoresCoincidentes")),
        plataformasCoincidentes: serializeNeo4jValue(record.get("plataformasCoincidentes"))
      }
    }));

    return res.status(200).json({
      ok: true,
      usuario,
      total: recomendaciones.length,
      recomendaciones
    });

  } catch (error) {
    console.error("Error generando recomendaciones:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});

//count de juegos
app.get("/api/videojuegos/count", async (req, res) => {
  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (n:Videojuego)
      RETURN count(n) AS total
      `
    );

    const total = serializeNeo4jValue(result.records[0].get("total"));

    return res.status(200).json({
      ok: true,
      total
    });

  } catch (error) {
    console.error("Error contando videojuegos:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor"
    });

  } finally {
    await session.close();
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await closeDriver();
  process.exit(0);
});