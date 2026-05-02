import { useEffect, useState } from "react";
import { getUserRecommendations } from "../services/recommendationsService";

function RecommendationsPage({ usuario, onSelectGame }) {
  const [recommendations, setRecommendations] = useState([]);
  const [limit, setLimit] = useState(10);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [errorRecommendations, setErrorRecommendations] = useState("");

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoadingRecommendations(true);
        setErrorRecommendations("");

        const data = await getUserRecommendations({
          usuarioId: usuario.neo4jId,
          limit,
        });

        setRecommendations(data);
      } catch (error) {
        console.error("Error cargando recomendaciones:", error);
        setErrorRecommendations(error.message);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    if (usuario?.neo4jId) {
      loadRecommendations();
    }
  }, [usuario, limit]);

  return (
    <>
      <section className="recommendations-hero">
        <div className="hero-content">
          <p className="tag">Motor de recomendación híbrido</p>

          <h1>
            Recomendaciones
            <span>para ti</span>
          </h1>

          <p>
            Esta sección combina filtrado colaborativo y filtrado basado en
            contenido para sugerir videojuegos según tu actividad, tus gustos y
            las características de los juegos.
          </p>
        </div>
      </section>

      <section className="recommendation-explanation">
        <article className="recommendation-info-card">
          <h2>Consulta A: filtrado colaborativo</h2>
          <p>
            Busca usuarios con gustos parecidos al jugador actual. Si otros
            usuarios han jugado, comprado, calificado o marcado como favoritos
            juegos similares a los tuyos, el sistema recomienda títulos que
            ellos exploraron y que tú todavía no tienes.
          </p>
        </article>

        <article className="recommendation-info-card">
          <h2>Consulta B: filtrado por contenido</h2>
          <p>
            Analiza características de los videojuegos, como géneros,
            desarrolladores y plataformas. Así puede recomendar juegos parecidos
            a los que ya te interesan, incluso si todavía hay pocos datos de
            otros usuarios.
          </p>
        </article>

        <article className="recommendation-info-card">
          <h2>Combinación híbrida</h2>
          <p>
            Los resultados de ambas consultas se unen en una sola lista,
            eliminando duplicados y ordenando por el puntaje total para mostrar
            recomendaciones más claras y relevantes.
          </p>
        </article>
      </section>

      <section className="toolbar">
        <div>
          <h2>Juegos recomendados</h2>
          <p>
            Total mostrado:{" "}
            {loadingRecommendations ? "cargando..." : recommendations.length}
          </p>
        </div>

        <div className="recommendation-limit-control">
          <label>
            Límite
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              <option value={5}>5 juegos</option>
              <option value={10}>10 juegos</option>
              <option value={15}>15 juegos</option>
              <option value={20}>20 juegos</option>
            </select>
          </label>
        </div>
      </section>

      <section className="recommendations-result-grid">
        {loadingRecommendations ? (
          <div className="empty-state">
            <h3>Generando recomendaciones...</h3>
            <p>Estamos ejecutando el sistema híbrido en Neo4j.</p>
          </div>
        ) : errorRecommendations ? (
          <div className="empty-state">
            <h3>Error al cargar recomendaciones</h3>
            <p>{errorRecommendations}</p>
          </div>
        ) : recommendations.length > 0 ? (
          recommendations.map((game) => (
            <article className="recommendation-result-card" key={game.neo4jId}>
              <div className="recommendation-card-header">
                <p>GAME ID #{game.gameId}</p>
                <span>Score {Number(game.scores.total ?? 0).toFixed(2)}</span>
              </div>

              <h3>{game.titulo}</h3>

              <p className="recommendation-description">
                {game.descripcion}
              </p>

              <div className="recommendation-score-grid">
                <div>
                  <span>Colaborativo</span>
                  <strong>
                    {Number(game.scores.colaborativo ?? 0).toFixed(2)}
                  </strong>
                </div>

                <div>
                  <span>Contenido</span>
                  <strong>{Number(game.scores.contenido ?? 0).toFixed(2)}</strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>{Number(game.scores.total ?? 0).toFixed(2)}</strong>
                </div>
              </div>

              <div className="recommendation-reasons">
                <p>
                  Usuarios similares:{" "}
                  <strong>{game.razones.usuariosSimilares}</strong>
                </p>

                <p>
                  Géneros coincidentes:{" "}
                  <strong>{game.razones.generosCoincidentes}</strong>
                </p>

                <p>
                  Desarrolladores coincidentes:{" "}
                  <strong>{game.razones.desarrolladoresCoincidentes}</strong>
                </p>

                <p>
                  Plataformas coincidentes:{" "}
                  <strong>{game.razones.plataformasCoincidentes}</strong>
                </p>

                {game.razones.usuariosEjemplo.length > 0 && (
                  <p>
                    Usuarios ejemplo:{" "}
                    <strong>{game.razones.usuariosEjemplo.join(", ")}</strong>
                  </p>
                )}
              </div>

              <div className="store-info-grid">
                <div>
                  <span>Fecha lanzamiento</span>
                  <strong>{game.fechaLanzamiento}</strong>
                </div>

                <div>
                  <span>Precio</span>
                  <strong>${game.precio.toFixed(2)}</strong>
                </div>
              </div>

              <button type="button" onClick={() => onSelectGame(game)}>
                Ver detalles
              </button>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h3>No hay recomendaciones todavía</h3>
            <p>
              Interactúa con más juegos para que el sistema pueda generar
              sugerencias.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

export default RecommendationsPage;