const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const normalizeStoreGame = (game) => {
  return {
    ...game,

    gameId: game.gameId ?? game.neo4jId,
    titulo: game.titulo ?? "Sin título",
    descripcion: game.descripcion ?? "Sin descripción disponible.",
    fechaLanzamiento: game.fechaLanzamiento ?? "No disponible",
    precio: Number(game.precio ?? 0),
    idiomas: Array.isArray(game.idiomas) ? game.idiomas : [],
    requisitos: Array.isArray(game.requisitos) ? game.requisitos : [],

    genero: game.genero ?? "Sin género",
    plataforma: game.plataforma ?? "Sin plataforma",
    desarrollador: game.desarrollador ?? "Sin desarrollador",
    estado: "Disponible",
    horasJugadas: 0,
    rating: "N/A",
  };
};

export const getStoreGames = async () => {
  const response = await fetch(`${API_URL}/api/videojuegos/mayores-a-2020`);

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudieron obtener los videojuegos");
  }

  return data.videojuegos.map(normalizeStoreGame);
};

export const getStoreGameByTitle = async (titulo) => {
  const response = await fetch(
    `${API_URL}/api/videojuegos/titulo/${encodeURIComponent(titulo)}`
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Videojuego no encontrado");
  }

  return normalizeStoreGame(data.videojuego);
};