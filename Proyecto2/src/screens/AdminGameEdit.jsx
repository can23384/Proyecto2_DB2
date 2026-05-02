import { useState } from "react";
import {
  deleteGameNode,
  deleteGameProperty,
  updateGameProperty,
} from "../services/adminGamesService";

const predefinedProperties = [
  "titulo",
  "descripcion",
  "fechaLanzamiento",
  "precio",
  "idiomas",
  "requisitos",
];

function AdminGameEdit({ game, onBack, onGameUpdated, onGameDeleted }) {
  const [propertyMode, setPropertyMode] = useState("existing");
  const [selectedProperty, setSelectedProperty] = useState("titulo");
  const [customProperty, setCustomProperty] = useState("");
  const [value, setValue] = useState(game.titulo || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [propertyToDelete, setPropertyToDelete] = useState("descripcion");
  const [deletePropertyMessage, setDeletePropertyMessage] = useState("");
  const [deletingProperty, setDeletingProperty] = useState(false);

  const [deleteGameMessage, setDeleteGameMessage] = useState("");
  const [deletingGame, setDeletingGame] = useState(false);

  const currentProperty =
    propertyMode === "custom" ? customProperty.trim() : selectedProperty;

  const availableProperties = Object.keys(game).filter(
    (property) => property !== "neo4jId" && property !== "gameId"
  );

  const handlePropertyChange = (event) => {
    const property = event.target.value;
    setSelectedProperty(property);
    setMessage("");

    if (property === "idiomas" || property === "requisitos") {
      const currentValue = game[property];

      if (Array.isArray(currentValue)) {
        setValue(currentValue.join(", "));
      } else {
        setValue("");
      }

      return;
    }

    setValue(game[property] ?? "");
  };

  const getInputType = () => {
    if (currentProperty === "precio") return "number";
    if (currentProperty === "fechaLanzamiento") return "date";
    return "text";
  };

  const formatValue = () => {
    if (currentProperty === "precio") {
      return Number(value);
    }

    if (currentProperty === "idiomas" || currentProperty === "requisitos") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    return value;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setDeletePropertyMessage("");
    setDeleteGameMessage("");

    if (!currentProperty) {
      setMessage("Debes escribir el nombre de la propiedad.");
      return;
    }

    try {
      setSaving(true);

      const updatedGame = await updateGameProperty({
        videojuegoId: game.neo4jId,
        propiedad: currentProperty,
        valor: formatValue(),
      });

      onGameUpdated(updatedGame);
      setMessage("Propiedad actualizada correctamente.");
    } catch (error) {
      console.error("Error actualizando propiedad:", error);
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProperty = async (event) => {
    event.preventDefault();
    setMessage("");
    setDeletePropertyMessage("");
    setDeleteGameMessage("");

    if (!propertyToDelete) {
      setDeletePropertyMessage("Selecciona una propiedad para eliminar.");
      return;
    }

    const confirmDelete = window.confirm(
      `¿Seguro que quieres eliminar la propiedad "${propertyToDelete}"?`
    );

    if (!confirmDelete) return;

    try {
      setDeletingProperty(true);

      const updatedGame = await deleteGameProperty({
        videojuegoId: game.neo4jId,
        propiedad: propertyToDelete,
      });

      onGameUpdated(updatedGame);
      setDeletePropertyMessage("Propiedad eliminada correctamente.");
    } catch (error) {
      console.error("Error eliminando propiedad:", error);
      setDeletePropertyMessage(error.message);
    } finally {
      setDeletingProperty(false);
    }
  };

  const handleDeleteGame = async () => {
    setMessage("");
    setDeletePropertyMessage("");
    setDeleteGameMessage("");

    const confirmDelete = window.confirm(
      `¿Seguro que quieres eliminar completamente el videojuego "${game.titulo}"? Esta acción eliminará el nodo y todas sus relaciones.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingGame(true);

      await deleteGameNode({
        videojuegoId: game.neo4jId,
      });

      onGameDeleted(game.neo4jId);
    } catch (error) {
      console.error("Error eliminando videojuego:", error);
      setDeleteGameMessage(error.message);
    } finally {
      setDeletingGame(false);
    }
  };

  return (
    <section className="details-page">
      <button className="back-button" onClick={onBack}>
        ← Volver a administrar juegos
      </button>

      <article className="details-card no-cover">
        <div className="details-info">
          <p className="details-label">ADMIN / GAME ID #{game.gameId}</p>

          <h1>{game.titulo}</h1>

          <div className="details-meta">
            <div className="meta-box">
              <span>Fecha de lanzamiento</span>
              <strong>{game.fechaLanzamiento}</strong>
            </div>

            <div className="meta-box">
              <span>Precio</span>
              <strong>${Number(game.precio ?? 0).toFixed(2)}</strong>
            </div>

            <div className="meta-box">
              <span>Idiomas</span>
              <strong>
                {game.idiomas?.length > 0 ? game.idiomas.join(", ") : "N/A"}
              </strong>
            </div>

            <div className="meta-box">
              <span>Requisitos</span>
              <strong>
                {game.requisitos?.length > 0
                  ? game.requisitos.join(", ")
                  : "N/A"}
              </strong>
            </div>
          </div>

          <div className="details-section">
            <h2>Descripción actual</h2>
            <p>{game.descripcion}</p>
          </div>

          <div className="details-section admin-edit-section">
            <h2>Actualizar o agregar propiedad</h2>

            <form className="admin-edit-form" onSubmit={handleSubmit}>
              <label>
                Tipo de propiedad
                <select
                  value={propertyMode}
                  onChange={(event) => {
                    setPropertyMode(event.target.value);
                    setMessage("");
                    setValue("");
                  }}
                >
                  <option value="existing">Propiedad existente</option>
                  <option value="custom">Nueva propiedad</option>
                </select>
              </label>

              {propertyMode === "existing" ? (
                <label>
                  Propiedad
                  <select
                    value={selectedProperty}
                    onChange={handlePropertyChange}
                  >
                    {predefinedProperties.map((property) => (
                      <option value={property} key={property}>
                        {property}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  Nombre de nueva propiedad
                  <input
                    type="text"
                    placeholder="Ejemplo: modoJuego"
                    value={customProperty}
                    onChange={(event) => setCustomProperty(event.target.value)}
                    required
                  />
                </label>
              )}

              <label>
                Valor
                {currentProperty === "descripcion" ? (
                  <textarea
                    placeholder="Nuevo valor..."
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    required
                  />
                ) : (
                  <input
                    type={getInputType()}
                    step={currentProperty === "precio" ? "0.01" : undefined}
                    min={currentProperty === "precio" ? "0" : undefined}
                    placeholder={
                      currentProperty === "idiomas" ||
                      currentProperty === "requisitos"
                        ? "Separar valores por coma. Ejemplo: EN, ES"
                        : "Nuevo valor..."
                    }
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    required
                  />
                )}
              </label>

              {(currentProperty === "idiomas" ||
                currentProperty === "requisitos") && (
                <p className="admin-help-text">
                  Para listas, escribe los valores separados por coma.
                </p>
              )}

              {message && <p className="admin-edit-message">{message}</p>}

              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar propiedad"}
              </button>
            </form>
          </div>

          <div className="details-section admin-delete-property-section">
            <h2>Eliminar propiedad</h2>

            <form
              className="admin-delete-property-form"
              onSubmit={handleDeleteProperty}
            >
              <label>
                Propiedad a eliminar
                <select
                  value={propertyToDelete}
                  onChange={(event) => setPropertyToDelete(event.target.value)}
                >
                  {availableProperties.map((property) => (
                    <option value={property} key={property}>
                      {property}
                    </option>
                  ))}
                </select>
              </label>

              {deletePropertyMessage && (
                <p className="admin-delete-message">
                  {deletePropertyMessage}
                </p>
              )}

              <button
                type="submit"
                className="delete-review-button"
                disabled={deletingProperty}
              >
                {deletingProperty ? "Eliminando..." : "Eliminar propiedad"}
              </button>
            </form>
          </div>

          <div className="details-section admin-danger-section">
            <h2>Eliminar videojuego</h2>

            <div className="admin-danger-box">
              <p>
                Esta acción eliminará el nodo <strong>{game.titulo}</strong> y
                todas sus relaciones con usuarios, géneros, plataformas y
                desarrolladores.
              </p>

              {deleteGameMessage && (
                <p className="admin-delete-message">{deleteGameMessage}</p>
              )}

              <button
                type="button"
                className="delete-game-button"
                onClick={handleDeleteGame}
                disabled={deletingGame}
              >
                {deletingGame ? "Eliminando videojuego..." : "Eliminar videojuego"}
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

export default AdminGameEdit;