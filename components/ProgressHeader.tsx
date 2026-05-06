import styles from './ProgressHeader.module.css';

type ProgressHeaderProps = {
  currentStep: 1 | 2 | 3;
};

const steps = ['Design Brief', 'Concept Sketch', 'Professional CAD'];

export default function ProgressHeader({ currentStep }: ProgressHeaderProps) {
  return (
    <div className={styles.wrap} aria-label="Design progress">
      {steps.map((label, index) => {
        const step = index + 1;
        const state = step < currentStep ? 'done' : step === currentStep ? 'current' : 'upcoming';
        return (
          <div key={label} className={styles.item}>
            <div className={`${styles.dot} ${styles[state]}`}>{step}</div>
            <div>
              <p className={styles.kicker}>Step {step}</p>
              <p className={styles.label}>{label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
