import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { URLs } from "../../Utils/urls";
import lightningLogoLight from "../../../assets/lightning-logo-light.png";

export default function ForgotPassword({ mode: propMode }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine mode: "forgot" | "verify" | "reset"
  const mode =
    propMode ||
    (location.pathname.includes("verify")
      ? "verify"
      : location.pathname.includes("reset")
      ? "reset"
      : "forgot");

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Forgot Password (Request OTP) State
  // ─────────────────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState("");

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Verify Identity State
  // ─────────────────────────────────────────────────────────────────────────────
  const stateUserId = location.state?.userId || userId || "";
  const maskedEmail =
    location.state?.maskedEmail ||
    (stateUserId ? `${stateUserId[0].toLowerCase()}••••@company.com` : "••••@company.com");

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];
  const [timeLeft, setTimeLeft] = useState(59);
  const [canResend, setCanResend] = useState(false);

  // Resend Countdown Timer
  useEffect(() => {
    if (mode !== "verify") return;
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, mode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Reset Password State
  // ─────────────────────────────────────────────────────────────────────────────
  const resetToken = location.state?.resetToken || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checks, setChecks] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });
  const [strength, setStrength] = useState("Weak"); // Weak, Medium, Strong

  // Redirect if arrived on reset step without a valid verification token
  useEffect(() => {
    if (mode === "reset" && !resetToken) {
      toast.error("Invalid reset session. Please request a new verification code.");
      navigate("/forgot-password", { replace: true });
    }
  }, [mode, resetToken, navigate]);

  // Evaluate Password Requirements in Real-Time (Reset Mode)
  useEffect(() => {
    if (mode !== "reset") return;

    const lengthMet = password.length >= 8;
    const uppercaseMet = /[A-Z]/.test(password);
    const numberMet = /[0-9]/.test(password);
    const specialMet = /[^A-Za-z0-9]/.test(password);

    setChecks({
      length: lengthMet,
      uppercase: uppercaseMet,
      number: numberMet,
      special: specialMet,
    });

    const count = [lengthMet, uppercaseMet, numberMet, specialMet].filter(Boolean).length;

    if (count <= 1) {
      setStrength("Weak");
    } else if (count === 4) {
      setStrength("Strong");
    } else {
      setStrength("Medium");
    }
  }, [password, mode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Shared Submitting State
  // ─────────────────────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 HANDLER: Request OTP
  // ─────────────────────────────────────────────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    const identifier = userId.trim();
    if (!identifier) {
      toast.error("Please enter your User ID or Email");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${URLs}/user/password-reset/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: identifier }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Verification code sent successfully!");
        const payload = data.data || {};
        navigate("/verify-identity", {
          state: {
            userId: payload.user_id || identifier,
            maskedEmail: payload.masked_email || "",
          },
        });
      } else {
        toast.error(data.message || "Unable to send verification code. Please check your details.");
      }
    } catch (err) {
      toast.error("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2 HANDLERS: Code input & OTP Verify
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCodeChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = "";
        setCode(newCode);
        inputRefs[index - 1].current.focus();
      } else {
        const newCode = [...code];
        newCode[index] = "";
        setCode(newCode);
      }
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    if (!stateUserId) {
      toast.error("Session expired. Please request a new code.");
      navigate("/forgot-password");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${URLs}/user/password-reset/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: stateUserId,
          otp_code: fullCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.reset_token) {
        toast.success(data.message || "Code verified successfully!");
        navigate("/reset-password", {
          state: {
            userId: stateUserId,
            resetToken: data.reset_token,
          },
        });
      } else {
        toast.error(data.message || "Invalid or expired verification code");
      }
    } catch (err) {
      toast.error("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !stateUserId) return;

    try {
      const response = await fetch(`${URLs}/user/password-reset/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: stateUserId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("New verification code has been dispatched!");
        setTimeLeft(59);
        setCanResend(false);
        setCode(["", "", "", "", "", ""]);
        inputRefs[0]?.current?.focus();
      } else {
        toast.error(data.message || "Failed to resend code");
      }
    } catch (err) {
      toast.error("Network error while requesting new code.");
    }
  };

  const formatTime = (seconds) => {
    const min = String(Math.floor(seconds / 60)).padStart(2, "0");
    const sec = String(seconds % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3 HANDLER: Confirm New Password
  // ─────────────────────────────────────────────────────────────────────────────
  const handleResetSubmit = async (e) => {
    e.preventDefault();

    const allMet = Object.values(checks).every(Boolean);
    if (!allMet) {
      toast.error("Please meet all password requirements before updating.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!resetToken) {
      toast.error("Missing reset session token. Please restart verification.");
      navigate("/forgot-password");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${URLs}/user/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Password updated successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1200);
      } else {
        toast.error(data.message || "Failed to update password. Please try again.");
      }
    } catch (err) {
      toast.error("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--color-white);
        }
        .login-input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .code-input:focus {
          border-color: var(--color-primary) !important;
          background-color: var(--color-white) !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .text-link:hover {
          color: var(--color-primary-hover) !important;
        }
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 20px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }
      `}</style>

      {/* Large faint background watermark */}
      <div style={mode === "forgot" ? styles.bgWatermarkForgot : styles.bgWatermarkRight}>
        <svg width="220" height="220" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="var(--color-slate-100)" stroke="var(--color-slate-100)" strokeWidth="1" />
        </svg>
      </div>

      {/* Top Left Logo */}
      <div style={styles.logoHeader}>
        <img
          src={lightningLogoLight}
          alt="Lightning PDPM"
          style={{ height: "30px", width: "auto", display: "block" }}
        />
      </div>

      {/* Auth Card */}
      <div style={styles.card}>
        {/* Top Lock Icon (Only on Verify) */}
        {mode === "verify" && (
          <div style={styles.iconContainer}>
            <div style={styles.iconCircle}>
              <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: "22px" }}>
                lock
              </span>
            </div>
          </div>
        )}

        <h2 style={mode === "verify" ? styles.cardTitleVerify : styles.cardTitle}>
          {mode === "forgot" && "Forgot your password?"}
          {mode === "verify" && "Verify your identity"}
          {mode === "reset" && "Create a new password"}
        </h2>

        <p style={styles.cardSubtitle}>
          {mode === "forgot" && "Enter your User ID and we’ll send a verification code to reset your password."}
          {mode === "verify" && (
            <>
              We’ve sent a 6-digit verification code to your registered email address.<br />
              <strong style={{ color: "var(--color-slate-900)", fontSize: "14px", fontWeight: "700" }}>
                {maskedEmail}
              </strong>
            </>
          )}
          {mode === "reset" && "Choose a strong password for your Lightning account."}
        </p>

        {/* ── STEP 1: Forgot Password Form ── */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>User ID</label>
              <div style={styles.inputWrapper}>
                <span className="material-symbols-outlined" style={styles.inputIcon}>
                  person
                </span>
                <input
                  type="text"
                  name="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your User ID"
                  disabled={isSubmitting}
                  className="login-input"
                  style={styles.inputWithLeftIcon}
                  required
                />
              </div>
            </div>

            <button type="submit" style={styles.submitBtnForgot} disabled={isSubmitting}>
              <span>{isSubmitting ? "Sending..." : "Send Verification Code"}</span>
              {!isSubmitting && (
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  arrow_forward
                </span>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: Verify Identity Form ── */}
        {mode === "verify" && (
          <>
            <form onSubmit={handleVerify} style={styles.formVerify}>
              <div style={styles.codeInputsRow}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="code-input"
                    style={styles.codeInputBox}
                    placeholder="-"
                  />
                ))}
              </div>

              <button type="submit" style={styles.submitBtnReset} disabled={isSubmitting}>
                <span>{isSubmitting ? "Verifying..." : "Verify Code"}</span>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  arrow_forward
                </span>
              </button>
            </form>

            <div style={styles.resendSection}>
              <div style={styles.resendText}>
                Didn't receive the code?{" "}
                <span
                  className="text-link"
                  style={{
                    color: canResend ? "var(--color-primary)" : "var(--color-slate-400)",
                    fontWeight: "600",
                    cursor: canResend ? "pointer" : "not-allowed",
                    textDecoration: canResend ? "underline" : "none",
                  }}
                  onClick={handleResend}
                >
                  Resend code
                </span>
              </div>

              {!canResend && (
                <div style={styles.timerDisplay}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--color-slate-500)" }}>
                    schedule
                  </span>
                  <span>Resend code in {formatTime(timeLeft)}</span>
                </div>
              )}
            </div>

            <div style={styles.backLinkRowVerify} onClick={() => navigate("/forgot-password")}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--color-slate-500)" }}>
                arrow_back
              </span>
              <span style={styles.backLinkTextVerify}>Back</span>
            </div>

            <div style={styles.alertBox}>
              <span className="material-symbols-outlined" style={styles.alertIcon}>security</span>
              <span style={styles.alertText}>
                Never share your verification code with anyone. Our support team will never ask for it.
              </span>
            </div>
          </>
        )}

        {/* ── STEP 3: Reset Password Form ── */}
        {mode === "reset" && (
          <form onSubmit={handleResetSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>New password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="login-input"
                  style={styles.inputWithRightIcon}
                  required
                />
                <span
                  className="material-symbols-outlined"
                  style={styles.eyeIcon}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Confirm new password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="login-input"
                  style={styles.inputWithRightIcon}
                  required
                />
                <span
                  className="material-symbols-outlined"
                  style={styles.eyeIcon}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "visibility" : "visibility_off"}
                </span>
              </div>
            </div>

            <div style={styles.strengthMeter}>
              <div style={styles.strengthLabelRow}>
                <span style={styles.strengthLabel}>Password strength</span>
                <span
                  style={{
                    ...styles.strengthStatus,
                    color:
                      strength === "Weak"
                        ? "var(--color-danger)"
                        : strength === "Medium"
                        ? "var(--color-primary)"
                        : "var(--color-success-alt)",
                  }}
                >
                  {strength}
                </span>
              </div>

              <div style={styles.strengthSegments}>
                <div
                  style={{
                    ...styles.segment,
                    backgroundColor:
                      password.length > 0
                        ? strength === "Weak"
                          ? "var(--color-danger)"
                          : strength === "Medium"
                          ? "var(--color-primary)"
                          : "var(--color-success-alt)"
                        : "var(--color-slate-300)",
                  }}
                />
                <div
                  style={{
                    ...styles.segment,
                    backgroundColor:
                      (strength === "Medium" || strength === "Strong") && password.length > 0
                        ? strength === "Medium"
                          ? "var(--color-primary)"
                          : "var(--color-success-alt)"
                        : "var(--color-slate-300)",
                  }}
                />
                <div
                  style={{
                    ...styles.segment,
                    backgroundColor:
                      strength === "Strong" && password.length > 0 ? "var(--color-success-alt)" : "var(--color-slate-300)",
                  }}
                />
              </div>
            </div>

            <div style={styles.checklistCard}>
              <div style={styles.checkRow}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    ...styles.checkIcon,
                    color: checks.length ? "var(--color-primary)" : "var(--color-slate-300)",
                  }}
                >
                  {checks.length ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span style={{ ...styles.checkText, color: checks.length ? "var(--color-slate-900)" : "var(--color-slate-500)" }}>
                  At least 8 characters
                </span>
              </div>

              <div style={styles.checkRow}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    ...styles.checkIcon,
                    color: checks.uppercase ? "var(--color-primary)" : "var(--color-slate-300)",
                  }}
                >
                  {checks.uppercase ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span style={{ ...styles.checkText, color: checks.uppercase ? "var(--color-slate-900)" : "var(--color-slate-500)" }}>
                  One uppercase letter
                </span>
              </div>

              <div style={styles.checkRow}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    ...styles.checkIcon,
                    color: checks.number ? "var(--color-primary)" : "var(--color-slate-300)",
                  }}
                >
                  {checks.number ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span style={{ ...styles.checkText, color: checks.number ? "var(--color-slate-900)" : "var(--color-slate-500)" }}>
                  One number
                </span>
              </div>

              <div style={styles.checkRow}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    ...styles.checkIcon,
                    color: checks.special ? "var(--color-primary)" : "var(--color-slate-300)",
                  }}
                >
                  {checks.special ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span style={{ ...styles.checkText, color: checks.special ? "var(--color-slate-900)" : "var(--color-slate-500)" }}>
                  One special character
                </span>
              </div>
            </div>

            <button type="submit" style={styles.submitBtnReset} disabled={isSubmitting}>
              <span>Update Password</span>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                arrow_forward
              </span>
            </button>
          </form>
        )}

        {/* Back to Login (Only on Forgot Password) */}
        {mode === "forgot" && (
          <div style={styles.backLinkRow} onClick={() => navigate("/login")}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--color-primary)" }}>
              arrow_back
            </span>
            <span style={styles.backLinkText}>Back to Log In</span>
          </div>
        )}
      </div>

      {/* Under card help text */}
      <div style={styles.helpText}>
        Need help signing in?{" "}
        <span
          className="text-link"
          style={styles.adminLink}
          onClick={() => toast.info("Please contact your system administrator at admin@lightning.com")}
        >
          Contact your administrator
        </span>
      </div>

      {/* Footer copyright (On Forgot and Verify) */}
      {mode !== "reset" && (
        <div style={styles.footerCopyright}>
          <div style={{ marginBottom: "8px" }}>© 2024 Lightning SaaS. All rights reserved.</div>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <span style={styles.footerLink} onClick={() => toast.info("Privacy Policy")}>
              Privacy Policy
            </span>
            <span style={styles.footerLink} onClick={() => toast.info("Terms of Service")}>
              Terms of Service
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function VerifyIdentity(props) {
  return <ForgotPassword {...props} mode="verify" />;
}

export function ResetPassword(props) {
  return <ForgotPassword {...props} mode="reset" />;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "var(--color-white)",
    position: "relative",
    padding: "32px 24px",
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden",
  },
  bgWatermarkForgot: {
    position: "absolute",
    left: "-40px",
    top: "10%",
    zIndex: 1,
    opacity: 0.8,
    pointerEvents: "none",
  },
  bgWatermarkRight: {
    position: "absolute",
    right: "-40px",
    top: "5%",
    zIndex: 1,
    opacity: 0.8,
    pointerEvents: "none",
  },
  logoHeader: {
    position: "absolute",
    top: "24px",
    left: "24px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    zIndex: 10,
    userSelect: "none",
  },
  logoText: {
    fontWeight: "700",
    fontSize: "14px",
    color: "var(--color-slate-900)",
  },
  card: {
    backgroundColor: "var(--color-white)",
    borderRadius: "20px",
    border: "1px solid var(--color-slate-200)",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "460px",
    display: "flex",
    flexDirection: "column",
    zIndex: 5,
    boxShadow: "0 1px 3px rgba(0,0,0,0.01)",
  },
  iconContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
  },
  iconCircle: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    backgroundColor: "var(--color-primary-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "var(--color-slate-900)",
    textAlign: "center",
    letterSpacing: "-0.01em",
  },
  cardTitleVerify: {
    fontSize: "22px",
    fontWeight: "700",
    color: "var(--color-slate-900)",
    textAlign: "center",
    letterSpacing: "-0.01em",
  },
  cardSubtitle: {
    fontSize: "14.5px",
    color: "var(--color-slate-600)",
    lineHeight: "1.5",
    textAlign: "center",
    marginTop: "8px",
    marginBottom: "28px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formVerify: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontWeight: "600",
    fontSize: "13.5px",
    color: "var(--color-slate-900)",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--color-slate-500)",
  },
  eyeIcon: {
    position: "absolute",
    right: "14px",
    color: "var(--color-slate-500)",
    cursor: "pointer",
    userSelect: "none",
  },
  inputWithLeftIcon: {
    width: "100%",
    padding: "12px 14px 12px 42px",
    fontSize: "14px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    color: "var(--color-slate-900)",
    outline: "none",
    backgroundColor: "var(--color-white)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  inputWithRightIcon: {
    width: "100%",
    padding: "12px 42px 12px 14px",
    fontSize: "14px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    color: "var(--color-slate-900)",
    outline: "none",
    backgroundColor: "var(--color-white)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  codeInputsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: "10px",
    justifyContent: "center",
  },
  codeInputBox: {
    height: "46px",
    width: "100%",
    borderRadius: "8px",
    border: "1px solid var(--color-slate-300)",
    backgroundColor: "var(--color-slate-50)",
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "600",
    color: "var(--color-slate-900)",
    outline: "none",
    transition: "border-color 0.2s, background-color 0.2s, box-shadow 0.2s",
  },
  strengthMeter: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "4px",
  },
  strengthLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  strengthLabel: {
    fontSize: "12.5px",
    color: "var(--color-slate-500)",
    fontWeight: "500",
  },
  strengthStatus: {
    fontSize: "12.5px",
    fontWeight: "600",
  },
  strengthSegments: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    height: "6px",
    marginTop: "2px",
  },
  segment: {
    borderRadius: "2px",
    transition: "background-color 0.25s ease",
  },
  checklistCard: {
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    backgroundColor: "var(--color-white)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  checkIcon: {
    fontSize: "18px",
    flexShrink: 0,
    transition: "color 0.2s",
  },
  checkText: {
    fontSize: "13px",
    fontWeight: "500",
    transition: "color 0.2s",
  },
  submitBtnForgot: {
    width: "100%",
    padding: "14px",
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background-color 0.15s ease",
  },
  submitBtnReset: {
    width: "100%",
    padding: "14px",
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    border: "none",
    borderRadius: "8px",
    fontSize: "14.5px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background-color 0.15s ease",
  },
  resendSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    marginTop: "20px",
  },
  resendText: {
    fontSize: "13.5px",
    color: "var(--color-slate-600)",
  },
  timerDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12.5px",
    color: "var(--color-slate-500)",
  },
  backLinkRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginTop: "24px",
    cursor: "pointer",
    userSelect: "none",
  },
  backLinkText: {
    fontSize: "13.5px",
    fontWeight: "600",
    color: "var(--color-primary)",
  },
  backLinkRowVerify: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginTop: "20px",
    cursor: "pointer",
    userSelect: "none",
  },
  backLinkTextVerify: {
    fontSize: "13.5px",
    fontWeight: "600",
    color: "var(--color-slate-500)",
  },
  alertBox: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    backgroundColor: "var(--color-primary-subtle)",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid var(--color-primary-border-mid)",
    marginTop: "28px",
  },
  alertIcon: {
    color: "var(--color-primary)",
    fontSize: "18px",
    flexShrink: 0,
    marginTop: "2px",
  },
  alertText: {
    fontSize: "11.5px",
    color: "var(--color-primary-active)",
    lineHeight: "1.4",
  },
  helpText: {
    fontSize: "13px",
    color: "var(--color-slate-600)",
    marginTop: "32px",
    zIndex: 5,
  },
  adminLink: {
    color: "var(--color-primary)",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "none",
  },
  footerCopyright: {
    fontSize: "12px",
    color: "var(--color-slate-500)",
    textAlign: "center",
    marginTop: "48px",
    zIndex: 5,
  },
  footerLink: {
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "500",
  },
};
