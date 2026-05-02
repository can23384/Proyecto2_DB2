const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const deleteUserGameRelations = async ({ usuarioId, videojuegoId }) => {
  const response = await fetch(
    `${API_URL}/api/usuarios/${encodeURIComponent(
      usuarioId
    )}/videojuegos/${encodeURIComponent(videojuegoId)}/relaciones`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo eliminar el juego");
  }

  return data;
};

export const updateGameCompleted = async ({
  usuarioId,
  videojuegoId,
  completado,
}) => {
  const response = await fetch(
    `${API_URL}/api/usuarios/${encodeURIComponent(
      usuarioId
    )}/videojuegos/${encodeURIComponent(videojuegoId)}/juego/completado`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        completado,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo actualizar el estado");
  }

  return data.juego;
};