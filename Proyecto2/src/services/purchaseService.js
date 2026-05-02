const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const buyGame = async ({
  usuarioId,
  videojuegoId,
  fechaCompra,
  precioPagado,
  metodoPago,
}) => {
  const response = await fetch(
    `${API_URL}/api/usuarios/${encodeURIComponent(
      usuarioId
    )}/videojuegos/${encodeURIComponent(videojuegoId)}/comprar`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fechaCompra,
        precioPagado,
        metodoPago,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo realizar la compra");
  }

  return data.compra;
};