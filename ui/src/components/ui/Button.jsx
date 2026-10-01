export default function Button({ type = 'button', disabled, loading, children, loadingText, className, style, onClick }) {
  return <button type={type} disabled={disabled || loading} aria-busy={loading} className={className} style={style} onClick={onClick}>{loading ? loadingText || children : children}</button>
}
