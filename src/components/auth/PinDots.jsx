function PinDots({ length, maxLength }) {
  return (
    <div className="auth-pin-display" aria-label="PIN entry visualization">
      {Array.from({ length: maxLength }).map((_, index) => (
        <div
          key={index}
          className={`auth-pin-dot ${index < length ? "is-active" : ""}`}
        />
      ))}
    </div>
  );
}

export default PinDots;
