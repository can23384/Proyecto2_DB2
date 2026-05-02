const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const normalizeReview = (calificacion) => {
  return {
    relacionId: calificacion.relacionId,
    usuarioId:
      calificacion.usuario?.neo4jId ||
      calificacion.usuario?.propiedades?.neo4jId ||
      "",
    username:
      calificacion.usuario?.propiedades?.username ||
      calificacion.usuario?.username ||
      calificacion.usuario?.email ||
      "Usuario desconocido",
    puntuacion: calificacion.propiedades?.puntuacion ?? "N/A",
    comentario: calificacion.propiedades?.comentario || "Sin comentario",
  };
};

export const getGameReviews = async (neo4jId) => {
  const response = await fetch(
    `${API_URL}/api/videojuegos/${encodeURIComponent(
      neo4jId
    )}/calificaciones`
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudieron obtener las reseñas");
  }

  return data.calificaciones.map(normalizeReview);
};

export const createGameReview = async ({
  usuarioId,
  videojuegoId,
  puntuacion,
  comentario,
}) => {
  const fecha = new Date().toISOString().slice(0, 10);

  const response = await fetch(
    `${API_URL}/api/usuarios/${encodeURIComponent(
      usuarioId
    )}/videojuegos/${encodeURIComponent(videojuegoId)}/calificar`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        puntuacion,
        fecha,
        comentario,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo guardar la calificación");
  }

  return normalizeReview(data.calificacion);
};

export const deleteGameReview = async ({ usuarioId, videojuegoId }) => {
  const response = await fetch(
    `${API_URL}/api/usuarios/${encodeURIComponent(
      usuarioId
    )}/videojuegos/${encodeURIComponent(videojuegoId)}/calificacion`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo eliminar la calificación");
  }

  return data;
};