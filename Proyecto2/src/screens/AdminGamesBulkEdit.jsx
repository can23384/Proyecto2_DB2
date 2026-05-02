import { useState } from "react";
import {
  deleteMultipleGameNodes,
  deleteMultipleGameProperties,
  updateMultipleGameProperties,
} from "../services/adminGamesService";

const predefinedProperties = [
  "titulo",
  "descripcion",
  "fechaLanzamiento",
  "precio",
  "idiomas",
  "requisitos",
];

function AdminGamesBulkEdit({
  selectedGames,
  onBack,
  onGamesUpdated,
  onGamesDeleted,
}) {
  const [propertyMode, setPropertyMode] = useState("existing");
  const [selectedProperty, setSelectedProperty] = useState("precio");
  const [customProperty, setCustomProperty] = useState("");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletePropertyMode, setDeletePropertyMode] = useState("existing");
  const [selectedPropertyToDelete, setSelectedPropertyToDelete] =
    useState("descripcion");
  const [customPropertyToDelete, setCustomPropertyToDelete] = useState("");
  const [deletePropertyMessage, setDeletePropertyMessage] = useState("");
  const [deletingProperty, setDeletingProperty] = useState(false);

  const [deleteGamesMessage, setDeleteGamesMessage] = useState("");
  const [deletingGames, setDeletingGames] = useState(false);

  const currentProperty =
    propertyMode === "custom" ? customProperty.trim() : selectedProperty;

  const selectedGameIds = selectedGames.map((game) => game.neo4jId);

  const propertiesFromSelectedGames = Array.from(
    new Set(
      selectedGames.flatMap((game) =>
        Object.keys(game).filter(
          (property) => property !== "neo4jId" && property !== "gameId"
        )
      )
    )
  ).sort();

  const propertyToDelete =
    deletePropertyMode === "custom"
      ? customPropertyToDelete.trim()
      : selectedPropertyToDelete;

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
    setDeleteGamesMessage("");

    if (!currentProperty) {
      setMessage("Debes indicar la propiedad que quieres modificar.");
      return;
    }

    try {
      setSaving(true);

      const updatedGames = await updateMultipleGameProperties({
        videojuegoIds: selectedGameIds,
        propiedad: currentProperty,
        valor: formatValue(),
      });

      onGamesUpdated(updatedGames);
      setMessage(
        "Propiedad actualizada correctamente en los juegos seleccionados."
      );
    } catch (error) {
      console.error("Error actualizando múltiples juegos:", error);
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProperty = async (event) => {
    event.preventDefault();
    setMessage("");
    setDeletePropertyMessage("");
    setDeleteGamesMessage("");

    if (!propertyToDelete) {
      setDeletePropertyMessage("Debes indicar la propiedad que quieres eliminar.");
      return;
    }

    const confirmDelete = window.confirm(
      `¿Seguro que quieres eliminar la propiedad "${propertyToDelete}" en todos los juegos seleccionados?`
    );

    if (!confirmDelete) return;

    try {
      setDeletingProperty(true);

      const updatedGames = await deleteMultipleGameProperties({
        videojuegoIds: selectedGameIds,
        propiedad: propertyToDelete,
      });

      onGamesUpdated(updatedGames);
      setDeletePropertyMessage(
        `Proceso completado. Se intentó eliminar la propiedad "${propertyToDelete}" en los juegos seleccionados.`
      );
    } catch (error) {
      console.error("Error eliminando propiedad en múltiples juegos:", error);
      setDeletePropertyMessage(error.message);
    } finally {
      setDeletingProperty(false);
    }
  };

  const handleDeleteGames = async () => {
    setMessage("");
    setDeletePropertyMessage("");
    setDeleteGamesMessage("");

    const confirmDelete = window.confirm(
      `¿Seguro que quieres eliminar ${selectedGames.length} videojuego(s)? Esta acción eliminará los nodos y todas sus relaciones.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingGames(true);

      const data = await deleteMultipleGameNodes({
        videojuegoIds: selectedGameIds,
      });

      const deletedIds = data.videojuegosEliminados.map(
        (game) => game.neo4jId
      );

      onGamesDeleted(deletedIds);
    } catch (error) {
      console.error("Error eliminando múltiples juegos:", error);
      setDeleteGamesMessage(error.message);
    } finally {
      setDeletingGames(false);
    }
  };

  return (
    <section className="details-page">
      <button className="back-button" onClick={onBack}>
        ← Volver a administrar juegos
      </button>

      <article className="details-card no-cover">
        <div className="details-info">
          <p className="details-label">ADMIN / EDICIÓN MÚLTIPLE</p>

          <h1>Modificar varios juegos</h1>

          <div className="details-section">
            <h2>Juegos seleccionados</h2>

            <div className="bulk-selected-list">
              {selectedGames.map((game) => (
                <div className="bulk-selected-item" key={game.neo4jId}>
                  <strong>{game.titulo}</strong>
                  <span>{game.fechaLanzamiento}</span>
                </div>
              ))}
            </div>
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
                    setValue("");
                    setMessage("");
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
                    onChange={(event) => {
                      setSelectedProperty(event.target.value);
                      setValue("");
                      setMessage("");
                    }}
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
                Nuevo valor
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
                {saving ? "Guardando..." : "Actualizar juegos seleccionados"}
              </button>
            </form>
          </div>

          <div className="details-section admin-delete-property-section">
            <h2>Eliminar propiedad en seleccionados</h2>

            <form
              className="admin-delete-property-form"
              onSubmit={handleDeleteProperty}
            >
              <label>
                Tipo de propiedad
                <select
                  value={deletePropertyMode}
                  onChange={(event) => {
                    setDeletePropertyMode(event.target.value);
                    setDeletePropertyMessage("");
                  }}
                >
                  <option value="existing">Propiedad detectada</option>
                  <option value="custom">Escribir propiedad</option>
                </select>
              </label>

              {deletePropertyMode === "existing" ? (
                <label>
                  Propiedad a eliminar
                  <select
                    value={selectedPropertyToDelete}
                    onChange={(event) =>
                      setSelectedPropertyToDelete(event.target.value)
                    }
                  >
                    {propertiesFromSelectedGames.map((property) => (
                      <option value={property} key={property}>
                        {property}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  Nombre de propiedad
                  <input
                    type="text"
                    placeholder="Ejemplo: modoJuego"
                    value={customPropertyToDelete}
                    onChange={(event) =>
                      setCustomPropertyToDelete(event.target.value)
                    }
                    required
                  />
                </label>
              )}

              <p className="admin-help-text">
                Puedes eliminar propiedades originales o propiedades nuevas
                agregadas por el administrador.
              </p>

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
                {deletingProperty
                  ? "Eliminando propiedad..."
                  : "Eliminar propiedad en seleccionados"}
              </button>
            </form>
          </div>

          <div className="details-section admin-danger-section">
            <h2>Eliminar juegos seleccionados</h2>

            <div className="admin-danger-box">
              <p>
                Esta acción eliminará los nodos de los videojuegos seleccionados
                y todas sus relaciones.
              </p>

              {deleteGamesMessage && (
                <p className="admin-delete-message">{deleteGamesMessage}</p>
              )}

              <button
                type="button"
                className="delete-game-button"
                onClick={handleDeleteGames}
                disabled={deletingGames}
              >
                {deletingGames
                  ? "Eliminando juegos..."
                  : `Eliminar ${selectedGames.length} juego(s)`}
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

export default AdminGamesBulkEdit;