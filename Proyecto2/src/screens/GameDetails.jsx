import { useEffect, useState } from "react";
import {
  createGameReview,
  deleteGameReview,
  getGameReviews,
} from "../services/reviewsService";
import {
  deleteUserGameRelations,
  updateGameCompleted,
} from "../services/libraryService";

function GameDetails({ game, usuario, onBack }) {
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [errorReviews, setErrorReviews] = useState("");

  const [reviewForm, setReviewForm] = useState({
    puntuacion: "",
    comentario: "",
  });

  const [sendingReview, setSendingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  const [deleteMessage, setDeleteMessage] = useState("");
  const [deletingReview, setDeletingReview] = useState(false);
  const [deletingGame, setDeletingGame] = useState(false);

  const [completedStatus, setCompletedStatus] = useState(
  game.completado === true
);

const [updatingCompleted, setUpdatingCompleted] = useState(false);
const [completedMessage, setCompletedMessage] = useState("");

const estadoActual = completedStatus ? "Completado" : "No completado";

  const myReview = reviews.find((review) => review.usuarioId === usuario.neo4jId);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoadingReviews(true);
        setErrorReviews("");

        const reviewsData = await getGameReviews(game.neo4jId);
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error cargando reseñas:", error);
        setErrorReviews(error.message);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (game?.neo4jId) {
      loadReviews();
    }
  }, [game]);

  const handleReviewChange = (event) => {
    const { name, value } = event.target;

    setReviewForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewMessage("");
    setDeleteMessage("");

    try {
      setSendingReview(true);

      const newReview = await createGameReview({
        usuarioId: usuario.neo4jId,
        videojuegoId: game.neo4jId,
        puntuacion: reviewForm.puntuacion,
        comentario: reviewForm.comentario,
      });

      setReviews((prevReviews) => [newReview, ...prevReviews]);

      setReviewForm({
        puntuacion: "",
        comentario: "",
      });

      setReviewMessage("Calificación guardada correctamente.");
    } catch (error) {
      console.error("Error enviando calificación:", error);
      setReviewMessage(error.message);
    } finally {
      setSendingReview(false);
    }
  };

  const handleDeleteMyReview = async () => {
    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar tu calificación de este juego?"
    );

    if (!confirmDelete) return;

    setReviewMessage("");
    setDeleteMessage("");

    try {
      setDeletingReview(true);

      await deleteGameReview({
        usuarioId: usuario.neo4jId,
        videojuegoId: game.neo4jId,
      });

      setReviews((prevReviews) =>
        prevReviews.filter((review) => review.usuarioId !== usuario.neo4jId)
      );

      setDeleteMessage("Tu calificación fue eliminada correctamente.");
    } catch (error) {
      console.error("Error eliminando calificación:", error);
      setDeleteMessage(error.message);
    } finally {
      setDeletingReview(false);
    }
  };

  const handleDeleteGameFromLibrary = async () => {
    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar este juego de tu biblioteca? Se eliminarán todas tus relaciones con este juego."
    );

    if (!confirmDelete) return;

    setReviewMessage("");
    setDeleteMessage("");

    try {
      setDeletingGame(true);

      await deleteUserGameRelations({
        usuarioId: usuario.neo4jId,
        videojuegoId: game.neo4jId,
      });

      onBack();
    } catch (error) {
      console.error("Error eliminando juego:", error);
      setDeleteMessage(error.message);
    } finally {
      setDeletingGame(false);
    }
  };

  const handleUpdateCompleted = async (newStatus) => {
  setCompletedMessage("");
  setDeleteMessage("");
  setReviewMessage("");

  try {
    setUpdatingCompleted(true);

    await updateGameCompleted({
      usuarioId: usuario.neo4jId,
      videojuegoId: game.neo4jId,
      completado: newStatus,
    });

    setCompletedStatus(newStatus);
    setCompletedMessage(
      newStatus
        ? "El juego fue marcado como completado."
        : "El juego fue marcado como no completado."
    );
  } catch (error) {
    console.error("Error actualizando completado:", error);
    setCompletedMessage(error.message);
  } finally {
    setUpdatingCompleted(false);
  }
};

  return (
    <section className="details-page">
      <button className="back-button" onClick={onBack}>
        ← Volver a mis juegos
      </button>

      <article className="details-card no-cover">
        <div className="details-info">
          <p className="details-label">GAME ID #{game.gameId}</p>

          <h1>{game.titulo}</h1>

          <div className="details-meta">
            <div className="meta-box">
              <span>Fecha de lanzamiento</span>
              <strong>{game.fechaLanzamiento}</strong>
            </div>

            <div className="meta-box">
              <span>Precio</span>
              <strong>${game.precio.toFixed(2)}</strong>
            </div>

            <div className="meta-box">
              <span>Género</span>
              <strong>{game.genero}</strong>
            </div>

            <div className="meta-box">
              <span>Plataforma</span>
              <strong>{game.plataforma}</strong>
            </div>

            <div className="meta-box">
              <span>Desarrollador</span>
              <strong>{game.desarrollador}</strong>
            </div>

            <div className="meta-box">
  <span>Estado</span>
  <strong>{estadoActual}</strong>
</div>
          </div>

          <div className="details-section">
            <h2>Descripción</h2>
            <p>{game.descripcion}</p>
          </div>

          <div className="details-section">
            <h2>Idiomas</h2>
            <div className="chip-list">
              {game.idiomas.map((idioma) => (
                <span className="chip" key={idioma}>
                  {idioma}
                </span>
              ))}
            </div>
          </div>

          <div className="details-section">
            <h2>Requisitos</h2>
            <ul className="requirements-list">
              {game.requisitos.map((requisito) => (
                <li key={requisito}>{requisito}</li>
              ))}
            </ul>
          </div>

          <div className="details-section completed-section">
  <h2>Progreso del juego</h2>

  {completedMessage && (
    <p className="completed-message">{completedMessage}</p>
  )}

  <div className="completed-actions">
    <div>
      <p>Estado actual</p>
      <strong>{estadoActual}</strong>
    </div>

    <button
      type="button"
      className={completedStatus ? "completed-button active" : "completed-button"}
      onClick={() => handleUpdateCompleted(true)}
      disabled={updatingCompleted || completedStatus}
    >
      Marcar como completado
    </button>

    <button
      type="button"
      className={!completedStatus ? "completed-button active" : "completed-button"}
      onClick={() => handleUpdateCompleted(false)}
      disabled={updatingCompleted || !completedStatus}
    >
      Marcar como no completado
    </button>
  </div>
</div>

          <div className="details-section danger-section">
            <h2>Acciones del juego</h2>

            {deleteMessage && <p className="delete-message">{deleteMessage}</p>}

            <div className="danger-actions">
              <button
                type="button"
                className="delete-review-button"
                onClick={handleDeleteMyReview}
                disabled={deletingReview || !myReview}
              >
                {deletingReview
                  ? "Eliminando..."
                  : myReview
                  ? "Eliminar mi calificación"
                  : "No has calificado este juego"}
              </button>

              <button
                type="button"
                className="delete-game-button"
                onClick={handleDeleteGameFromLibrary}
                disabled={deletingGame}
              >
                {deletingGame ? "Eliminando..." : "Eliminar juego de mi biblioteca"}
              </button>
            </div>
          </div>

          <div className="details-section review-form-section">
            <h2>Calificar este juego</h2>

            <form className="review-form" onSubmit={handleReviewSubmit}>
              <label>
                Calificación, de 0 a 10
                <input
                  type="number"
                  name="puntuacion"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="Ejemplo: 8.5"
                  value={reviewForm.puntuacion}
                  onChange={handleReviewChange}
                  required
                />
              </label>

              <label>
                Comentario
                <textarea
                  name="comentario"
                  placeholder="Escribe tu opinión sobre el juego..."
                  value={reviewForm.comentario}
                  onChange={handleReviewChange}
                  required
                />
              </label>

              {reviewMessage && (
                <p className="review-form-message">{reviewMessage}</p>
              )}

              <button type="submit" disabled={sendingReview || myReview}>
                {sendingReview
                  ? "Guardando..."
                  : myReview
                  ? "Ya calificaste este juego"
                  : "Enviar calificación"}
              </button>
            </form>
          </div>

          <div className="details-section reviews-section">
            <h2>Reseñas de usuarios</h2>

            {loadingReviews ? (
              <div className="reviews-message">
                <p>Cargando reseñas...</p>
              </div>
            ) : errorReviews ? (
              <div className="reviews-message">
                <p>{errorReviews}</p>
              </div>
            ) : reviews.length > 0 ? (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <article className="review-card" key={review.relacionId}>
                    <div className="review-header">
                      <h3>{review.username}</h3>
                      <span>Calificación: {review.puntuacion}</span>
                    </div>

                    <p>{review.comentario}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="reviews-message">
                <p>Este juego todavía no tiene reseñas.</p>
              </div>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

export default GameDetails;