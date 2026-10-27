import { forwardRef } from 'react'

const searchInputClass = 'w-full h-[38px] pl-[36px] pr-[12px] border border-(--color-slate-300) rounded-[8px] text-[13px] outline-none bg-white text-(--color-slate-900)'
const filterSelectClass = 'h-[38px] px-[12px] border border-(--color-slate-300) rounded-[8px] text-[13px] bg-white text-(--color-slate-700) cursor-pointer outline-none'

export const SearchInput = forwardRef(function SearchInput(
  { controlClassName, className = '', style, type = 'text', ...props }, ref,
) {
  return <input ref={ref} type={type} {...props}
    className={`${className} ${controlClassName ?? (style === undefined ? searchInputClass : '')}`} style={style} />
})

export function SearchBar({ value, onChange, placeholder, name, wrapperClassName, iconClassName, inputClassName, className = '', ...inputProps }) {
  return <div className={`${className} ${wrapperClassName ?? 'relative flex-[1_1_260px] max-w-[400px]'}`}>
    <span className={`material-symbols-outlined ${iconClassName ?? 'absolute left-[12px] top-1/2 -translate-y-1/2 text-(--color-slate-400) text-[18px]'}`} aria-hidden="true">search</span>
    <SearchInput name={name} placeholder={placeholder} value={value} onChange={onChange} {...inputProps} controlClassName={inputClassName} />
  </div>
}

export const FilterSelect = forwardRef(function FilterSelect(
  { controlClassName, className = '', style, minWidth, ...props }, ref,
) {
  return <select ref={ref} {...props}
    className={`${className} ${controlClassName ?? (style === undefined ? filterSelectClass : '')}`}
    style={minWidth ? { ...style, minWidth } : style} />
})
