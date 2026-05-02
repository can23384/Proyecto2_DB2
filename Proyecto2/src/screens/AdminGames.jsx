import { useEffect, useMemo, useState } from "react";
import {
  getAllGames,
  getGamesCount,
} from "../services/adminGamesService";
import AdminGameEdit from "./AdminGameEdit";
import AdminGameCreate from "./AdminGameCreate";
import AdminGamesBulkEdit from "./AdminGamesBulkEdit";

function AdminGames({ usuario, onLogout }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [creatingGame, setCreatingGame] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);

  const [selectedGameIds, setSelectedGameIds] = useState([]);

  const [search, setSearch] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [errorGames, setErrorGames] = useState("");

  const [totalFromDatabase, setTotalFromDatabase] = useState(null);
  const [countingGames, setCountingGames] = useState(false);
  const [countMessage, setCountMessage] = useState("");

  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoadingGames(true);
        setErrorGames("");

        const videojuegos = await getAllGames();
        setGames(videojuegos);
      } catch (error) {
        console.error("Error cargando videojuegos:", error);
        setErrorGames(error.message);
      } finally {
        setLoadingGames(false);
      }
    };

    loadGames();
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const text = `
        ${game.titulo}
        ${game.descripcion}
        ${game.fechaLanzamiento}
        ${game.precio}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [games, search]);

  const selectedGames = games.filter((game) =>
    selectedGameIds.includes(game.neo4jId)
  );

  const handleCountGames = async () => {
    try {
      setCountingGames(true);
      setCountMessage("");

      const total = await getGamesCount();
      setTotalFromDatabase(total);
      setCountMessage("Conteo actualizado correctamente.");
    } catch (error) {
      console.error("Error contando videojuegos:", error);
      setCountMessage(error.message);
    } finally {
      setCountingGames(false);
    }
  };

  const toggleSelectedGame = (gameId) => {
    setSelectedGameIds((prevIds) => {
      if (prevIds.includes(gameId)) {
        return prevIds.filter((id) => id !== gameId);
      }

      return [...prevIds, gameId];
    });
  };

  const handleGameUpdated = (updatedGame) => {
    setGames((prevGames) =>
      prevGames.map((game) =>
        game.neo4jId === updatedGame.neo4jId ? updatedGame : game
      )
    );

    setSelectedGame(updatedGame);
  };

  const handleGameCreated = (newGame) => {
    setGames((prevGames) => [newGame, ...prevGames]);
    setCreatingGame(false);
  };

  const handleBulkGamesUpdated = (updatedGames) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        const updatedGame = updatedGames.find(
          (updated) => updated.neo4jId === game.neo4jId
        );

        return updatedGame || game;
      })
    );
  };

  const AdminNavbar = ({ title }) => (
    <nav className="navbar">
      <div className="brand">
        <span className="brand-icon">▣</span>
        RetroGraph Admin
      </div>

      <ul className="menu">
        <li className="active-menu">{title}</li>
      </ul>

      <div className="user-box">
        <div>
          <strong>{usuario.username || usuario.email}</strong>
          <small>ADMIN</small>
        </div>

        <button className="logout-button" onClick={onLogout}>
          Salir
        </button>
      </div>
    </nav>
  );

  if (bulkEditing) {
    return (
      <main className="app">
        <AdminNavbar title="Edición múltiple" />

        <AdminGamesBulkEdit
          selectedGames={selectedGames}
          onBack={() => setBulkEditing(false)}
          onGamesUpdated={handleBulkGamesUpdated}
          onGamesDeleted={(deletedIds) => {
            setGames((prevGames) =>
              prevGames.filter((game) => !deletedIds.includes(game.neo4jId))
            );

            setSelectedGameIds([]);
            setBulkEditing(false);
          }}
        />
      </main>
    );
  }

  if (creatingGame) {
    return (
      <main className="app">
        <AdminNavbar title="Crear juego" />

        <AdminGameCreate
          onBack={() => setCreatingGame(false)}
          onGameCreated={handleGameCreated}
        />
      </main>
    );
  }

  if (selectedGame) {
    return (
      <main className="app">
        <AdminNavbar title="Editar juego" />

        <AdminGameEdit
          game={selectedGame}
          onBack={() => setSelectedGame(null)}
          onGameUpdated={handleGameUpdated}
          onGameDeleted={(deletedGameId) => {
            setGames((prevGames) =>
              prevGames.filter((game) => game.neo4jId !== deletedGameId)
            );

            setSelectedGame(null);
          }}
        />
      </main>
    );
  }

  return (
    <main className="app">
      <AdminNavbar title="Administrar juegos" />

      <section className="store-hero">
        <div className="hero-content">
          <p className="tag">Panel de administración</p>

          <h1>
            Manejo
            <span>de videojuegos</span>
          </h1>

          <p>
            Vista administrativa para consultar, crear, modificar y eliminar
            juegos registrados en Neo4j.
          </p>
        </div>
      </section>

      <section className="toolbar">
  <div className="admin-count-box">
    <h2>Todos los juegos</h2>

    <button
      type="button"
      className="count-games-button"
      onClick={handleCountGames}
      disabled={countingGames}
    >
      {countingGames
        ? "Contando..."
        : totalFromDatabase !== null
        ? `Total en BD: ${totalFromDatabase}`
        : "Contar total en BD"}
    </button>

    {countMessage && <p className="count-message">{countMessage}</p>}
  </div>

  <div className="admin-toolbar-actions">
    <input
      type="text"
      placeholder="Buscar juego por título, descripción o fecha..."
      value={search}
      onChange={(event) => setSearch(event.target.value)}
    />

    <button type="button" onClick={() => setCreatingGame(true)}>
      Crear juego
    </button>

    <button
      type="button"
      onClick={() => setBulkEditing(true)}
      disabled={selectedGameIds.length === 0}
    >
      Modificar seleccionados ({selectedGameIds.length})
    </button>
  </div>
</section>

      <section className="store-grid">
        {loadingGames ? (
          <div className="empty-state">
            <h3>Cargando juegos...</h3>
            <p>Estamos obteniendo todos los videojuegos desde Neo4j.</p>
          </div>
        ) : errorGames ? (
          <div className="empty-state">
            <h3>Error al cargar juegos</h3>
            <p>{errorGames}</p>
          </div>
        ) : filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <article className="store-card" key={game.neo4jId}>
              <label className="admin-select-game">
                <input
                  type="checkbox"
                  checked={selectedGameIds.includes(game.neo4jId)}
                  onChange={() => toggleSelectedGame(game.neo4jId)}
                />
                Seleccionar
              </label>

              <div className="store-card-header">
                <p>GAME ID #{game.gameId}</p>
                <span>${Number(game.precio ?? 0).toFixed(2)}</span>
              </div>

              <h3>{game.titulo}</h3>

              <p className="store-description">{game.descripcion}</p>

              <div className="store-info-grid">
                <div>
                  <span>Fecha lanzamiento</span>
                  <strong>{game.fechaLanzamiento}</strong>
                </div>

                <div>
                  <span>Idiomas</span>
                  <strong>
                    {game.idiomas?.length > 0
                      ? game.idiomas.join(", ")
                      : "No disponible"}
                  </strong>
                </div>

                <div>
                  <span>Requisitos</span>
                  <strong>
                    {game.requisitos?.length > 0
                      ? game.requisitos.join(", ")
                      : "No disponible"}
                  </strong>
                </div>
              </div>

              <button type="button" onClick={() => setSelectedGame(game)}>
                Administrar
              </button>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h3>No se encontraron juegos</h3>
            <p>Prueba buscar otro título.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminGames;