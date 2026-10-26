import { useState } from "react";
import TaskReview from "./taskreview.jsx";

const styles = `
  .review-button {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 48px; padding: 10px 24px; border: 0; border-radius: 8px;
    font: 600 15px/1.25 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer; transition: background-color .18s ease, color .18s ease, transform .12s ease;
  }
  .review-button:active:not(:disabled) { transform: scale(.985); }
  .review-button:focus-visible { outline: 3px solid rgba(124, 58, 237, .35); outline-offset: 2px; }
  .review-button:disabled { cursor: not-allowed; }
  .review-button--send { background: #1157ce; color: #fff; }
  .review-button--send:hover:not(:disabled) { background: #4a84e7; }
  .review-button--resend { background: #4a84e7; color: #fff; }
  .review-button--resend:hover:not(:disabled) { background: #1157ce; }
  .review-button--sent { background: #d9d9d9; color: #242424; }
  .review-button--reopen { background: #4a84e7; color: #fff; }
  .review-button--reopen:hover:not(:disabled) { background: #1157ce; color: #fff; }
  .review-button--reopen-secondary { background: #d9d9d9; color: #242424; }
  .review-button--reopen-secondary:hover:not(:disabled) { background: #4a84e7; color: #fff; }
  .review-button--reopened { background: #1157ce; color: #fff; }
`;

export default function ReviewButton({
  variant = "send",
  state,
  children,
  disabled = false,
  onClick,
  className = "",
  task = null,
  onReviewSubmit = null,
  showModal = false,
  ...props
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const resolvedState = state || "default";
  const label = children || (variant === "reopen" ? (resolvedState === "reopened" ? "Reopened" : "Reopen") : (resolvedState === "sent" ? "Sent for review" : "Send for review"));

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
    if (showModal || onReviewSubmit) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <button
        type="button"
        className={`review-button review-button--${resolvedState === "default" ? variant : resolvedState} ${className}`.trim()}
        disabled={disabled || resolvedState === "sent" || resolvedState === "reopened"}
        onClick={handleClick}
        {...props}
      >
        {label}
      </button>

      {(showModal || onReviewSubmit) && (
        <TaskReview
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          task={task}
          onSubmit={async (reviewData) => {
            if (onReviewSubmit) {
              await onReviewSubmit(reviewData);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
}
