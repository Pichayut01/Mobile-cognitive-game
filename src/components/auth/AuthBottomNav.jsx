function AuthBottomNav({ view, onViewChange }) {
  return (
    <nav className="auth-nav" aria-label="Authentication views">
      <button
        type="button"
        onClick={() => onViewChange("login")}
        className={`auth-nav__button ${view === "login" ? "is-active" : ""}`}
      >
        <span
          className="material-symbols-outlined auth-nav__icon"
          style={{
            fontVariationSettings:
              view === "login" ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
          }}
          aria-hidden="true"
        >
          login
        </span>
        <span>Login</span>
      </button>

      <button
        type="button"
        onClick={() => onViewChange("register")}
        className={`auth-nav__button ${view === "register" ? "is-active" : ""}`}
      >
        <span
          className="material-symbols-outlined auth-nav__icon"
          style={{
            fontVariationSettings:
              view === "register"
                ? "'FILL' 1, 'wght' 200"
                : "'FILL' 0, 'wght' 400",
          }}
          aria-hidden="true"
        >
          person_add
        </span>
        <span>Register</span>
      </button>
    </nav>
  );
}

export default AuthBottomNav;
