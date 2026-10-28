import { useRef } from 'react';

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
    <div className="relative! w-[74px]! h-[74px]! shrink-0!">
      <div className="w-full! h-full! rounded-[14px]! [background-color:#ede9fe]! [color:var(--color-slate-800)]! flex! items-center! justify-center! text-[24px]! font-bold! tracking-[0.5px]! select-none!">{initials}</div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="absolute! bottom-[-4px]! right-[-4px]! w-[26px]! h-[26px]! rounded-[6px]! [background-color:var(--color-slate-600)]! [border:2px_solid_var(--color-white)]! flex! items-center! justify-center! cursor-pointer! [box-shadow:0_2px_4px_rgba(0,0,0,0.15)]! [transition:all_0.15s_ease]!"
        title="Change photo"
        aria-label="Change photo"
      >
        <span className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-white)]!"} >
          photo_camera
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden!"
        onChange={handleFileChange}
      />
    </div>
  );
}
