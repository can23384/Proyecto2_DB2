const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const normalizeRecommendedGame = (item) => {
  const game = item.videojuego;

  return {
    ...game,

    gameId: game.gameId ?? game.neo4jId,
    titulo: game.titulo ?? "Sin título",
    descripcion: game.descripcion ?? "Sin descripción disponible.",
    fechaLanzamiento: game.fechaLanzamiento ?? "No disponible",
    precio: Number(game.precio ?? 0),
    idiomas: Array.isArray(game.idiomas) ? game.idiomas : [],
    requisitos: Array.isArray(game.requisitos) ? game.requisitos : [],

    genero: game.genero ?? "Recomendado",
    plataforma: game.plataforma ?? "Disponible",
    desarrollador: game.desarrollador ?? "No disponible",
    estado: "Recomendado",
    horasJugadas: 0,
    rating: "N/A",

    scores: item.scores ?? {
      colaborativo: 0,
      contenido: 0,
      total: 0,
    },

    razones: item.razones ?? {
      usuariosSimilares: 0,
      usuariosEjemplo: [],
      generosCoincidentes: 0,
      desarrolladoresCoincidentes: 0,
      plataformasCoincidentes: 0,
    },
  };
};

export const getUserRecommendations = async ({ usuarioId, limit = 10 }) => {
  const response = await fetch(
    `${API_URL}/api/usuarios/${encodeURIComponent(
      usuarioId
    )}/recomendaciones?limit=${limit}`
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudieron obtener recomendaciones");
  }

  return data.recomendaciones.map(normalizeRecommendedGame);
};