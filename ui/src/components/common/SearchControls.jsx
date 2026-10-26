import { forwardRef } from "react";

const searchInputStyle = {
  width: "100%",
  height: "38px",
  paddingLeft: "36px",
  paddingRight: "12px",
  border: "1px solid var(--color-slate-300)",
  borderRadius: "8px",
  fontSize: "13px",
  outline: "none",
  backgroundColor: "var(--color-white)",
  color: "var(--color-slate-900)",
};

const filterSelectStyle = {
  height: "38px",
  padding: "0 12px",
  border: "1px solid var(--color-slate-300)",
  borderRadius: "8px",
  fontSize: "13px",
  backgroundColor: "var(--color-white)",
  color: "var(--color-slate-700)",
  cursor: "pointer",
  outline: "none",
};

const searchWrapperStyle = {
  position: "relative",
  flex: "1 1 260px",
  maxWidth: "400px",
};

const searchIconStyle = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--color-slate-400)",
  fontSize: "18px",
};

/** Text input for search fields; a supplied style is used exactly as authored. */
export const SearchInput = forwardRef(function SearchInput(
  { style, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      {...props}
      style={style === undefined ? searchInputStyle : style}
    />
  );
});

/** Search icon and input used together in page filter bars. */
export function SearchBar({
  value,
  onChange,
  placeholder,
  name,
  wrapperStyle,
  iconStyle,
  inputStyle,
  className,
  ...inputProps
}) {
  return (
    <div
      className={className}
      style={wrapperStyle === undefined ? searchWrapperStyle : wrapperStyle}
    >
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={iconStyle === undefined ? searchIconStyle : iconStyle}
      >
        search
      </span>
      <SearchInput
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...inputProps}
        style={inputStyle}
      />
    </div>
  );
}

/** Select control for filters; style overrides preserve each page's existing geometry. */
export const FilterSelect = forwardRef(function FilterSelect(
  { style, minWidth, ...props },
  ref,
) {
  const selectStyle = style === undefined ? filterSelectStyle : style;
  return (
    <select
      ref={ref}
      {...props}
      style={minWidth ? { ...selectStyle, minWidth } : selectStyle}
    />
  );
});
