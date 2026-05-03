import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthBottomNav from "../components/auth/AuthBottomNav";
import AuthHeader from "../components/auth/AuthHeader";
import NumericKeypad from "../components/auth/NumericKeypad";
import PinDots from "../components/auth/PinDots";
import RegisterForm from "../components/auth/RegisterForm";
import {
  createSession,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";
import "../styles/auth-page.css";

const MAX_PIN_LENGTH = 6;
const INITIAL_FORM_DATA = {
  firstName: "",
  lastName: "",
  age: "",
  gender: "",
  registerPin: "",
  confirmPin: "",
};

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState("");
  const [view, setView] = useState("login");
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const nextView = location.state?.defaultView;
    if (nextView === "login" || nextView === "register") {
      setView(nextView);
    }
  }, [location.state]);

  useEffect(() => {
    if (pin.length !== MAX_PIN_LENGTH) {
      return undefined;
    }

    const storedUser = getStoredUser();
    if (!storedUser) {
      setNotice({
        type: "error",
        text: "ยังไม่มีบัญชีบนเครื่องนี้ กรุณาสมัครสมาชิกก่อน",
      });
      setPin("");
      setView("register");
      return undefined;
    }

    setNotice({ type: "info", text: "กำลังตรวจสอบ PIN..." });

    const timer = window.setTimeout(() => {
      if (storedUser.pin !== pin) {
        setNotice({ type: "error", text: "PIN ไม่ถูกต้อง ลองใหม่อีกครั้ง" });
        setPin("");
        return;
      }

      createSession({
        fullName: `${storedUser.firstName} ${storedUser.lastName}`.trim(),
        loggedInAt: new Date().toISOString(),
      });
      navigate("/dashboard");
    }, 450);

    return () => window.clearTimeout(timer);
  }, [navigate, pin]);

  const handleViewChange = (nextView) => {
    setView(nextView);
    setPin("");
    setNotice(null);
    setShowPin(false);
    setShowConfirmPin(false);
  };

  const handleNumberClick = (num) => {
    if (pin.length >= MAX_PIN_LENGTH) {
      return;
    }

    setNotice(null);
    setPin((previousPin) => previousPin + num);
  };

  const handleBackspace = () => {
    setNotice(null);
    setPin((previousPin) => previousPin.slice(0, -1));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (name === "registerPin" || name === "confirmPin") {
      const numericValue = value.replace(/\D/g, "");
      if (numericValue.length <= MAX_PIN_LENGTH) {
        setFormData((previousData) => ({
          ...previousData,
          [name]: numericValue,
        }));
      }
    } else if (name === "age") {
      const numericValue = value.replace(/\D/g, "");
      setFormData((previousData) => ({
        ...previousData,
        age: numericValue,
      }));
    } else {
      setFormData((previousData) => ({
        ...previousData,
        [name]: value,
      }));
    }

    setNotice(null);
  };

  const handleRegisterSubmit = (event) => {
    event.preventDefault();

    const age = Number(formData.age);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setNotice({ type: "error", text: "กรุณากรอกชื่อและนามสกุลให้ครบ" });
      return;
    }

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setNotice({ type: "error", text: "กรุณากรอกอายุให้ถูกต้อง" });
      return;
    }

    if (formData.registerPin.length !== MAX_PIN_LENGTH) {
      setNotice({
        type: "error",
        text: `กรุณาตั้งค่า PIN ให้ครบ ${MAX_PIN_LENGTH} หลัก`,
      });
      return;
    }

    if (formData.registerPin !== formData.confirmPin) {
      setNotice({
        type: "error",
        text: "รหัส PIN ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง",
      });
      return;
    }

    saveUser({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      age,
      gender: formData.gender || "not_specified",
      pin: formData.registerPin,
    });

    setFormData(INITIAL_FORM_DATA);
    setPin("");
    setShowPin(false);
    setShowConfirmPin(false);
    setView("login");
    setNotice({
      type: "success",
      text: "สมัครสมาชิกสำเร็จแล้ว ใส่ PIN เพื่อเข้าสู่ระบบได้เลย",
    });
  };

  const headerContent =
    view === "login"
      ? {
          title: "ยินดีต้อนรับ",
          description: "กรุณาใส่รหัส PIN เพื่อเข้าสู่ระบบ",
        }
      : {
          title: "สมัครสมาชิก",
          description: "กรอกข้อมูลเพื่อสร้างบัญชีสำหรับเข้าใช้งานระบบ",
        };

  return (
    <div className="auth-shell">
      <main className={`auth-main auth-main--${view}`}>
        <AuthHeader {...headerContent} />

        {notice ? (
          <p className={`auth-notice auth-notice--${notice.type}`}>{notice.text}</p>
        ) : null}

        {view === "login" ? (
          <>
            <PinDots length={pin.length} maxLength={MAX_PIN_LENGTH} />
            <NumericKeypad
              onNumberClick={handleNumberClick}
              onBackspace={handleBackspace}
            />
          </>
        ) : (
          <RegisterForm
            formData={formData}
            maxPinLength={MAX_PIN_LENGTH}
            showPin={showPin}
            showConfirmPin={showConfirmPin}
            onInputChange={handleInputChange}
            onSubmit={handleRegisterSubmit}
            onTogglePin={() => setShowPin((currentValue) => !currentValue)}
            onToggleConfirmPin={() =>
              setShowConfirmPin((currentValue) => !currentValue)
            }
          />
        )}
      </main>

      <AuthBottomNav view={view} onViewChange={handleViewChange} />

      <div className="auth-blob" aria-hidden="true">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M45.7,-77.6C58.9,-71.3,69.1,-58.5,76.5,-44.4C83.9,-30.3,88.4,-15.1,88.2,-0.1C87.9,14.9,82.9,29.7,75.2,43.2C67.5,56.7,57.1,68.8,44.1,76.5C31,84.1,15.5,87.2,-0.2,87.6C-15.9,88,-31.8,85.6,-45.8,78.5C-59.8,71.4,-72,59.6,-79.8,45.7C-87.7,31.7,-91.3,15.9,-90.7,0.4C-90.1,-15.1,-85.4,-30.1,-76.8,-43.1C-68.2,-56.1,-55.8,-67,-42.1,-73C-28.4,-78.9,-14.2,-79.9,0.3,-80.5C14.8,-81,29.7,-81.1,45.7,-77.6Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>
    </div>
  );
}

export default AuthPage;
