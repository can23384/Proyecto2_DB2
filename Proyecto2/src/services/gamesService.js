const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const getRelacionUsuario = (relaciones, tipo) => {
  return relaciones?.find((relacion) => relacion.tipo === tipo);
};

const getNodosRelacionados = (relacionesDelVideojuego, etiqueta) => {
  return relacionesDelVideojuego
    ?.filter((relacion) =>
      relacion.nodoRelacionado?.etiquetas?.includes(etiqueta)
    )
    .map((relacion) => relacion.nodoRelacionado.propiedades)
    ?? [];
};

const getNombresRelacionados = (relacionesDelVideojuego, etiqueta) => {
  const nodos = getNodosRelacionados(relacionesDelVideojuego, etiqueta);

  if (nodos.length === 0) {
    return `Sin ${etiqueta.toLowerCase()}`;
  }

  return nodos.map((nodo) => nodo.nombre).join(", ");
};

const getEstadoCompletado = (relacionJuego) => {
  const completado = relacionJuego?.propiedades?.completado;

  if (completado === true) return "Completado";
  if (completado === false) return "No completado";

  return "Sin jugar";
};

const normalizeGame = (game) => {
  const relacionJuego = getRelacionUsuario(game.relacionesConUsuario, "JUEGO");
  const relacionCalifico = getRelacionUsuario(
    game.relacionesConUsuario,
    "CALIFICO"
  );

  return {
    ...game,

    gameId: game.gameId ?? game.neo4jId,
    titulo: game.titulo ?? "Sin título",
    fechaLanzamiento: game.fechaLanzamiento ?? "No disponible",
    precio: Number(game.precio ?? 0),
    descripcion: game.descripcion ?? "Sin descripción disponible.",
    idiomas: Array.isArray(game.idiomas) ? game.idiomas : [],
    requisitos: Array.isArray(game.requisitos) ? game.requisitos : [],

    genero: getNombresRelacionados(game.relacionesDelVideojuego, "Genero"),
    plataforma: getNombresRelacionados(
      game.relacionesDelVideojuego,
      "Plataforma"
    ),
    desarrollador: getNombresRelacionados(
      game.relacionesDelVideojuego,
      "Desarrollador"
    ),

    horasJugadas: relacionJuego?.propiedades?.horasJugadas ?? 0,
    ultimaSesion: relacionJuego?.propiedades?.ultimaSesion ?? "No disponible",
    completado: relacionJuego?.propiedades?.completado ?? null,

    rating: relacionCalifico?.propiedades?.puntuacion ?? "N/A",
    comentario: relacionCalifico?.propiedades?.comentario ?? "",

    estado: getEstadoCompletado(relacionJuego),
  };
};

export const getUserGames = async (username) => {
  const response = await fetch(
    `${API_URL}/api/usuarios/${encodeURIComponent(username)}/videojuegos`
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudieron obtener los videojuegos");
  }

  return data.videojuegos.map(normalizeGame);
};

export const getGamesCount = async () => {
  const response = await fetch(`${API_URL}/api/videojuegos/count`);

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo contar los videojuegos");
  }

  return data.total;
};