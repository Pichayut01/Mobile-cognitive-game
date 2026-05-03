function RegisterForm({
  formData,
  maxPinLength,
  showPin,
  showConfirmPin,
  onInputChange,
  onSubmit,
  onTogglePin,
  onToggleConfirmPin,
}) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
      <div className="auth-field">
        <span className="material-symbols-outlined auth-field__icon" aria-hidden="true">
          person
        </span>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={onInputChange}
          placeholder="ชื่อ"
          className="auth-input"
          autoComplete="given-name"
          required
        />
      </div>

      <div className="auth-field">
        <span className="material-symbols-outlined auth-field__icon" aria-hidden="true">
          badge
        </span>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={onInputChange}
          placeholder="นามสกุล"
          className="auth-input"
          autoComplete="family-name"
          required
        />
      </div>

      <div className="auth-field">
        <span className="material-symbols-outlined auth-field__icon" aria-hidden="true">
          cake
        </span>
        <input
          type="number"
          name="age"
          value={formData.age}
          onChange={onInputChange}
          placeholder="อายุ"
          className="auth-input"
          min="1"
          max="120"
          required
        />
      </div>

      <div className="auth-field auth-field--gender">
        <span className="material-symbols-outlined auth-field__icon" aria-hidden="true">
          wc
        </span>
        <div className="auth-gender-pills">
          {[
            { value: "male", symbol: "♂", label: "ชาย" },
            { value: "female", symbol: "♀", label: "หญิง" },
            { value: "not_specified", symbol: null, label: "ไม่ระบุ" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`auth-gender-pill ${formData.gender === option.value ? "is-active" : ""}`}
              onClick={() => onInputChange({ target: { name: "gender", value: option.value } })}
            >
              {option.symbol && <span className="auth-gender-symbol">{option.symbol}</span>}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="auth-field">
        <span className="material-symbols-outlined auth-field__icon" aria-hidden="true">
          password
        </span>
        <input
          type={showPin ? "text" : "password"}
          name="registerPin"
          value={formData.registerPin}
          onChange={onInputChange}
          placeholder={`ตั้งค่า PIN (${maxPinLength} หลัก)`}
          className="auth-input auth-input--pin"
          maxLength={maxPinLength}
          minLength={maxPinLength}
          pattern="\d*"
          inputMode="numeric"
          autoComplete="new-password"
          required
        />
        <button
          type="button"
          onClick={onTogglePin}
          className="auth-field__toggle"
          title={showPin ? "ซ่อน PIN" : "แสดง PIN"}
          aria-label={showPin ? "ซ่อน PIN" : "แสดง PIN"}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {showPin ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>

      <div className="auth-field">
        <span className="material-symbols-outlined auth-field__icon" aria-hidden="true">
          password
        </span>
        <input
          type={showConfirmPin ? "text" : "password"}
          name="confirmPin"
          value={formData.confirmPin}
          onChange={onInputChange}
          placeholder={`ยืนยัน PIN (${maxPinLength} หลัก)`}
          className="auth-input auth-input--pin"
          maxLength={maxPinLength}
          minLength={maxPinLength}
          pattern="\d*"
          inputMode="numeric"
          autoComplete="new-password"
          required
        />
        <button
          type="button"
          onClick={onToggleConfirmPin}
          className="auth-field__toggle"
          title={showConfirmPin ? "ซ่อน PIN" : "แสดง PIN"}
          aria-label={showConfirmPin ? "ซ่อน PIN" : "แสดง PIN"}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {showConfirmPin ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>

      <button type="submit" className="auth-submit">
        <span className="material-symbols-outlined" aria-hidden="true">
          how_to_reg
        </span>
        <span>ยืนยันการสมัคร</span>
      </button>
    </form>
  );
}

export default RegisterForm;
