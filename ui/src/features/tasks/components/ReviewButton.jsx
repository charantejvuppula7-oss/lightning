import { useState } from "react";
import TaskReview from "./taskreview.jsx";

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
