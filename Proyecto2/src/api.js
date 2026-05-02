const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function loginUsuario(email, contrasena) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, contrasena }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error al iniciar sesión");
  }

  return data;
}

export async function obtenerUltimas5ComprasUsuario(neo4jId) {
  const response = await fetch(
    `${API_URL}/api/usuarios/${encodeURIComponent(neo4jId)}/compras/ultimos-5`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error al obtener los últimos 5 juegos");
  }

  return data;
}

export async function obtenerComprasUsuario(userId) {
  const response = await fetch(`${API_URL}/api/usuarios/${userId}/compras`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error al obtener compras del usuario");
  }

  return data;
}

