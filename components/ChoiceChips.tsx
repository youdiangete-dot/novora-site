import styles from './ChoiceChips.module.css';

type ChoiceChipsProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

export default function ChoiceChips({ label, options, value, onChange }: ChoiceChipsProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend>{label}</legend>
      <div className={styles.group}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.chip} ${value === option ? styles.active : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
