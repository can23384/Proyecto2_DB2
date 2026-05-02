function GameCard({ game, onSelectGame }) {
  return (
    <article className="game-card">
      <div className="game-cover">
        <span>{game.titulo}</span>
      </div>

      <div className="game-info">
        <div className="game-header">
          <span className="game-status">{game.estado}</span>
        </div>

        <p className="game-genre">{game.genero}</p>

        <div className="game-stats">
          <span>Plataforma: {game.plataforma}</span>
          <span>{game.horasJugadas} h</span>
          <span>⭐ {game.rating}</span>
        </div>

        <button onClick={() => onSelectGame(game)}>Ver detalles</button>
      </div>
    </article>
  );
}

export default GameCard;