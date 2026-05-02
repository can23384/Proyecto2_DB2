import { useEffect, useMemo, useState } from "react";
import GameCard from "../components/GameCard";
import Recommendations from "../components/Recommendations";
import { getUserGames } from "../services/gamesService";

function Home({ usuario, onSelectGame }) {
  const [search, setSearch] = useState("");
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [errorGames, setErrorGames] = useState("");

  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoadingGames(true);
        setErrorGames("");

        const videojuegos = await getUserGames(usuario.username);
        setGames(videojuegos);
      } catch (error) {
        console.error("Error cargando videojuegos:", error);
        setErrorGames(error.message);
      } finally {
        setLoadingGames(false);
      }
    };

    if (usuario?.username) {
      loadGames();
    }
  }, [usuario]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const text = `
        ${game.titulo}
        ${game.genero}
        ${game.plataforma}
        ${game.desarrollador}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [games, search]);

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="tag">Sistema de recomendación de videojuegos</p>

          <h1>
            Bienvenido,
            <span>{usuario.username || usuario.email}</span>
          </h1>

          <p>
            Explora tu biblioteca, busca juegos y descubre títulos recomendados
            según tus géneros, plataformas y actividad.
          </p>
        </div>
      </section>

      <section className="toolbar">
        <div>
          <h2>Mis juegos</h2>
          <p>Estos son los videojuegos registrados para el jugador.</p>
        </div>

        <input
          type="text"
          placeholder="Buscar por título, género o plataforma..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </section>

      <section className="games-grid">
        {loadingGames ? (
          <div className="empty-state">
            <h3>Cargando juegos...</h3>
            <p>Estamos obteniendo tu biblioteca desde Neo4j.</p>
          </div>
        ) : errorGames ? (
          <div className="empty-state">
            <h3>Error al cargar juegos</h3>
            <p>{errorGames}</p>
          </div>
        ) : filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <GameCard
              key={game.neo4jId || game.gameId}
              game={game}
              onSelectGame={onSelectGame}
            />
          ))
        ) : (
          <div className="empty-state">
            <h3>No se encontraron juegos</h3>
            <p>Prueba buscar otro título, género o plataforma.</p>
          </div>
        )}
      </section>

      <Recommendations />
    </>
  );
}

export default Home;