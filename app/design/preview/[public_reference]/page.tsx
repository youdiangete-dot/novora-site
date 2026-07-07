import Link from 'next/link';

import {
  createMockNovoraPreviewGenerationResult,
  NOVORA_PREVIEW_LIFECYCLE_STATES,
  type NovoraPreviewGenerationMockLifecycleState,
  type NovoraPreviewGenerationMockResult,
} from '../../../../lib/server/ai-sketch/preview-generation';
import sharedStyles from '../../brief/brief.module.css';
import styles from './preview.module.css';

type PreviewState = NovoraPreviewGenerationMockLifecycleState;

type PreviewLocale = 'en' | 'zh-Hant';

type PreviewPageProps = {
  params: Promise<{
    public_reference: string;
  }>;
  searchParams?: Promise<{
    state?: string;
    lang?: string;
  }>;
};

type StateCopy = {
  badge: string;
  title: string;
  lead: string;
  detail: string;
};

const SUPPORTED_STATES: readonly PreviewState[] = NOVORA_PREVIEW_LIFECYCLE_STATES;

const feedbackCategories: Record<PreviewLocale, string[]> = {
  en: ['Structure issue', 'Style mismatch', 'Stone or setting issue', 'Proportion issue', 'Request human follow-up'],
  'zh-Hant': ['結構問題', '風格不符合', '寶石或鑲嵌問題', '比例問題', '需要人工跟進'],
};

const copy: Record<
  PreviewLocale,
  {
    eyebrow: string;
    brandTitle: string;
    referenceLabel: string;
    mockBadge: string;
    languageNote: string;
    state: Record<PreviewState, StateCopy>;
    boundaryTitle: string;
    boundaryIntro: string;
    boundaryItems: string[];
    sketchEyebrow: string;
    sketchTitle: string;
    sketchTags: string[];
    mockLabel: string;
    mockTitle: string;
    mockStamp: string;
    mockFooter: string;
    annotationOne: string;
    annotationTwo: string;
    annotationThree: string;
    previewNote: string;
    feedbackEyebrow: string;
    feedbackTitle: string;
    feedbackIntro: string;
    feedbackPlaceholder: string;
    feedbackDisabled: string;
    feedbackNote: string;
    actionsTitle: string;
    actionsBody: string;
    backToStart: string;
    submittedLink: string;
  }
> = {
  en: {
    eyebrow: 'NOVORA concept preview',
    brandTitle: 'Customer concept preview',
    referenceLabel: 'Customer reference',
    mockBadge: 'Mock route skeleton',
    languageNote: 'English preview copy',
    state: {
      processing: {
        badge: 'Processing',
        title: 'Your concept preview is being prepared',
        lead:
          'NOVORA is preparing the future first AI hand-drawn concept sketch preview experience for this Concept Brief.',
        detail:
          'This mock page does not read a database or generate an image. In the future, this state would reassure the customer while the concept direction is prepared.',
      },
      first_preview_ready: {
        badge: 'First preview ready',
        title: 'Mock first concept preview',
        lead:
          'This state shows where the first customer-facing concept sketch would appear once a future preview is ready.',
        detail:
          'The visual below is a CSS placeholder only. It is not an actual AI-generated image and it is not based on live customer data.',
      },
      generation_delayed: {
        badge: 'Taking longer',
        title: 'The preview is taking longer than expected',
        lead:
          'NOVORA may continue preparing the concept direction or route the brief for human follow-up if needed.',
        detail:
          'This safe delay state avoids promising an exact timeline and keeps the customer informed without exposing provider or system details.',
      },
      generation_failed: {
        badge: 'Temporarily unavailable',
        title: 'The preview is temporarily unavailable',
        lead:
          'NOVORA can still continue the concept review path and may follow up manually if the preview cannot be prepared.',
        detail:
          'This customer-facing failure state does not blame a provider, expose internal errors, or imply the design process has ended.',
      },
      preview_unavailable: {
        badge: 'Unavailable',
        title: 'This preview cannot be shown right now',
        lead:
          'The customer-safe preview is not available in this mock state, but the Concept Brief reference remains visible.',
        detail:
          'A future live implementation would only show customer-safe preview data after approved access and visibility rules pass.',
      },
      feedback_submitted: {
        badge: 'Mock feedback received',
        title: 'Feedback acknowledgement placeholder',
        lead:
          'This mock acknowledgement shows the future customer response after feedback is captured.',
        detail:
          'No feedback is saved from this page. Future feedback would support human correction, regeneration, or follow-up without becoming CAD or production approval.',
      },
      human_followup_needed: {
        badge: 'Human follow-up needed',
        title: 'A human review step is needed',
        lead:
          'NOVORA may need to review structure, setting logic, proportions, feasibility, or customer-request match before the next step.',
        detail:
          'This state keeps human correction separate from automated preview status and from any CAD, quote, order, payment, or production decision.',
      },
    },
    boundaryTitle: 'Concept preview boundary',
    boundaryIntro:
      'This customer preview is for early visual direction and feedback only. It is not CAD, not a quote, not order approval, not payment approval, and not production approval.',
    boundaryItems: [
      'Not CAD',
      'Not a quote',
      'Not order approval',
      'Not payment approval',
      'Not production approval',
      'Human correction may still be needed',
    ],
    sketchEyebrow: 'Mock sketch sheet',
    sketchTitle: 'Placeholder visual, no generated image',
    sketchTags: ['Concept preview', 'CSS placeholder', 'No live image generation'],
    mockLabel: 'Mock placeholder',
    mockTitle: 'NOVORA concept preview',
    mockStamp: 'Placeholder visual only',
    mockFooter: 'NOVORA / concept preview sheet / mock only',
    annotationOne: 'proportion note',
    annotationTwo: 'setting callout',
    annotationThree: 'structure review',
    previewNote:
      'This mock sketch area visually suggests the future NOVORA preview sheet. It is not an uploaded asset, not a generated image, and not part of a live customer workflow.',
    feedbackEyebrow: 'Feedback entry point',
    feedbackTitle: 'Mock feedback controls',
    feedbackIntro:
      'Future feedback can help NOVORA identify structure issues, style mismatch, stone or setting concerns, proportion problems, or a need for human follow-up.',
    feedbackPlaceholder: 'Feedback text entry is disabled in this mock route.',
    feedbackDisabled: 'Feedback submission coming later',
    feedbackNote:
      'No feedback is submitted, stored, emailed, or sent to an API from this page.',
    actionsTitle: 'Mock-only route',
    actionsBody:
      'This direct preview URL is intentionally not wired into the live Concept Brief submission flow yet.',
    backToStart: 'Back to design start',
    submittedLink: 'View submitted receipt page',
  },
  'zh-Hant': {
    eyebrow: 'NOVORA 概念預覽',
    brandTitle: '客戶概念預覽',
    referenceLabel: '客戶參考編號',
    mockBadge: '模擬路由骨架',
    languageNote: '繁體中文預覽文案',
    state: {
      processing: {
        badge: '準備中',
        title: '正在準備您的概念預覽',
        lead: 'NOVORA 正在示範未來第一張 AI 手繪概念草圖預覽的等待狀態。',
        detail: '此模擬頁面不讀取資料庫，也不產生圖片。未來此狀態會用來讓客戶了解概念方向仍在準備中。',
      },
      first_preview_ready: {
        badge: '第一張預覽已就緒',
        title: '模擬第一張概念預覽',
        lead: '此狀態示範未來第一張客戶可見概念草圖會出現的位置。',
        detail: '下方視覺僅為 CSS 佔位示意，不是真正的 AI 生成圖片，也不使用即時客戶資料。',
      },
      generation_delayed: {
        badge: '時間較長',
        title: '預覽準備時間比預期更久',
        lead: 'NOVORA 可能會繼續整理概念方向，必要時也可能改由人工跟進。',
        detail: '此安全延遲狀態不承諾精確時間，也不揭露供應商或系統內部細節。',
      },
      generation_failed: {
        badge: '暫時無法使用',
        title: '目前暫時無法顯示預覽',
        lead: '即使預覽無法準備，NOVORA 仍可繼續概念審閱流程，並可能以人工方式跟進。',
        detail: '此客戶可見失敗狀態不責怪任何供應商、不揭露內部錯誤，也不代表設計流程結束。',
      },
      preview_unavailable: {
        badge: '無法顯示',
        title: '目前無法顯示此預覽',
        lead: '此模擬狀態下沒有客戶安全預覽可顯示，但仍會顯示 Concept Brief 參考編號。',
        detail: '未來正式功能只會在存取與可見性規則通過後，顯示客戶安全的預覽資料。',
      },
      feedback_submitted: {
        badge: '模擬回饋已收到',
        title: '回饋確認佔位狀態',
        lead: '此模擬確認示範未來客戶送出回饋後的回應狀態。',
        detail: '此頁面不會儲存任何回饋。未來回饋會支援人工修正、重新生成或跟進，但不代表 CAD 或生產核准。',
      },
      human_followup_needed: {
        badge: '需要人工跟進',
        title: '下一步需要人工審閱',
        lead: 'NOVORA 可能需要檢查結構、鑲嵌邏輯、比例、可行性，或是否符合客戶需求。',
        detail: '此狀態將人工修正與自動預覽狀態分開，也與 CAD、報價、訂單、付款或生產決定分開。',
      },
    },
    boundaryTitle: '概念預覽界線',
    boundaryIntro:
      '此客戶預覽僅用於早期視覺方向與回饋。它不是 CAD、不是報價、不是訂單核准、不是付款核准，也不是生產核准。',
    boundaryItems: ['不是 CAD', '不是報價', '不是訂單核准', '不是付款核准', '不是生產核准', '仍可能需要人工修正'],
    sketchEyebrow: '模擬草圖版面',
    sketchTitle: '佔位視覺，沒有生成圖片',
    sketchTags: ['概念預覽', 'CSS 佔位', '沒有即時圖片生成'],
    mockLabel: '模擬佔位',
    mockTitle: 'NOVORA 概念預覽',
    mockStamp: '僅為佔位視覺',
    mockFooter: 'NOVORA / 概念預覽版面 / 僅供模擬',
    annotationOne: '比例提示',
    annotationTwo: '鑲嵌標註',
    annotationThree: '結構審閱',
    previewNote:
      '此模擬草圖區域示意未來 NOVORA 預覽版面的視覺方向。它不是上傳素材、不是生成圖片，也不是即時客戶流程的一部分。',
    feedbackEyebrow: '回饋入口',
    feedbackTitle: '模擬回饋控制',
    feedbackIntro:
      '未來回饋可協助 NOVORA 判斷結構問題、風格不符合、寶石或鑲嵌疑慮、比例問題，或是否需要人工跟進。',
    feedbackPlaceholder: '此模擬路由已停用回饋文字輸入。',
    feedbackDisabled: '回饋提交功能稍後加入',
    feedbackNote: '此頁面不會提交、儲存、寄送電子郵件，或呼叫 API。',
    actionsTitle: '僅供模擬的路由',
    actionsBody: '此直接預覽網址尚未接入正式 Concept Brief 提交流程。',
    backToStart: '返回設計開始',
    submittedLink: '查看提交收據頁',
  },
};

function normalizeState(value: string | undefined): PreviewState {
  return SUPPORTED_STATES.includes(value as PreviewState) ? (value as PreviewState) : 'processing';
}

function normalizeLocale(value: string | undefined): PreviewLocale {
  return value === 'zh-Hant' || value === 'zh-TW' ? 'zh-Hant' : 'en';
}

function MockSketchSheet({ labels }: { labels: (typeof copy)['en'] }) {
  return (
    <div className={styles.paperCard} aria-label={labels.sketchTitle}>
      <span className={styles.mockLabel}>{labels.mockLabel}</span>
      <span className={styles.cardTitle}>{labels.mockTitle}</span>
      <span className={styles.guideVertical} />
      <span className={styles.guideHorizontal} />
      <span className={styles.ringOuter} />
      <span className={styles.ringInner} />
      <span className={styles.ringShoulderLeft} />
      <span className={styles.ringShoulderRight} />
      <span className={styles.centerStone} />
      <span className={styles.stoneFacetOne} />
      <span className={styles.stoneFacetTwo} />
      <span className={styles.sideProfile} />
      <span className={styles.sideStone} />
      <span className={styles.noteLineOne} />
      <span className={styles.noteLineTwo} />
      <span className={styles.noteLineThree} />
      <span className={styles.noteOne}>{labels.annotationOne}</span>
      <span className={styles.noteTwo}>{labels.annotationTwo}</span>
      <span className={styles.noteThree}>{labels.annotationThree}</span>
      <span className={styles.mockStamp}>{labels.mockStamp}</span>
      <span className={styles.watermark}>NOVORA</span>
      <span className={styles.footerMark}>{labels.mockFooter}</span>
    </div>
  );
}

function MockBridgeDetails({
  publicReference,
  result,
}: {
  publicReference: string;
  result: NovoraPreviewGenerationMockResult;
}) {
  const unavailableText = 'Not available in this local mock state';

  return (
    <section className={styles.bridgePanel} aria-labelledby="mock-bridge-heading">
      <div className={styles.sectionHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>Mock bridge preview data</p>
          <h2 id="mock-bridge-heading">Mock bridge result</h2>
        </div>
        <span className={styles.disabledPill}>Route mock integration only</span>
      </div>
      <p>{result.display_copy.title}</p>
      <p>{result.display_copy.body}</p>
      <p className={styles.bridgeDisclaimer}>
        Concept preview only. Not CAD. Not a quote. Not an order approval. Not a payment approval. Not production
        approval.
      </p>
      <p className={styles.bridgeDisclaimer}>{result.display_copy.concept_preview_disclaimer}</p>
      <p className={styles.bridgeDisclaimer}>{result.display_copy.non_approval_disclaimer}</p>
      <p className={styles.bridgeDisclaimer}>
        Human review is required before customer-safe delivery or production decisions.
      </p>
      <p className={styles.bridgeDisclaimer}>
        first_preview_ready is separate from approved_for_customer.
      </p>
      <dl className={styles.bridgeFacts}>
        <div>
          <dt>Route public_reference</dt>
          <dd>{publicReference}</dd>
        </div>
        <div>
          <dt>Mock bridge public_reference</dt>
          <dd>{result.public_reference}</dd>
        </div>
        <div>
          <dt>lifecycle_state</dt>
          <dd>{result.lifecycle_state}</dd>
        </div>
        <div>
          <dt>Mock output placeholder label</dt>
          <dd>{result.mock_output.placeholder_label}</dd>
        </div>
        <div>
          <dt>Generated image</dt>
          <dd>No real generated image is available in this mock state.</dd>
        </div>
        <div>
          <dt>Image URL</dt>
          <dd>{result.mock_output.image_url ?? unavailableText}</dd>
        </div>
        <div>
          <dt>Provider output</dt>
          <dd>{result.mock_output.provider_output_id ?? unavailableText}</dd>
        </div>
        <div>
          <dt>Generated at</dt>
          <dd>{result.mock_output.generated_at ?? unavailableText}</dd>
        </div>
        <div>
          <dt>Feedback entry</dt>
          <dd>{result.feedback_entry.disabled_reason}</dd>
        </div>
        <div>
          <dt>Prompt chain</dt>
          <dd>Design Spec precedes Hand Sketch Instruction; Hand Sketch Instruction precedes any future provider prompt.</dd>
        </div>
      </dl>
    </section>
  );
}

export default async function CustomerPreviewPage({ params, searchParams }: PreviewPageProps) {
  const { public_reference: rawPublicReference } = await params;
  const resolvedSearchParams = await searchParams;
  const previewState = normalizeState(resolvedSearchParams?.state);
  const locale = normalizeLocale(resolvedSearchParams?.lang);
  const labels = copy[locale];
  const stateCopy = labels.state[previewState];
  const publicReference = decodeURIComponent(rawPublicReference);
  const shouldShowSketch = previewState === 'first_preview_ready';
  const mockBridgeResult = shouldShowSketch
    ? createMockNovoraPreviewGenerationResult({
        lifecycleState: previewState,
        publicReference,
      })
    : null;

  return (
    <main className={sharedStyles.pageBackground}>
      <section className={`${sharedStyles.shell} ${styles.previewShell}`}>
        <div className={styles.layout}>
          <section className={styles.hero} aria-labelledby="preview-heading">
            <div className={styles.heroHeader}>
              <div>
                <p className={sharedStyles.eyebrow}>{labels.eyebrow}</p>
                <h1 id="preview-heading">{labels.brandTitle}</h1>
              </div>
              <div className={styles.badges} aria-label="Preview metadata">
                <span>{labels.mockBadge}</span>
                <span>{labels.languageNote}</span>
              </div>
            </div>
            <div className={styles.referencePanel}>
              <span>{labels.referenceLabel}</span>
              <strong>{publicReference}</strong>
            </div>
            <div className={styles.statusPanel} role="status" aria-live="polite">
              <span className={styles.statusBadge}>{stateCopy.badge}</span>
              <h2>{stateCopy.title}</h2>
              <p>{stateCopy.lead}</p>
              <p>{stateCopy.detail}</p>
            </div>
          </section>

          {shouldShowSketch ? (
            <section className={styles.previewPanel} aria-labelledby="mock-sketch-heading">
              <div className={styles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>{labels.sketchEyebrow}</p>
                  <h2 id="mock-sketch-heading">{labels.sketchTitle}</h2>
                </div>
                <div className={styles.previewTags} aria-label="Mock preview limits">
                  {labels.sketchTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <MockSketchSheet labels={labels} />
              <p className={styles.previewNote}>{labels.previewNote}</p>
            </section>
          ) : null}

          {mockBridgeResult ? (
            <MockBridgeDetails publicReference={publicReference} result={mockBridgeResult} />
          ) : null}

          <section className={styles.feedbackPanel} aria-labelledby="feedback-heading">
            <div className={styles.sectionHeader}>
              <div>
                <p className={sharedStyles.eyebrow}>{labels.feedbackEyebrow}</p>
                <h2 id="feedback-heading">{labels.feedbackTitle}</h2>
              </div>
              <span className={styles.disabledPill}>{labels.feedbackDisabled}</span>
            </div>
            <p>{labels.feedbackIntro}</p>
            <div className={styles.feedbackCategories} aria-label={labels.feedbackTitle}>
              {feedbackCategories[locale].map((category) => (
                <button key={category} type="button" disabled>
                  {category}
                </button>
              ))}
            </div>
            <label className={styles.mockField}>
              <span>{labels.feedbackPlaceholder}</span>
              <textarea disabled value="" aria-label={labels.feedbackPlaceholder} readOnly />
            </label>
            <p className={styles.previewNote}>{labels.feedbackNote}</p>
          </section>

          <section className={styles.boundaryPanel} aria-labelledby="boundary-heading">
            <p className={sharedStyles.eyebrow}>{labels.boundaryTitle}</p>
            <h2 id="boundary-heading">{labels.boundaryTitle}</h2>
            <p>{labels.boundaryIntro}</p>
            <ul>
              {labels.boundaryItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.actionsPanel} aria-labelledby="mock-route-heading">
            <div>
              <p className={sharedStyles.eyebrow}>{labels.actionsTitle}</p>
              <h2 id="mock-route-heading">{labels.actionsTitle}</h2>
              <p>{labels.actionsBody}</p>
            </div>
            <div className={sharedStyles.actions}>
              <Link className={sharedStyles.primaryButton} href="/design/start">
                {labels.backToStart}
              </Link>
              <Link className={sharedStyles.secondaryButton} href="/design/submitted">
                {labels.submittedLink}
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
