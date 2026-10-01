import React, { useRef } from 'react';

const styles = {
  avatarContainer: {
    position: 'relative',
    width: '74px',
    height: '74px',
    flexShrink: 0,
  },
  avatarInitials: {
    width: '100%',
    height: '100%',
    borderRadius: '14px',
    backgroundColor: '#ede9fe',
    color: 'var(--color-slate-800)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    userSelect: 'none',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    backgroundColor: 'var(--color-slate-600)',
    border: '2px solid var(--color-white)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    transition: 'all 0.15s ease',
  },
};

export default function ProfileAvatar({ initials = '??', onPhotoChange }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onPhotoChange) {
        onPhotoChange(e.target.files[0]);
      }
    }
  };

  return (
    <div style={styles.avatarContainer}>
      <div style={styles.avatarInitials}>{initials}</div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={styles.cameraBtn}
        title="Change photo"
        aria-label="Change photo"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-white)' }}>
          photo_camera
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
