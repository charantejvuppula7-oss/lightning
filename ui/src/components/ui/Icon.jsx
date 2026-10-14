const paths = {
  person: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  arrow_forward: <path d="M4 12h16m-6-6 6 6-6 6" />,
  arrow_back: <path d="M20 12H4m6-6-6 6 6 6" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  security: <><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  schedule: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  visibility: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></>,
  visibility_off: <><path d="M3 3 21 21M10 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3.1 3.6M6.1 8.1A16 16 0 0 0 2 12s3.5 6 10 6a11 11 0 0 0 3.2-.5" /></>,
  check_circle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  radio_button_unchecked: <circle cx="12" cy="12" r="9" />,
}

export default function Icon({ name, size = 20, style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', flexShrink: 0, ...style }} aria-hidden="true">{paths[name]}</svg>
}
