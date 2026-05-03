const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function NumericKeypad({ onNumberClick, onBackspace }) {
  return (
    <div className="auth-keypad" role="group" aria-label="PIN keypad">
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          onClick={() => onNumberClick(String(digit))}
          className="auth-keypad__button"
        >
          {digit}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onNumberClick("0")}
        className="auth-keypad__button"
      >
        0
      </button>

      <button
        type="button"
        onClick={onBackspace}
        className="auth-keypad__button auth-keypad__button--wide auth-keypad__button--accent"
        aria-label="Delete last PIN digit"
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{fontSize:"2.3rem",justifyContent:"center",alignItems:"center",display:"flex"}}>
          backspace
        </span>
      </button>
    </div>
  );
}

export default NumericKeypad;
