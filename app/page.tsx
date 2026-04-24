'use client';

import { useState } from 'react';

const RECIPIENT_OPTIONS = ['Myself', 'Partner', 'Family or Friend'] as const;

export default function HomePage() {
  const [isOpened, setIsOpened] = useState(false);
  const [selectedRecipient, setSelectedRecipient] =
    useState<(typeof RECIPIENT_OPTIONS)[number] | null>(null);

  return (
    <main className="page">
      <div className="background" />

      <section className="hero">
        <div className="headline">
          <p className="eyebrow">NOVORA</p>
          <h1>
            You are not here to choose a piece of jewelry.
            <br />
            You are here to create something that has never existed before.
          </h1>
          <p className="subcopy">
            A recover-first homepage version that keeps the core mood:
            dark luxury, a green envelope, a gold seal, and a letter-like
            interactive start.
          </p>
        </div>

        <div className={`scene ${isOpened ? 'opened' : ''}`}>
          <div className="envelope-shell">
            <div className="envelope-back" />
            <div className="envelope-flap" />
            <button
              type="button"
              className="seal"
              onClick={() => setIsOpened(true)}
              disabled={isOpened}
              aria-label="Open the letter"
            >
              N
            </button>
          </div>

          <div className={`letter ${isOpened ? 'show' : ''}`}>
            <div className="letter-inner">
              <p className="letter-kicker">A private beginning</p>
              <h2>Who is this piece of love meant for?</h2>
              <p className="letter-copy">
                This is where the future full experience starts. For now, this
                page is rebuilt as a clean working foundation so the site can
                deploy successfully and continue development from a stable base.
              </p>

              <div className="options" role="radiogroup" aria-label="Select recipient">
                {RECIPIENT_OPTIONS.map((option) => {
                  const active = selectedRecipient === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`option ${active ? 'active' : ''}`}
                      onClick={() => setSelectedRecipient(option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="footer-row">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setSelectedRecipient(null)}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!selectedRecipient}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        :global(html, body) {
          margin: 0;
          padding: 0;
          background: #050505;
          color: #f6f1e8;
          font-family: Georgia, 'Times New Roman', serif;
        }

        :global(*) {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 20% 15%, rgba(197, 159, 74, 0.14), transparent 24%),
            radial-gradient(circle at 82% 20%, rgba(197, 159, 74, 0.12), transparent 20%),
            radial-gradient(circle at 75% 70%, rgba(197, 159, 74, 0.08), transparent 22%),
            linear-gradient(135deg, #030303 0%, #0a0a0a 48%, #050505 100%);
        }

        .background {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.45;
          background-image:
            linear-gradient(115deg, transparent 0 42%, rgba(201, 164, 88, 0.16) 42.3%, transparent 43.1%),
            linear-gradient(72deg, transparent 0 61%, rgba(201, 164, 88, 0.14) 61.3%, transparent 62.1%),
            linear-gradient(25deg, transparent 0 83%, rgba(201, 164, 88, 0.12) 83.2%, transparent 84%);
        }

        .hero {
          position: relative;
          z-index: 1;
          width: min(1200px, calc(100vw - 40px));
          margin: 0 auto;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 36px;
          align-items: center;
          padding: 48px 0;
        }

        .headline {
          padding: 12px 8px;
        }

        .eyebrow {
          margin: 0 0 14px;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: #c5a35a;
          font-size: 12px;
        }

        h1 {
          margin: 0;
          font-size: clamp(34px, 4vw, 58px);
          line-height: 1.08;
          font-weight: 600;
          max-width: 760px;
        }

        .subcopy {
          margin: 22px 0 0;
          max-width: 620px;
          color: rgba(246, 241, 232, 0.78);
          font-size: 17px;
          line-height: 1.7;
        }

        .scene {
          position: relative;
          min-height: 700px;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1200px;
        }

        .envelope-shell {
          width: min(520px, 92vw);
          aspect-ratio: 1.42 / 1;
          position: relative;
          filter: drop-shadow(0 35px 60px rgba(0, 0, 0, 0.55));
          transition: transform 0.75s ease, opacity 0.75s ease;
          z-index: 2;
        }

        .scene.opened .envelope-shell {
          transform: translateY(160px) scale(0.9);
          opacity: 0.18;
        }

        .envelope-back {
          position: absolute;
          inset: 0;
          border-radius: 22px;
          background:
            linear-gradient(145deg, #214538 0%, #17362c 45%, #10261f 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -18px 28px rgba(0, 0, 0, 0.18);
          overflow: hidden;
        }

        .envelope-back::before,
        .envelope-back::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            transparent 0 49.7%,
            rgba(0, 0, 0, 0.2) 49.9%,
            transparent 50.1%
          );
          opacity: 0.7;
        }

        .envelope-back::after {
          transform: scaleX(-1);
        }

        .envelope-flap {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 58%;
          clip-path: polygon(0 0, 100% 0, 50% 100%);
          border-radius: 22px 22px 0 0;
          transform-origin: top center;
          transition: transform 0.95s ease;
          background:
            linear-gradient(145deg, #2a5847 0%, #1c4336 58%, #143228 100%);
          box-shadow: inset 0 -16px 24px rgba(0, 0, 0, 0.16);
          z-index: 3;
        }

        .scene.opened .envelope-flap {
          transform: rotateX(176deg);
        }

        .seal {
          position: absolute;
          left: 50%;
          top: 48%;
          transform: translate(-50%, -50%);
          width: 92px;
          height: 92px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-size: 34px;
          font-weight: 700;
          color: #7b4f08;
          background:
            radial-gradient(circle at 30% 30%, #ffdd8d 0%, #cf9f37 48%, #8c5e10 100%);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.32),
            inset 0 2px 4px rgba(255, 255, 255, 0.36),
            inset 0 -8px 14px rgba(87, 54, 5, 0.36);
          transition: transform 0.22s ease, opacity 0.3s ease;
          z-index: 4;
        }

        .seal:hover:not(:disabled) {
          transform: translate(-50%, -50%) scale(1.04);
        }

        .seal:disabled {
          cursor: default;
          opacity: 0;
          pointer-events: none;
        }

        .letter {
          position: absolute;
          width: min(600px, 96vw);
          min-height: 620px;
          padding: 18px;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(244, 237, 225, 0.96), rgba(233, 224, 208, 0.98));
          color: #2e2419;
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          transform: translateY(80px) scale(0.88);
          opacity: 0;
          pointer-events: none;
          transition: transform 0.85s ease, opacity 0.85s ease;
          z-index: 1;
        }

        .letter.show {
          transform: translateY(0) scale(1);
          opacity: 1;
          pointer-events: auto;
        }

        .letter-inner {
          min-height: 100%;
          border: 1px solid rgba(122, 92, 45, 0.18);
          border-radius: 18px;
          padding: 34px 30px 28px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08));
        }

        .letter-kicker {
          margin: 0 0 12px;
          font-size: 12px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8b6a37;
        }

        h2 {
          margin: 0;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1.14;
        }

        .letter-copy {
          margin: 18px 0 28px;
          color: rgba(46, 36, 25, 0.78);
          line-height: 1.75;
          font-size: 16px;
        }

        .options {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .option {
          min-height: 72px;
          padding: 16px 14px;
          border-radius: 16px;
          border: 1px solid rgba(138, 111, 65, 0.22);
          background: rgba(255, 252, 246, 0.72);
          color: #2e2419;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .option:hover {
          transform: translateY(-2px);
          border-color: rgba(181, 139, 65, 0.5);
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.08);
        }

        .option.active {
          background: linear-gradient(180deg, #2d5748 0%, #18362b 100%);
          color: #f8f1e7;
          border-color: transparent;
          box-shadow: 0 16px 30px rgba(24, 54, 43, 0.28);
        }

        .footer-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          margin-top: 28px;
        }

        .ghost,
        .primary {
          min-width: 132px;
          height: 48px;
          padding: 0 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        .ghost {
          border: 1px solid rgba(138, 111, 65, 0.28);
          background: transparent;
          color: #5b4630;
        }

        .primary {
          border: none;
          background: linear-gradient(180deg, #cba257 0%, #9b6f28 100%);
          color: #fffaf2;
          box-shadow: 0 12px 24px rgba(155, 111, 40, 0.28);
        }

        .primary:disabled {
          cursor: not-allowed;
          opacity: 0.45;
          box-shadow: none;
        }

        .ghost:hover,
        .primary:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        @media (max-width: 980px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 18px;
            padding-top: 34px;
            padding-bottom: 34px;
          }

          .headline {
            text-align: center;
          }

          .subcopy {
            margin-left: auto;
            margin-right: auto;
          }

          .scene {
            min-height: 760px;
          }
        }

        @media (max-width: 720px) {
          .options {
            grid-template-columns: 1fr;
          }

          .letter {
            min-height: auto;
          }

          .letter-inner {
            padding: 26px 20px 22px;
          }

          .footer-row {
            flex-direction: column;
          }

          .ghost,
          .primary {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
