import { useEffect, useState } from "react";
import { buyGame } from "../services/purchaseService";
import { getGameReviews } from "../services/reviewsService";

function StoreGameDetails({ game, usuario, onBack }) {
  const today = new Date().toISOString().slice(0, 10);

  const [purchaseForm, setPurchaseForm] = useState({
    fechaCompra: today,
    precioPagado: game.precio ?? 0,
    metodoPago: "Tarjeta",
  });

  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [buying, setBuying] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [errorReviews, setErrorReviews] = useState("");

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

  const handlePurchaseChange = (event) => {
    const { name, value } = event.target;

    setPurchaseForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handlePurchaseSubmit = async (event) => {
    event.preventDefault();
    setPurchaseMessage("");

    try {
      setBuying(true);

      await buyGame({
        usuarioId: usuario.neo4jId,
        videojuegoId: game.neo4jId,
        fechaCompra: purchaseForm.fechaCompra,
        precioPagado: purchaseForm.precioPagado,
        metodoPago: purchaseForm.metodoPago,
      });

      setPurchaseMessage("Compra realizada correctamente.");
    } catch (error) {
      console.error("Error comprando videojuego:", error);
      setPurchaseMessage(error.message);
    } finally {
      setBuying(false);
    }
  };

  return (
    <section className="details-page">
      <button className="back-button" onClick={onBack}>
        ← Volver a tienda
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
              <strong>${Number(game.precio ?? 0).toFixed(2)}</strong>
            </div>

            <div className="meta-box">
              <span>Género</span>
              <strong>{game.genero || "Sin género"}</strong>
            </div>

            <div className="meta-box">
              <span>Plataforma</span>
              <strong>{game.plataforma || "Sin plataforma"}</strong>
            </div>

            <div className="meta-box">
              <span>Desarrollador</span>
              <strong>{game.desarrollador || "Sin desarrollador"}</strong>
            </div>

            <div className="meta-box">
              <span>Estado</span>
              <strong>Disponible</strong>
            </div>
          </div>

          <div className="details-section">
            <h2>Descripción</h2>
            <p>{game.descripcion}</p>
          </div>

          <div className="details-section">
            <h2>Idiomas</h2>
            <div className="chip-list">
              {game.idiomas.length > 0 ? (
                game.idiomas.map((idioma) => (
                  <span className="chip" key={idioma}>
                    {idioma}
                  </span>
                ))
              ) : (
                <span className="chip">No disponible</span>
              )}
            </div>
          </div>

          <div className="details-section">
            <h2>Requisitos</h2>
            <ul className="requirements-list">
              {game.requisitos.length > 0 ? (
                game.requisitos.map((requisito) => (
                  <li key={requisito}>{requisito}</li>
                ))
              ) : (
                <li>No disponible</li>
              )}
            </ul>
          </div>

          <div className="details-section purchase-section">
            <h2>Comprar videojuego</h2>

            <form className="purchase-form" onSubmit={handlePurchaseSubmit}>
              <label>
                Fecha de compra
                <input
                  type="date"
                  name="fechaCompra"
                  value={purchaseForm.fechaCompra}
                  onChange={handlePurchaseChange}
                  required
                />
              </label>

              <label>
                Pago
                <input
                  type="number"
                  name="precioPagado"
                  min="0"
                  step="0.01"
                  value={purchaseForm.precioPagado}
                  onChange={handlePurchaseChange}
                  required
                />
              </label>

              <label>
                Método de pago
                <select
                  name="metodoPago"
                  value={purchaseForm.metodoPago}
                  onChange={handlePurchaseChange}
                  required
                >
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Gift Card">Gift Card</option>
                </select>
              </label>

              {purchaseMessage && (
                <p className="purchase-message">{purchaseMessage}</p>
              )}

              <button type="submit" disabled={buying}>
                {buying ? "Comprando..." : "Comprar"}
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

export default StoreGameDetails;