import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    contrasena: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message || "No se pudo iniciar sesión");
        return;
      }

      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      onLogin(data.usuario);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <p className="tag">RetroGraph Games</p>
          <h1>Iniciar sesión</h1>
          <p>
            Entra a tu cuenta para ver tu biblioteca, juegos y recomendaciones.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="usuario@email.com"
              value={formData.email}
              onChange={handleChange}
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              name="contrasena"
              placeholder="Tu contraseña"
              value={formData.contrasena}
              onChange={handleChange}
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;