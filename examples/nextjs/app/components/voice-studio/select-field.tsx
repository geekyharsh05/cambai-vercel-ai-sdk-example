import { languageLabel, type CatalogLanguage } from "@/lib/voice-catalog";

export interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  languages: CatalogLanguage[];
  disabled: boolean;
  onChange: (value: string) => void;
}

export function SelectField({
  id,
  label,
  value,
  languages,
  disabled,
  onChange,
}: SelectFieldProps) {
  return (
    <label className="selectField" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        {languages.length === 0 ? (
          <option value="">Loading languages…</option>
        ) : null}
        {languages.map((language) => (
          <option key={language.id} value={language.locale}>
            {languageLabel(language.name)}
          </option>
        ))}
      </select>
    </label>
  );
}
