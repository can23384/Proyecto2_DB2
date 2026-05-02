import { useEffect, useState } from "react";
import { getStoreGameByTitle, getStoreGames } from "../services/storeService";

function Store({ onSelectGame }) {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [errorGames, setErrorGames] = useState("");

  const loadStoreGames = async () => {
    try {
      setLoadingGames(true);
      setErrorGames("");

      const videojuegos = await getStoreGames();
      setGames(videojuegos);
    } catch (error) {
      console.error("Error cargando tienda:", error);
      setErrorGames(error.message);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    loadStoreGames();
  }, []);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();

    const tituloBuscado = search.trim();

    if (!tituloBuscado) {
      loadStoreGames();
      return;
    }

    try {
      setLoadingGames(true);
      setErrorGames("");

      const videojuego = await getStoreGameByTitle(tituloBuscado);
      setGames([videojuego]);
    } catch (error) {
      console.error("Error buscando videojuego:", error);
      setGames([]);
      setErrorGames(error.message);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleClearSearch = () => {
    setSearch("");
    loadStoreGames();
  };

  return (
    <>
      <section className="store-hero">
        <div className="hero-content">
          <p className="tag">Tienda RetroGraph</p>

          <h1>
            Explora
            <span>nuevos juegos</span>
          </h1>

          <p>
            Videojuegos lanzados después de 2020
          </p>
        </div>
      </section>

      <section className="toolbar">
        <div>
          <h2>Tienda</h2>
          <p>Juegos disponibles en el catálogo.</p>
        </div>

        <form className="store-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder='Buscar título exacto, por ejemplo "Game14"...'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button type="submit">Buscar</button>

          <button
            type="button"
            className="clear-search-button"
            onClick={handleClearSearch}
          >
            Mostrar todos
          </button>
        </form>
      </section>

      <section className="store-grid">
        {loadingGames ? (
          <div className="empty-state">
            <h3>Cargando tienda...</h3>
            <p>Estamos obteniendo los videojuegos.</p>
          </div>
        ) : errorGames ? (
          <div className="empty-state">
            <h3>No se encontró el juego</h3>
            <p>{errorGames}</p>
          </div>
        ) : games.length > 0 ? (
          games.map((game) => (
            <article className="store-card" key={game.neo4jId}>
              <div className="store-card-header">
                <p>GAME ID #{game.gameId}</p>
                <span>${game.precio.toFixed(2)}</span>
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
                    {game.idiomas.length > 0
                      ? game.idiomas.join(", ")
                      : "No disponible"}
                  </strong>
                </div>

                <div>
                  <span>Requisitos</span>
                  <strong>
                    {game.requisitos.length > 0
                      ? game.requisitos.join(", ")
                      : "No disponible"}
                  </strong>
                </div>
              </div>

              <button onClick={() => onSelectGame(game)}>Ver detalles</button>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h3>No se encontraron juegos</h3>
            <p>Prueba buscar otro título.</p>
          </div>
        )}
      </section>
    </>
  );
}

export default Store;