import { useState, useRef, useEffect } from 'react';
import { IconChevronDown } from './AdminIcons';

const COMMON_MEDIA_OPTIONS = [
  'Cat minyak di atas kanvas',
  'Cat akrilik di atas kanvas',
  'Cat minyak di atas linen',
  'Cat minyak & akrilik di atas kanvas',
  'Media campuran di atas kanvas',
  'Cat air di atas kertas',
  'Arang & pensil di atas kertas',
];

export default function MediumCombobox({
  id = 'karya-medium',
  label = 'Medium',
  options = COMMON_MEDIA_OPTIONS,
  placeholder = 'Pilih atau ketik medium...',
  listboxLabel = 'Pilihan medium umum',
  value,
  error = '',
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [filterByInput, setFilterByInput] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOut = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setFilterByInput(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setFilterByInput(false);
      }
    };
    document.addEventListener('mousedown', handleOut);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOut);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const filtered = filterByInput
    ? options.filter(
        (opt) => !value || opt.toLowerCase().includes(value.toLowerCase()) || opt === value
      )
    : options;
  const optionsToShow = filtered.length > 0 ? filtered : options;

  return (
    <div className="admin-field" ref={wrapRef}>
      <label htmlFor={id} className="admin-label">
        {label}
      </label>

      <div className="admin-combobox">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          className={`admin-input admin-input--combo ${error ? 'is-error' : ''}`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setFilterByInput(true);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setFilterByInput(false);
            setOpen(true);
          }}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <button
          type="button"
          className="admin-combo-toggle"
          onClick={() => {
            setFilterByInput(false);
            setOpen((prev) => !prev);
          }}
          aria-label={open ? `Tutup pilihan ${label.toLowerCase()}` : `Tampilkan pilihan ${label.toLowerCase()}`}
          aria-expanded={open}
        >
          <IconChevronDown size={15} />
        </button>

        {open && (
          <ul
            id={`${id}-listbox`}
            role="listbox"
            className="admin-combo-menu"
            aria-label={listboxLabel}
          >
            {optionsToShow.map((option) => (
              <li key={option} role="option" aria-selected={value === option}>
                <button
                  type="button"
                  className={`admin-combo-option ${value === option ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(option);
                    setFilterByInput(false);
                    setOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p id={`${id}-err`} className="admin-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

