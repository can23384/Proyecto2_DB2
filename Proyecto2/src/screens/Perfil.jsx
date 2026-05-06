import { useEffect, useMemo, useState } from "react";
import "../App.css";

const API_URL = "http://localhost:3000";

function Perfil() {
  const [usuario, setUsuario] = useState(null);
  const [videojuegos, setVideojuegos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

    if (!usuarioGuardado) {
      setMensaje("No hay usuario iniciado.");
      setLoading(false);
      return;
    }

    setUsuario(usuarioGuardado);
    cargarPerfil(usuarioGuardado.username);
  }, []);

  const cargarPerfil = async (username) => {
    try {
      const res = await fetch(
        `${API_URL}/api/usuarios/${encodeURIComponent(username)}/videojuegos/todos`
      );

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.message || "No se pudo cargar el perfil.");
        return;
      }

      setVideojuegos(data.videojuegos || []);
    } catch (error) {
      console.error(error);
      setMensaje("Error conectando con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    window.location.href = "/";
  };

  const stats = useMemo(() => {
    let comprados = 0;
    let favoritos = 0;
    let completados = 0;
    let horasJugadas = 0;

    videojuegos.forEach((juego) => {
      const relaciones = juego.relacionesConUsuario || [];

      relaciones.forEach((rel) => {
        if (rel.tipo === "COMPRO") comprados++;
        if (rel.tipo === "FAVORITO") favoritos++;

        if (rel.tipo === "JUEGO") {
          horasJugadas += Number(rel.propiedades?.horasJugadas || 0);

          if (rel.propiedades?.completado === true) {
            completados++;
          }
        }
      });
    });

    return {
      biblioteca: videojuegos.length,
      comprados,
      favoritos,
      completados,
      horasJugadas
    };
  }, [videojuegos]);

  const preferencias = useMemo(() => {
    const generos = new Set();
    const plataformas = new Set();
    const desarrolladores = new Set();

    videojuegos.forEach((juego) => {
      const relaciones = juego.relacionesDelVideojuego || [];

      relaciones.forEach((rel) => {
        const nodo = rel.nodoRelacionado;
        const etiquetas = nodo?.etiquetas || [];
        const props = nodo?.propiedades || {};

        if (etiquetas.includes("Genero") && props.nombre) {
          generos.add(props.nombre);
        }

        if (etiquetas.includes("Plataforma") && props.nombre) {
          plataformas.add(props.nombre);
        }

        if (etiquetas.includes("Desarrollador") && props.nombre) {
          desarrolladores.add(props.nombre);
        }
      });
    });

    return {
      generos: Array.from(generos).slice(0, 5),
      plataformas: Array.from(plataformas).slice(0, 4),
      desarrolladores: Array.from(desarrolladores).slice(0, 4)
    };
  }, [videojuegos]);

  const actividadReciente = useMemo(() => {
    const actividad = [];

    videojuegos.forEach((juego) => {
      const relaciones = juego.relacionesConUsuario || [];

      relaciones.forEach((rel) => {
        actividad.push({
          titulo: juego.titulo,
          precio: juego.precio,
          tipo: rel.tipo,
          propiedades: rel.propiedades || {}
        });
      });
    });

    return actividad.slice(0, 4);
  }, [videojuegos]);

  const formatearFecha = (fecha) => {
    if (!fecha) return "Fecha no disponible";

    try {
      return new Date(fecha).toLocaleDateString("es-GT");
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return (
      <div className="perfil-page">
        <Navbar usuario={usuario} cerrarSesion={cerrarSesion} />
        <main className="perfil-loading">
          <h1>Cargando perfil...</h1>
        </main>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="perfil-page">
        <Navbar usuario={null} cerrarSesion={cerrarSesion} />
        <main className="perfil-loading">
          <h1>{mensaje}</h1>
        </main>
      </div>
    );
  }

  return (
    <div className="perfil-page">
      <Navbar usuario={usuario} cerrarSesion={cerrarSesion} />

      <main className="perfil-container">
        <section className="perfil-panel">
          <div className="perfil-header">
            <div className="perfil-avatar">
              <span>{usuario.username?.charAt(0)?.toUpperCase() || "U"}</span>
            </div>

            <div className="perfil-info">
              <h1>{usuario.username}</h1>
              <h2>{usuario.Rol === "ADMIN" ? "Administrador" : "Jugador"}</h2>

              <p>✉ {usuario.email}</p>
              <p>▣ Miembro desde {formatearFecha(usuario.fechaRegistro)}</p>
            </div>

            <div className="perfil-actions">
              <h3>ACCIÓN RÁPIDA</h3>
              <p>Actualiza tu información y personaliza tu perfil.</p>

              <div>
                <button className="btn-outline">Editar perfil</button>
                <button className="btn-fill">Guardar cambios</button>
              </div>
            </div>
          </div>

          <section className="perfil-stats">
            <StatCard icon="🎮" title="JUEGOS EN BIBLIOTECA" value={stats.biblioteca} color="cyan" />
            <StatCard icon="🛒" title="COMPRADOS" value={stats.comprados} color="pink" />
            <StatCard icon="♡" title="FAVORITOS" value={stats.favoritos} color="yellow" />
            <StatCard icon="🏆" title="COMPLETADOS" value={stats.completados} color="cyan" />
            <StatCard icon="⏱" title="HORAS JUGADAS" value={stats.horasJugadas} color="pink" />
          </section>

          <section className="perfil-grid">
            <div className="perfil-card">
              <h3>PREFERENCIAS</h3>

              <PreferenceSection title="GÉNEROS FAVORITOS" items={preferencias.generos} />
              <PreferenceSection title="PLATAFORMAS FAVORITAS" items={preferencias.plataformas} />
              <PreferenceSection title="DESARROLLADORES" items={preferencias.desarrolladores} />
            </div>

            <div className="perfil-card actividad-card">
              <div className="card-title-row">
                <h3>ACTIVIDAD RECIENTE</h3>
                <button>VER TODO »</button>
              </div>

              <div className="actividad-list">
                {actividadReciente.length > 0 ? (
                  actividadReciente.map((act, index) => (
                    <ActivityCard key={`${act.titulo}-${act.tipo}-${index}`} actividad={act} index={index} />
                  ))
                ) : (
                  <p className="empty">Todavía no hay actividad reciente.</p>
                )}
              </div>
            </div>

            <div className="perfil-card">
              <h3>LOGROS RECIENTES</h3>

              <Achievement icon="🏆" title="Explorador" text={`Descubriste ${stats.biblioteca} juegos`} />
              <Achievement icon="♡" title="Coleccionista" text={`Compraste ${stats.comprados} juegos`} />
              <Achievement icon="⚔" title="Maratonista" text={`Jugaste ${stats.horasJugadas} horas`} />

              <button className="logros-btn">VER TODOS LOS LOGROS »</button>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function Navbar({ usuario, cerrarSesion }) {
  return (
    <header className="perfil-navbar">
      <div className="perfil-logo">
        <span>▣</span>
        RetroGraph Games
      </div>

      <nav>
        <a href="/biblioteca">Biblioteca</a>
        <a href="/tienda">Tienda</a>
        <a href="/recomendaciones">Recomendaciones</a>
        <a href="/perfil" className="active">Perfil</a>
      </nav>

      <div className="perfil-user-box">
        <div>
          <strong>{usuario?.username || "user"}</strong>
          <span>Jugador</span>
        </div>

        <button onClick={cerrarSesion}>Salir</button>
      </div>
    </header>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <article className={`stat-card ${color}`}>
      <span className="stat-icon">{icon}</span>

      <div>
        <h4>{title}</h4>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function PreferenceSection({ title, items }) {
  return (
    <div className="preference-section">
      <h4>{title}</h4>

      <div className="chips">
        {items.length > 0 ? (
          items.map((item, index) => (
            <span key={item} className={`chip chip-${index % 3}`}>
              {item}
            </span>
          ))
        ) : (
          <p className="empty">Sin datos todavía</p>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ actividad, index }) {
  const obtenerTexto = () => {
    const props = actividad.propiedades;

    if (actividad.tipo === "CALIFICO") {
      return `Calificó ${props.puntuacion || "?"}/10`;
    }

    if (actividad.tipo === "COMPRO") {
      return `Compró Q${props.precioPagado || actividad.precio || 0}`;
    }

    if (actividad.tipo === "JUEGO") {
      return `Jugó ${props.horasJugadas || 0} horas`;
    }

    if (actividad.tipo === "FAVORITO") {
      return "Marcó como favorito";
    }

    return actividad.tipo;
  };

  return (
    <article className="mini-game-card">
      <div className={`mini-cover cover-${index % 4}`}>
        <span>{actividad.titulo}</span>
      </div>

      <h4>{actividad.titulo}</h4>
      <p>{obtenerTexto()}</p>
    </article>
  );
}

function Achievement({ icon, title, text }) {
  return (
    <div className="achievement-item">
      <span>{icon}</span>

      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default Perfil;