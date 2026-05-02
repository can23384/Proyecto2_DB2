import { useEffect, useState } from "react";
import "./App.css";

import Navbar from "./components/Navbar";
import Home from "./screens/Home";
import GameDetails from "./screens/GameDetails";
import Login from "./screens/Login";
import Store from "./screens/Store";
import StoreGameDetails from "./screens/StoreGameDetails";
import AdminGames from "./screens/AdminGames";
import RecommendationsPage from "./screens/RecommendationsPage";

function App() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedGameSource, setSelectedGameSource] = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("home");

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
      setUsuarioActual(JSON.parse(usuarioGuardado));
    }
  }, []);

  const isAdmin = (usuario) => {
    return usuario?.Rol === "ADMIN" || usuario?.rol === "ADMIN";
  };

  const handleLogin = (usuario) => {
    setUsuarioActual(usuario);

    if (isAdmin(usuario)) {
      setCurrentScreen("admin");
    } else {
      setCurrentScreen("home");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    setUsuarioActual(null);
    setSelectedGame(null);
    setSelectedGameSource(null);
    setCurrentScreen("home");
  };

  const handleNavigate = (screen) => {
    setSelectedGame(null);
    setSelectedGameSource(null);
    setCurrentScreen(screen);
  };

  const handleSelectLibraryGame = (game) => {
    setSelectedGame(game);
    setSelectedGameSource("library");
  };

  const handleSelectStoreGame = (game) => {
    setSelectedGame(game);
    setSelectedGameSource("store");
  };

  if (!usuarioActual) {
    return <Login onLogin={handleLogin} />;
  }

  if (isAdmin(usuarioActual)) {
    return <AdminGames usuario={usuarioActual} onLogout={handleLogout} />;
  }

  return (
    <main className="app">
      <Navbar
        usuario={usuarioActual}
        onLogout={handleLogout}
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
      />

      {selectedGame ? (
        selectedGameSource === "store" ? (
          <StoreGameDetails
            game={selectedGame}
            usuario={usuarioActual}
            onBack={() => {
              setSelectedGame(null);
              setSelectedGameSource(null);
              setCurrentScreen("store");
            }}
          />
        ) : (
          <GameDetails
            game={selectedGame}
            usuario={usuarioActual}
            onBack={() => {
              setSelectedGame(null);
              setSelectedGameSource(null);
            }}
          />
        )
      ) : currentScreen === "store" ? (
  <Store onSelectGame={handleSelectStoreGame} />
) : currentScreen === "recommendations" ? (
  <RecommendationsPage
    usuario={usuarioActual}
    onSelectGame={handleSelectStoreGame}
  />
) : (
  <Home usuario={usuarioActual} onSelectGame={handleSelectLibraryGame} />
)}
    </main>
  );
}

export default App;