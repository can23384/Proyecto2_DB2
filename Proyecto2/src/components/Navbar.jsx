function Navbar({ usuario, onLogout, currentScreen, onNavigate }) {
  const goToHome = () => {
    onNavigate("home");
  };

  const goToStore = () => {
    onNavigate("store");
  };

  return (
    <nav className="navbar">
      <button className="brand brand-button" type="button" onClick={goToHome}>
        <span className="brand-icon">▣</span>
        RetroGraph Games
      </button>

      <ul className="menu">

        <li>
          <button
            type="button"
            className={currentScreen === "home" ? "menu-button active-menu" : "menu-button"}
            onClick={goToHome}
          >
            Biblioteca
          </button>
        </li>

        <li>
          <button
            type="button"
            className={currentScreen === "store" ? "menu-button active-menu" : "menu-button"}
            onClick={goToStore}
          >
            Tienda
          </button>
        </li>

        <li>
  <button
    type="button"
    className={
      currentScreen === "recommendations"
        ? "menu-button active-menu"
        : "menu-button"
    }
    onClick={() => onNavigate("recommendations")}
  >
    Recomendaciones
  </button>
</li>

        <li>
          <button type="button" className="menu-button">
            Perfil
          </button>
        </li>
      </ul>

      <div className="user-box">
        <div>
          <strong>{usuario.username || usuario.email}</strong>
          <small>{usuario.pais || "Jugador"}</small>
        </div>

        <button className="logout-button" type="button" onClick={onLogout}>
          Salir
        </button>
      </div>
    </nav>
  );
}

export default Navbar;