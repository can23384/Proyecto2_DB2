import { useState } from "react";
import { createGame } from "../services/adminGamesService";

function AdminGameCreate({ onBack, onGameCreated }) {
  const [formData, setFormData] = useState({
    titulo: "",
    fechaLanzamiento: "",
    precio: "",
    descripcion: "",
    idiomas: "",
    requisitos: "",
  });

  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const parseList = (text) => {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      setCreating(true);

      const newGame = await createGame({
        titulo: formData.titulo,
        fechaLanzamiento: formData.fechaLanzamiento,
        precio: Number(formData.precio),
        descripcion: formData.descripcion,
        idiomas: parseList(formData.idiomas),
        requisitos: parseList(formData.requisitos),
      });

      onGameCreated(newGame);

      setFormData({
        titulo: "",
        fechaLanzamiento: "",
        precio: "",
        descripcion: "",
        idiomas: "",
        requisitos: "",
      });

      setMessage("Videojuego creado correctamente.");
    } catch (error) {
      console.error("Error creando videojuego:", error);
      setMessage(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="details-page">
      <button className="back-button" onClick={onBack}>
        ← Volver a administrar juegos
      </button>

      <article className="details-card no-cover">
        <div className="details-info">
          <p className="details-label">ADMIN / NUEVO VIDEOJUEGO</p>

          <h1>Crear videojuego</h1>

          <div className="details-section admin-edit-section">
            <h2>Datos del videojuego</h2>

            <form className="admin-edit-form" onSubmit={handleSubmit}>
              <label>
                Título
                <input
                  type="text"
                  name="titulo"
                  placeholder="Ejemplo: Game14"
                  value={formData.titulo}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Fecha de lanzamiento
                <input
                  type="date"
                  name="fechaLanzamiento"
                  value={formData.fechaLanzamiento}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Precio
                <input
                  type="number"
                  name="precio"
                  min="0"
                  step="0.01"
                  placeholder="Ejemplo: 35"
                  value={formData.precio}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Descripción
                <textarea
                  name="descripcion"
                  placeholder="Ejemplo: Juego 14"
                  value={formData.descripcion}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Idiomas
                <input
                  type="text"
                  name="idiomas"
                  placeholder="Separar por coma. Ejemplo: EN, ES"
                  value={formData.idiomas}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Requisitos
                <input
                  type="text"
                  name="requisitos"
                  placeholder="Separar por coma. Ejemplo: 8GB, Windows 10"
                  value={formData.requisitos}
                  onChange={handleChange}
                  required
                />
              </label>

              <p className="admin-help-text">
                Los idiomas y requisitos se enviarán como listas al backend.
              </p>

              {message && <p className="admin-edit-message">{message}</p>}

              <button type="submit" disabled={creating}>
                {creating ? "Creando..." : "Crear videojuego"}
              </button>
            </form>
          </div>
        </div>
      </article>
    </section>
  );
}

export default AdminGameCreate;