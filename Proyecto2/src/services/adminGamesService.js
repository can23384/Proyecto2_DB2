const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const normalizeAdminGame = (game) => {
  return {
    ...game,
    gameId: game.gameId ?? game.neo4jId,
    titulo: game.titulo ?? "Sin título",
    descripcion: game.descripcion ?? "Sin descripción disponible.",
    fechaLanzamiento: game.fechaLanzamiento ?? "No disponible",
    precio: Number(game.precio ?? 0),
    idiomas: Array.isArray(game.idiomas) ? game.idiomas : [],
    requisitos: Array.isArray(game.requisitos) ? game.requisitos : [],
  };
};

export const getAllGames = async () => {
  const response = await fetch(`${API_URL}/api/videojuegos`);

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudieron obtener los videojuegos");
  }

  return data.videojuegos.map(normalizeAdminGame);
};

export const updateGameProperty = async ({
  videojuegoId,
  propiedad,
  valor,
}) => {
  const response = await fetch(
    `${API_URL}/api/videojuegos/${encodeURIComponent(videojuegoId)}/propiedad`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propiedad,
        valor,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo actualizar la propiedad");
  }

  return normalizeAdminGame(data.videojuego);
};

export const deleteGameProperty = async ({ videojuegoId, propiedad }) => {
  const response = await fetch(
    `${API_URL}/api/videojuegos/${encodeURIComponent(videojuegoId)}/propiedad`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propiedad,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo eliminar la propiedad");
  }

  return normalizeAdminGame(data.videojuego);
};

export const deleteGameNode = async ({ videojuegoId }) => {
  const response = await fetch(
    `${API_URL}/api/videojuegos/${encodeURIComponent(videojuegoId)}`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo eliminar el videojuego");
  }

  return data;
};

export const createGame = async ({
  titulo,
  fechaLanzamiento,
  precio,
  descripcion,
  idiomas,
  requisitos,
}) => {
  const response = await fetch(`${API_URL}/api/videojuegos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      titulo,
      fechaLanzamiento,
      precio,
      descripcion,
      idiomas,
      requisitos,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo crear el videojuego");
  }

  return normalizeAdminGame(data.videojuego);
};

export const updateMultipleGameProperties = async ({
  videojuegoIds,
  propiedad,
  valor,
}) => {
  const response = await fetch(`${API_URL}/api/videojuegos/propiedades/multiple`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      videojuegoIds,
      propiedad,
      valor,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudieron actualizar los videojuegos");
  }

  return data.videojuegos.map(normalizeAdminGame);
};

export const deleteMultipleGameProperties = async ({
  videojuegoIds,
  propiedad,
}) => {
  const response = await fetch(`${API_URL}/api/videojuegos/propiedades/multiple`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      videojuegoIds,
      propiedad,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo eliminar la propiedad");
  }

  return data.videojuegos.map((item) =>
    normalizeAdminGame({
      neo4jId: item.neo4jId,
      ...item.videojuego,
    })
  );
};

export const deleteMultipleGameNodes = async ({ videojuegoIds }) => {
  const response = await fetch(`${API_URL}/api/videojuegos/eliminar/multiple`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      videojuegoIds,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudieron eliminar los videojuegos");
  }

  return data;
};

export const getGamesCount = async () => {
  const response = await fetch(`${API_URL}/api/videojuegos/count`);

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo contar los videojuegos");
  }

  return data.total;
};