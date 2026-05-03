function AuthHeader({ eyebrow, title, description }) {
  return (
    <header className="auth-header">
      <p className="auth-header__eyebrow">{eyebrow}</p>
      <h1 className="auth-header__title">{title}</h1>
      <p className="auth-header__description">{description}</p>
    </header>
  );
}

export default AuthHeader;
