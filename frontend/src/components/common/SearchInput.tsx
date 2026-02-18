import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showKbdHint?: boolean;
}

export interface SearchInputHandle {
  focus: () => void;
}

const SearchInput = forwardRef<SearchInputHandle, Props>(function SearchInput(
  { value, onChange, placeholder = 'Search by name, weapon, or role...', showKbdHint },
  ref,
) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(v: string) {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  }

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="input-imperial w-full rounded-sm py-2 pl-9 pr-14 text-sm text-text-primary placeholder-text-dim outline-none"
      />
      {/* Keyboard shortcut hint */}
      {showKbdHint && !local && !focused && (
        <span className="kbd-hint pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline">
          {navigator.platform?.includes('Mac') ? '\u2318K' : 'Ctrl+K'}
        </span>
      )}
      {local && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim transition-colors hover:text-text-secondary"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});

export default SearchInput;
