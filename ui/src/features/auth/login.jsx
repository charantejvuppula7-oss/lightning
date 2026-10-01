import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { URLs } from "../../Utils/urls";
import { getRoleDashboard } from "../../Utils/roles";
import lightningLogoLight from "../../../assets/lightning-logo-light.png";

export default function Login() {
  const navigate = useNavigate();

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${URLs}/user/session/`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          navigate(getRoleDashboard(data.Role || data.role), { replace: true });
          return;
        }
      } catch (err) {
        // Ignore session error, show login page
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [navigate]);

  const [formData, setFormData] = useState({
    User_Name: "",
    Password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        const response = await fetch(`${URLs}/user/login/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            User_Name: formData.User_Name,
            Password: formData.Password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Login successful!");
          sessionStorage.setItem("just_logged_in", "true");
          if (data) {
            try {
              sessionStorage.setItem("pm_current_user", JSON.stringify(data));
              localStorage.setItem("pm_current_user", JSON.stringify(data));
            } catch (e) {}
          }
          const dest = getRoleDashboard(data.role || data.Role);
          setTimeout(() => {
            navigate(dest);
          }, 600);
        } else {
          toast.error(data.message || "Login failed");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Login failed");
      } finally {
        setIsLoading(false);
      }
    },
    [formData, navigate],
  );

  if (isCheckingSession) {
    return (
      <div className="login-container" style={styles.container}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className="login-container" style={styles.container}>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--color-slate-50);
        }
        .login-input:focus {
          border-color: #1557d8 !important;
          box-shadow: 0 0 0 3px rgba(21, 87, 216, 0.1);
        }
        .login-link:hover {
          color: #1143a7 !important;
        }
      `}</style>

      {/* Top Left Logo */}
      <div style={styles.logoBox}>
        <img
          src={lightningLogoLight}
          alt="Lightning PDPM"
          style={{ height: "34px", width: "auto", display: "block" }}
        />
      </div>

      {/* Main Login Card */}
      <div style={styles.card}>
        <div style={styles.getStarted}>Get Started</div>
        <h2 style={styles.cardTitle}>Log in to Lightning</h2>
        <p style={styles.cardSubtitle}>
          Enter the User ID and password your project manager gave you.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isLoading && (
            <div style={styles.loadingOverlay}>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <div style={styles.spinner}></div>
            </div>
          )}

          {/* User ID Field */}
          <div style={styles.field}>
            <label style={styles.label}>User ID</label>
            <input
              type="text"
              name="User_Name"
              value={formData.User_Name}
              onChange={handleChange}
              maxLength={100}
              required
              disabled={isLoading}
              className="login-input"
              style={styles.input}
              placeholder="e.g Ravi Kumar"
            />
          </div>

          {/* Password Field */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <span
                onClick={() => navigate("/forgot-password")}
                style={styles.forgotLink}
              >
                Forgot Password?
              </span>
            </div>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                name="Password"
                value={formData.Password}
                onChange={handleChange}
                maxLength={128}
                required
                disabled={isLoading}
                className="login-input"
                style={{ ...styles.input, paddingRight: "56px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.showButton}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" style={styles.submitBtn} disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        {/* Footer Terms */}
        <div style={styles.footerTerms}>
          By continuing you agree to Lightning's{" "}
          <span
            style={styles.footerLink}
            onClick={() => toast.info("Terms of Service")}
          >
            Terms
          </span>{" "}
          and{" "}
          <span
            style={styles.footerLink}
            onClick={() => toast.info("Privacy Notice")}
          >
            Privacy Notice
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "var(--color-slate-50)",
    position: "relative",
    padding: "24px",
    fontFamily: "'Inter', sans-serif",
  },
  logoBox: {
    position: "absolute",
    top: "24px",
    left: "24px",
    display: "flex",
    alignItems: "center",
  },
  card: {
    backgroundColor: "var(--color-white)",
    borderRadius: "20px",
    border: "1px solid var(--color-slate-200)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "460px",
    display: "flex",
    flexDirection: "column",
  },
  getStarted: {
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--color-slate-600)",
  },
  cardTitle: {
    fontSize: "26px",
    fontWeight: "700",
    color: "var(--color-slate-900)",
    marginTop: "8px",
    letterSpacing: "-0.02em",
  },
  cardSubtitle: {
    fontSize: "14px",
    color: "var(--color-slate-500)",
    lineHeight: "1.5",
    marginTop: "8px",
    marginBottom: "28px",
  },
  form: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontWeight: "600",
    fontSize: "14px",
    color: "var(--color-slate-900)",
  },
  forgotLink: {
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--color-slate-900)",
    textDecoration: "underline",
    cursor: "pointer",
  },
  passwordWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    color: "var(--color-slate-900)",
    outline: "none",
    backgroundColor: "var(--color-white)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  showButton: {
    position: "absolute",
    right: "14px",
    background: "none",
    border: "none",
    color: "var(--color-slate-900)",
    fontWeight: "600",
    fontSize: "13.5px",
    cursor: "pointer",
    padding: "4px",
    outline: "none",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#1557d8",
    color: "var(--color-white)",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "12px",
    transition: "background-color 0.15s ease",
  },
  footerTerms: {
    fontSize: "12px",
    color: "var(--color-slate-500)",
    textAlign: "center",
    lineHeight: "1.5",
    marginTop: "24px",
  },
  footerLink: {
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "500",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "10px",
    zIndex: 10,
  },
  spinner: {
    border: "3px solid #f3f3f3",
    borderTop: "3px solid #1557d8",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    animation: "spin 1s linear infinite",
  },
};
