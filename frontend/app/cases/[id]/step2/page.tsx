'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiPost, apiFormPost } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface FileItem {
  id: string;
  name: string;
  size: number;
  isHWP: boolean;
  loading: boolean;
  uploadError: boolean;   // 업로드/분석 API 실패 여부
  detection: { type: string; confidence: number } | null;
  userType: string | null;
  analyzed: AnalyzedResult | null;
  _file?: File;
}

interface AnalyzedResult {
  filename: string;
  size: number;
  fallback: boolean;
  error?: string;
  productName?: string;
  manufacturer?: string;
  origin?: string;
  alcoholContent?: number | null;
  ingredients?: string[];
  detection?: { type: string; confidence: number };
  // STEP 1과 동시에 추출된 공정도 데이터
  hasProcessDiagram?: boolean;
  processes?: Process[];
}

interface S1State {
  productName?: string;
  manufacturer?: string;
  origin?: string;
  alcoholContent?: number | null;
  ingredients?: string[];
}

interface LawResult {
  source: string;
  law: string;
  score: number | null;
  summary: string;
  reason: string;
  fullText: string;
  updatedAt: string;
  foodTypeName?: string;
}

interface Section {
  text: string;
  relatedLaw: string | null;
}

interface AdditivesSection {
  list: string[];
  text: string;
  relatedLaw: string | null;
}

interface Sections {
  contentIngredients: Section;
  additives: AdditivesSection;
  specialNotes: Section;
}

interface S2Data {
  query: string;
  topKFetch: number;
  topKShown: number;
  supabaseUsed: boolean;
  guessedFoodType: string;
  results: LawResult[];
  sections: Sections | null;
  supabaseDocs: SupabaseDoc[];
}

interface SupabaseDoc {
  food_type: string;
  doc_name: string;
  doc_description: string;
  law_source: string;
  condition: string;
}

interface S4Data {
  finalType: string;
  summary: string;
  confirmedAt: string;
  requiredDocs: { name: string; desc: string; law: string }[];
}

interface Process {
  step: string;
  stepKo?: string;
  isBranch?: boolean;
}

interface Step3Response {
  skipped: boolean;
  diagramConclusion: string;
  processes: Process[];
  usedVision: boolean;
  translated?: boolean;
  language?: string;
}

type Tab = 'food-type' | 'product-info' | 'process-diagram';
type RowStatus = 'idle' | 'active' | 'done';
type Step1Phase = 'idle' | 'loading' | 'result' | 'fallback' | 'error';
type Step2Phase = 'loading' | 'result' | 'fallback' | 'error';
type PdPhase = 'idle' | 'loading' | 'result' | 'error';

// ── Constants ──────────────────────────────────────────────────────────────
const S2_LABELS = [
  '쿼리 변환 중...',
  'Pinecone 벡터 검색 중...',
  '식품유형 도출 중...',
  '결과 정리 중...',
  '최종 결과 확정 중...',
];
const PD_LABELS = ['이미지 분석 준비 중...', '공정 단계 추출 중...', '결과 정리 중...'];
const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'hwp'];
const MAX_SIZE = 20 * 1024 * 1024;

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 8); }
function fmt(n: number) { return (n / 1024 / 1024).toFixed(1) + ' MB'; }

function detectFileType(name: string): { type: string; confidence: number } {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, { type: string; confidence: number }> = {
    pdf:  { type: 'MSDS',      confidence: 90 },
    hwp:  { type: 'MSDS',      confidence: 80 },
    jpg:  { type: '제조공정도', confidence: 85 },
    jpeg: { type: '제조공정도', confidence: 85 },
    png:  { type: '제조공정도', confidence: 75 },
  };
  return map[ext] ?? { type: 'MSDS', confidence: 75 };
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Spinner() {
  return <div className="spin" />;
}

function LoadingRowEl({ label, status }: { label: string; status: RowStatus }) {
  const text = status === 'done' ? label.replace('중...', '완료') : label;
  return (
    <div className={`loading-row${status === 'done' ? ' done' : status === 'active' ? ' active' : ''}`}>
      {status === 'active' && <Spinner />}
      {status === 'done' && '✅ '}
      {status === 'idle' && <span>⏳</span>}
      {' '}{text}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Step2Page() {
  // File management
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 1
  const [s1, setS1] = useState<S1State | null>(null);
  const [step1Phase, setStep1Phase] = useState<Step1Phase>('idle');
  const [step1ErrMsg, setStep1ErrMsg] = useState('');
  const [productNameInput, setProductNameInput] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualOrigin, setManualOrigin] = useState('');
  const [s1LoadingMsg, setS1LoadingMsg] = useState('AI가 파일에서 제품 정보 추출 중...');
  const [s1Done, setS1Done] = useState(false);

  // Step 2
  const [showStep2, setShowStep2] = useState(false);
  const [step2Phase, setStep2Phase] = useState<Step2Phase>('loading');
  const [step2ErrMsg, setStep2ErrMsg] = useState('');
  const [s2Data, setS2Data] = useState<S2Data | null>(null);
  const [s4Data, setS4Data] = useState<S4Data | null>(null);
  const [s2Rows, setS2Rows] = useState<RowStatus[]>(['active', 'idle', 'idle', 'idle', 'idle']);
  const [confirmed, setConfirmed] = useState(false);
  const [manualFoodTypeInput, setManualFoodTypeInput] = useState('');
  const [foodTypeOverride, setFoodTypeOverride] = useState<string | null>(null);

  // Process diagram
  const [pdFile, setPdFile] = useState<File | null>(null);
  const [pdFileName, setPdFileName] = useState('');
  const [pdPreviewUrl, setPdPreviewUrl] = useState<string | null>(null);
  const [pdPhase, setPdPhase] = useState<PdPhase>('idle');
  const [pdRows, setPdRows] = useState<RowStatus[]>(['active', 'idle', 'idle']);
  const [pdProcesses, setPdProcesses] = useState<Process[]>([]);
  const [pdLangNote, setPdLangNote] = useState('');
  const [pdErrMsg, setPdErrMsg] = useState('');
  const [pdWarnMsg, setPdWarnMsg] = useState('');

  // Tab & Modal
  const [activeTab, setActiveTab] = useState<Tab>('food-type');
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdFileInputRef = useRef<HTMLInputElement>(null);
  const step2CardRef = useRef<HTMLDivElement>(null);
  // 항상 최신 files를 참조 (async 함수 내 stale closure 방지)
  const filesRef = useRef<FileItem[]>([]);

  // files 변경 시마다 ref 동기화
  useEffect(() => { filesRef.current = files; }, [files]);

  // ── Session restore ──
  useEffect(() => {
    try {
      const d = localStorage.getItem('samc_files');
      if (d) {
        const saved = JSON.parse(d) as Omit<FileItem, '_file'>[];
        setFiles(saved.map(f => ({ ...f, _file: undefined })));
      }
    } catch { /* ignore */ }
  }, []);

  // ── Ctrl+V paste (공정도 탭 활성 시) ──
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'process-diagram') return;
      const items = Array.from(e.clipboardData?.items ?? []);
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { setPdFromFile(file, '클립보드 이미지'); break; }
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  // ── File save ──
  function saveFiles(fs: FileItem[]) {
    try {
      localStorage.setItem('samc_files',
        JSON.stringify(fs.map(({ _file, ...rest }) => rest)));
    } catch { /* ignore */ }
  }

  // ── File handling ──
  async function addFile(file: File) {
    if (file.size > MAX_SIZE) { alert(`"${file.name}" 파일이 20MB를 초과합니다.`); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTS.includes(ext)) { alert(`"${file.name}" — 지원하지 않는 형식입니다.`); return; }

    const id = uid();
    const newRow: FileItem = {
      id, name: file.name, size: file.size, isHWP: ext === 'hwp',
      loading: true, uploadError: false, detection: null, userType: null, analyzed: null, _file: file,
    };

    // 중복 체크
    let isDuplicate = false;
    setFiles(prev => {
      if (prev.some(f => f.name === file.name)) {
        isDuplicate = true; return prev;
      }
      return [...prev, newRow];
    });
    if (isDuplicate) { alert(`"${file.name}" 파일이 이미 추가되어 있습니다.`); return; }

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/v1/upload-and-analyze', {
        method: 'POST', body: form, signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? '서버 오류');
      }
      const data: AnalyzedResult = await res.json();
      setFiles(prev => {
        const updated = prev.map(f =>
          f.id === id ? { ...f, name: data.filename, detection: data.detection ?? null, loading: false, uploadError: false, analyzed: data } : f
        );
        saveFiles(updated);
        return updated;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      console.error('[파일 업로드 실패]', msg);
      setFiles(prev => {
        const updated = prev.map(f =>
          f.id === id ? { ...f, detection: detectFileType(file.name), loading: false, uploadError: true } : f
        );
        saveFiles(updated);
        return updated;
      });
    }
  }

  async function processFiles(list: File[]) {
    for (const file of list) await addFile(file);
  }

  function removeFile(id: string) {
    if (isAnalyzing) return;
    setFiles(prev => { const u = prev.filter(f => f.id !== id); saveFiles(u); return u; });
  }

  function editFileType(id: string) {
    const f = files.find(x => x.id === id);
    if (!f) return;
    const choice = prompt(`파일 유형:\n1. MSDS\n2. 제조공정도\n현재: ${f.userType ?? f.detection?.type}`);
    if (!choice) return;
    const t = choice === '1' || choice.toLowerCase().includes('msds') ? 'MSDS'
      : choice === '2' || choice.toLowerCase().includes('공정') ? '제조공정도' : null;
    if (t) setFiles(prev => prev.map(x => x.id === id ? { ...x, userType: t } : x));
  }

  // ── Step 1 ──
  async function startAnalysis() {
    setIsAnalyzing(true);
    setStep1Phase('loading');
    setS1Done(false);

    // 아직 업로드 중인 파일 대기
    const pending = filesRef.current.filter(f => f.loading);
    if (pending.length > 0) {
      setS1LoadingMsg('파일 분석 완료 대기 중...');
      await new Promise<void>(resolve => {
        const iv = setInterval(() => {
          if (filesRef.current.every(f => !f.loading)) { clearInterval(iv); resolve(); }
        }, 300);
      });
    }

    setS1LoadingMsg('AI 분석 결과 확인 중...');
    await new Promise(r => setTimeout(r, 400));

    // 최신 files는 ref에서 읽음 (stale closure 방지)
    const current = filesRef.current;

    // 업로드 자체가 실패한 파일이 있으면 안내
    if (current.every(f => f.uploadError)) {
      setStep1ErrMsg('API 서버에 연결할 수 없습니다. Express 서버(포트 3001)가 실행 중인지 확인해 주세요.');
      setStep1Phase('error');
      setIsAnalyzing(false);
      return;
    }

    const analyzed =
      current.find(f => f.analyzed && !f.analyzed.fallback && f.analyzed.productName)?.analyzed
      ?? current.find(f => f.analyzed)?.analyzed;

    if (!analyzed) {
      setStep1ErrMsg('파일에서 정보를 추출하지 못했습니다. 파일을 삭제 후 다시 업로드해 주세요.');
      setStep1Phase('error');
      setIsAnalyzing(false);
      return;
    }
    if (analyzed.fallback) {
      setStep1ErrMsg(analyzed.error ?? '');
      setStep1Phase('fallback');
      setIsAnalyzing(false);
      return;
    }

    setS1({ ...analyzed });
    setProductNameInput(analyzed.productName ?? '');
    setS1Done(true);
    setStep1Phase('result');

    // 공정도가 함께 추출된 경우 → 공정도 탭에 자동 반영
    if (analyzed.hasProcessDiagram && analyzed.processes && analyzed.processes.length > 0) {
      setPdProcesses(analyzed.processes);
      setPdPhase('result');
      setPdFileName(`${analyzed.productName ?? '파일'} (STEP 1에서 자동 추출)`);
      setPdLangNote('');
      setPdWarnMsg('');
    }
  }

  function proceedToStep2(s1Override?: S1State) {
    const final = s1Override ?? { ...s1, productName: productNameInput };
    setS1(final);
    setShowStep2(true);
    setTimeout(() => {
      step2CardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      runStep2(final, null);
    }, 300);
  }

  function manualProceed() {
    const merged: S1State = { ...(s1 ?? {}) };
    if (manualProductName) merged.productName = manualProductName;
    if (manualOrigin) merged.origin = manualOrigin;
    proceedToStep2(merged);
  }

  function skipStep1() { proceedToStep2(s1 ?? {}); }

  // ── Step 2 ──
  async function advanceS2Row(idx: number) {
    await new Promise(r => setTimeout(r, 700));
    setS2Rows(prev => prev.map((s, i) => i === idx ? 'done' : i === idx + 1 ? 'active' : s));
  }

  async function runStep2(s1Src?: S1State | null, ftOverride?: string | null) {
    const src = s1Src ?? s1 ?? {};
    const override = ftOverride !== undefined ? ftOverride : foodTypeOverride;
    setS2Rows(['active', 'idle', 'idle', 'idle', 'idle']);
    setStep2Phase('loading');
    setS2Data(null);
    setS4Data(null);

    try {
      const step2Promise = apiPost<S2Data>('/step2', {
        productName:    src.productName    ?? null,
        origin:         src.origin         ?? null,
        alcoholContent: src.alcoholContent ?? null,
        ingredients:    src.ingredients    ?? [],
      });

      await advanceS2Row(0);
      await advanceS2Row(1);
      await advanceS2Row(2);

      const s2 = await step2Promise;
      setS2Data(s2);
      setS2Rows(prev => prev.map((s, i) => i === 3 ? 'done' : i === 4 ? 'active' : s));
      await new Promise(r => setTimeout(r, 300));

      if (!s2.results || s2.results.length === 0) {
        setStep2Phase('fallback');
        return;
      }

      const selectedType = override ?? s2.guessedFoodType ?? null;
      const s4 = await apiPost<S4Data>('/step4', {
        selectedType,
        s2FoodType:   s2.guessedFoodType ?? null,
        s3FoodType:   null,
        supabaseDocs: s2.supabaseDocs ?? [],
      });
      setS4Data(s4);
      setS2Rows(['done', 'done', 'done', 'done', 'done']);
      await new Promise(r => setTimeout(r, 400));
      setStep2Phase('result');
    } catch {
      setStep2ErrMsg('분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setStep2Phase('error');
    }
  }

  function handleManualFoodType() {
    const v = manualFoodTypeInput.trim();
    if (!v) { alert('식품유형을 입력해 주세요.'); return; }
    setFoodTypeOverride(v);
    setManualFoodTypeInput('');
    runStep2(null, v);
  }

  function editFinal() {
    const type = prompt('식품유형을 직접 입력하세요:', s4Data?.finalType);
    if (type) {
      setFoodTypeOverride(type);
      setConfirmed(false);
      runStep2(null, type);
    }
  }

  // ── Reset ──
  function resetStep(n: number) {
    if (n === 1) {
      setFiles([]); setS1(null); setIsAnalyzing(false);
      setStep1Phase('idle'); setShowStep2(false);
      setConfirmed(false); setFoodTypeOverride(null);
      localStorage.removeItem('samc_files');
    } else if (n === 2) {
      setS2Data(null); setS4Data(null); setConfirmed(false);
      runStep2();
    }
  }

  function resetAll() {
    if (!confirm('모든 내용을 초기화하시겠습니까?')) return;
    setFiles([]); setS1(null); setIsAnalyzing(false);
    setStep1Phase('idle'); setShowStep2(false);
    setConfirmed(false); setFoodTypeOverride(null);
    setS2Data(null); setS4Data(null);
    localStorage.removeItem('samc_files');
  }

  // ── Process diagram ──
  function setPdFromFile(file: File, label: string) {
    setPdFile(file);
    setPdFileName(label || file.name);
    setPdPhase('idle');
    setPdPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  }

  async function runProcessDiagram() {
    if (!pdFile) return;
    setPdPhase('loading');
    setPdRows(['active', 'idle', 'idle']);
    setPdProcesses([]); setPdLangNote(''); setPdWarnMsg(''); setPdErrMsg('');

    const advRow = async (i: number) => {
      await new Promise(r => setTimeout(r, 800));
      setPdRows(prev => prev.map((s, j) => j === i ? 'done' : j === i + 1 ? 'active' : s));
    };

    try {
      const form = new FormData();
      form.append('files', pdFile);
      form.append('s1', JSON.stringify({}));
      form.append('s2FoodType', '');
      const fetchPromise = apiFormPost<Step3Response>('/step3', form, 90_000);

      await advRow(0);
      await advRow(1);
      const data = await fetchPromise;

      setPdRows(['done', 'done', 'done']);
      await new Promise(r => setTimeout(r, 400));

      if (data.translated && data.language) {
        setPdLangNote(`🌐 원문 언어: ${data.language} → 한국어로 번역 후 분석`);
      }
      const procs = data.processes ?? [];
      setPdProcesses(procs);
      setPdWarnMsg(procs.length === 0 ? '⚠ 공정 단계를 판독하지 못했습니다. 공정도 부분만 캡처해서 다시 업로드해 주세요.' : '');
      setPdPhase('result');
    } catch (e) {
      setPdErrMsg(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.');
      setPdPhase('error');
    }
  }

  function resetProcessDiagram() {
    setPdFile(null); setPdFileName(''); setPdPreviewUrl(null);
    setPdPhase('idle'); setPdProcesses([]);
    setPdLangNote(''); setPdErrMsg(''); setPdWarnMsg('');
    if (pdFileInputRef.current) pdFileInputRef.current.value = '';
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Top Bar ── */}
      <div className="top-bar">
        <span className="logo">SAMC</span>
        <div className="tab-nav">
          {(['food-type', 'product-info', 'process-diagram'] as Tab[]).map(tab => (
            <button key={tab} className={`tab-btn${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'food-type' ? '식품유형' : tab === 'product-info' ? '제품정보' : '공정도 분석'}
            </button>
          ))}
        </div>
        <button className="btn-reset-all" onClick={resetAll}>전체 초기화</button>
      </div>

      {/* ════════════════════
          TAB 1 — 식품유형
      ════════════════════ */}
      <div className={`page${activeTab === 'food-type' ? ' active' : ''}`}>

        {/* STEP 1 */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="step-label">STEP 1</div>
              <div className="step-title">파일 업로드 &amp; 제품명 추출</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => resetStep(1)}>초기화</button>
          </div>

          {/* 드롭존 */}
          <div
            className="drop-zone"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
            onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); if (!isAnalyzing) processFiles([...e.dataTransfer.files]); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-icon">📂</div>
            <div className="drop-main">파일을 드래그하거나 클릭하여 업로드</div>
            <div className="drop-sub">MSDS 또는 제조공정도 (둘 다 선택사항, 1개 이상 필요)</div>
            <div className="drop-limit">최대 20MB / PDF · JPG · PNG 지원 · HWP 부분 지원</div>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.hwp"
            onChange={e => { processFiles([...e.target.files!]); e.target.value = ''; }} />

          {/* 파일 목록 */}
          <div className="file-list">
            {files.map(f => {
              const conf = f.detection?.confidence ?? 0;
              const type = f.userType ?? f.detection?.type ?? '판별 중';
              const isLow = conf < 75;
              return (
                <div key={f.id} className="file-item">
                  <div style={{ flex: 1 }}>
                    <div className="file-name">📄 {f.name}</div>
                    {f.isHWP && <div className="hwp-warn">HWP 파일 — 일부 내용만 판독될 수 있습니다.</div>}
                    <div className="flex gap-8 mt-8" style={{ flexWrap: 'wrap' }}>
                      {f.loading
                        ? <span className="badge badge-gray">판별 중…</span>
                        : f.uploadError
                          ? <span className="badge badge-red">⚠ 업로드 실패 — 서버 연결 확인 필요</span>
                          : <>
                              <span className={`badge ${isLow ? 'badge-orange' : 'badge-blue'}`}>{type} {conf}%</span>
                              {isLow && <button className="btn btn-ghost btn-sm" onClick={() => editFileType(f.id)}>수정</button>}
                            </>
                      }
                    </div>
                  </div>
                  <span className="file-size">{fmt(f.size)}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => removeFile(f.id)}>삭제</button>
                </div>
              );
            })}
          </div>

          {files.length === 1 && (
            <div className="alert alert-warn">⚠ 1개 파일 기반 분석입니다. 추가 파일 업로드 시 분석 정확도가 높아집니다.</div>
          )}
          {isAnalyzing && step1Phase === 'loading' && (
            <div className="alert alert-info">🔒 분석 중에는 파일을 추가할 수 없습니다.</div>
          )}

          <button className="btn btn-primary btn-full" disabled={files.length === 0 || isAnalyzing} onClick={startAnalysis}>
            분석 시작
          </button>

          {/* 로딩 */}
          {step1Phase === 'loading' && (
            <div>
              <div className="section-divider" />
              <div className={`loading-row${s1Done ? ' done' : ' active'}`}>
                {!s1Done && <Spinner />}
                {s1Done ? '✅ 제품 정보 추출 완료' : s1LoadingMsg}
              </div>
            </div>
          )}

          {/* 결과 */}
          {step1Phase === 'result' && (
            <div>
              <div className="section-divider" />
              <div className="product-result">
                <div className="step-label" style={{ marginBottom: 10 }}>추출된 제품 정보</div>
                <div className="product-field">
                  <span className="f-label">제품명</span>
                  <span><input className="editable-input" value={productNameInput} onChange={e => setProductNameInput(e.target.value)} /></span>
                  <span className="f-label">제조사</span>
                  <span className="f-value">{s1?.manufacturer ?? '정보 없음'}</span>
                  <span className="f-label">원산지</span>
                  <span className="f-value">{s1?.origin ?? '정보 없음'}</span>
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={() => proceedToStep2()}>
                다음 단계 — 법령 검색 →
              </button>
            </div>
          )}

          {/* Fallback / 오류 */}
          {(step1Phase === 'fallback' || step1Phase === 'error') && (
            <div>
              <div className="alert alert-warn mt-12">
                파일에서 정보를 찾지 못했습니다. 직접 입력하거나, 입력 없이 다음 단계로 진행할 수 있습니다.
              </div>
              {step1Phase === 'error' && step1ErrMsg && (
                <div className="alert alert-error mt-12">{step1ErrMsg}</div>
              )}
              <div className="manual-form">
                <input type="text" value={manualProductName} onChange={e => setManualProductName(e.target.value)} placeholder="제품명 (선택사항)" />
                <input type="text" value={manualOrigin} onChange={e => setManualOrigin(e.target.value)} placeholder="원산지 (선택사항)" />
              </div>
              <div className="flex gap-8">
                {step1Phase === 'error' && (
                  <button className="btn btn-ghost btn-full" onClick={startAnalysis}>재시도</button>
                )}
                <button className="btn btn-primary btn-full" onClick={manualProceed}>다음 단계 →</button>
                <button className="btn btn-ghost btn-full" onClick={skipStep1}>정보 없이 진행 →</button>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2 */}
        {showStep2 && (
          <div className="card" ref={step2CardRef}>
            <div className="card-header">
              <div>
                <div className="step-label">STEP 2</div>
                <div className="step-title">법령 검색 &amp; 결과 확정</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => resetStep(2)}>초기화</button>
            </div>

            {/* 로딩 */}
            {step2Phase === 'loading' && (
              <div>
                {S2_LABELS.map((label, i) => (
                  <LoadingRowEl key={i} label={label} status={s2Rows[i]} />
                ))}
              </div>
            )}

            {/* 결과 */}
            {step2Phase === 'result' && s2Data && s4Data && (
              <div>
                <div className="step-label" style={{ marginBottom: 6 }}>변환된 검색 쿼리</div>
                <div className="query-pill">{s2Data.query}</div>
                <div className="coverage-note">⚡ 현재 지원 범위: 주류 · 일반가공식품 (벡터 35개 기준)</div>

                {s2Data.supabaseUsed && (
                  <div className="alert alert-info" style={{ marginBottom: 10 }}>
                    ℹ Pinecone 결과 부족 → Supabase 식품유형 DB 병행 조회
                  </div>
                )}

                {/* ── 3섹션 법령 정보 ── */}
                {s2Data.sections && (() => {
                  const sec = s2Data.sections!;
                  // 관련 법령명으로 fullText 검색 헬퍼
                  const findFullText = (lawName: string | null) => {
                    if (!lawName) return null;
                    return s2Data.results.find(r => r.law === lawName)?.fullText ?? null;
                  };

                  const sectionDefs = [
                    {
                      icon: '🧪',
                      title: '함량 및 성분',
                      text: sec.contentIngredients.text,
                      relatedLaw: sec.contentIngredients.relatedLaw,
                      fullText: findFullText(sec.contentIngredients.relatedLaw),
                      extra: null,
                    },
                    {
                      icon: '🧴',
                      title: '기타 첨가물',
                      text: sec.additives.text,
                      relatedLaw: sec.additives.relatedLaw,
                      fullText: findFullText(sec.additives.relatedLaw),
                      extra: sec.additives.list.length > 0
                        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                            {sec.additives.list.map((a, i) => (
                              <span key={i} style={{ fontSize: 11, background: '#f0f3fa', borderRadius: 4, padding: '2px 7px', color: '#4a5e8a' }}>{a}</span>
                            ))}
                          </div>
                        : null,
                    },
                    {
                      icon: '⚠',
                      title: '특이사항',
                      text: sec.specialNotes.text,
                      relatedLaw: sec.specialNotes.relatedLaw,
                      fullText: findFullText(sec.specialNotes.relatedLaw),
                      extra: null,
                    },
                  ];

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      {sectionDefs.map((s, i) => (
                        <div key={i} className="law-card" style={{ marginBottom: 0 }}>
                          <div className="law-card-header" style={{ marginBottom: 6 }}>
                            <span className="law-name">{s.icon} {s.title}</span>
                            {s.relatedLaw && (
                              <span className="badge badge-blue" style={{ fontSize: 10 }}>📋 {s.relatedLaw}</span>
                            )}
                          </div>
                          {s.extra}
                          <div className="law-summary">{s.text}</div>
                          {s.fullText && (
                            <div style={{ marginTop: 8 }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setModal({ title: s.relatedLaw ?? s.title, body: s.fullText! })}
                              >
                                원문 보기
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* ── 관련 법령 전체 목록 ── */}
                      {s2Data.results.length > 0 && (
                        <div className="law-card" style={{ marginBottom: 0 }}>
                          <div className="law-name" style={{ marginBottom: 10 }}>📚 관련 법령 전체 목록</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {s2Data.results.map((r, i) =>
                              r.fullText
                                ? (
                                  <button
                                    key={i}
                                    className="btn btn-ghost btn-sm"
                                    style={{ fontSize: 12 }}
                                    onClick={() => setModal({ title: r.law, body: r.fullText })}
                                  >
                                    {r.law}
                                  </button>
                                ) : (
                                  <span
                                    key={i}
                                    style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #dde3f0', borderRadius: 6, color: '#aab' }}
                                  >
                                    {r.law}
                                  </span>
                                )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="law-meta mt-8">법령 검색: 후보 {s2Data.topKFetch}건 → {s2Data.topKShown}건 매칭</div>
                <div className="section-divider" />

                {/* 최종 결과 */}
                <div className="verdict-box">
                  <div className="verdict-type">{s4Data.finalType}</div>
                  <div className="verdict-sub">확정 시각: {s4Data.confirmedAt}</div>
                  {s4Data.summary && (
                    <div style={{ fontSize: 13, color: '#5a6e9e', marginTop: 8, lineHeight: 1.6 }}>{s4Data.summary}</div>
                  )}
                </div>

                <div className="step-label" style={{ marginBottom: 10 }}>필요 서류</div>
                {(s4Data.requiredDocs ?? []).map((d, i) => (
                  <div key={i} className="doc-item">
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div>
                      <div className="doc-name">{d.name}</div>
                      <div className="doc-desc">{d.desc}</div>
                    </div>
                  </div>
                ))}

                {!confirmed
                  ? (
                    <div className="flex gap-8 mt-12">
                      <button className="btn btn-primary flex-1" onClick={() => setConfirmed(true)}>✓ 확인</button>
                      <button className="btn btn-outline flex-1" onClick={editFinal}>✎ 유형 수정</button>
                    </div>
                  ) : (
                    <div className="confirmed-badge">✅ 식품유형이 확정되었습니다.</div>
                  )
                }
              </div>
            )}

            {/* Fallback */}
            {step2Phase === 'fallback' && (
              <div>
                <div className="alert alert-warn">관련 법령을 찾지 못했습니다. 식품유형을 직접 입력해 주세요.</div>
                <div className="manual-form mt-8">
                  <input type="text" value={manualFoodTypeInput} onChange={e => setManualFoodTypeInput(e.target.value)}
                    placeholder="식품유형 직접 입력 (예: 일반증류주)" />
                  <button className="btn btn-primary btn-full" onClick={handleManualFoodType}>입력 완료 →</button>
                </div>
              </div>
            )}

            {/* 오류 */}
            {step2Phase === 'error' && (
              <div>
                <div className="alert alert-error">{step2ErrMsg}</div>
                <button className="btn btn-ghost btn-full mt-8" onClick={() => runStep2()}>재시도</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════
          TAB 2 — 제품정보
      ════════════════════ */}
      <div className={`page${activeTab === 'product-info' ? ' active' : ''}`}>
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛠</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2340', marginBottom: 8 }}>제품정보</div>
          <div style={{ fontSize: 14, color: '#7c8db5' }}>추후 패치 예정</div>
        </div>
      </div>

      {/* ════════════════════
          TAB 3 — 공정도 분석
      ════════════════════ */}
      <div className={`page${activeTab === 'process-diagram' ? ' active' : ''}`}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="step-label">공정도 분석</div>
              <div className="step-title">제조공정 순서 추출</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={resetProcessDiagram}>초기화</button>
          </div>

          {/* STEP 1에서 공정도가 자동 추출된 경우 안내 */}
          {pdPhase === 'result' && pdFileName.includes('자동 추출') && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              ✅ STEP 1 업로드 파일에서 공정도가 자동으로 추출되었습니다.
              정확도가 낮다면 공정도 부분만 캡처해서 아래에 다시 업로드해 주세요.
            </div>
          )}

          {/* 드롭존 — 자동 추출된 경우에도 재업로드 가능 */}
          <div
            className={`pd-drop-zone${pdFile ? ' has-file' : ''}`}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
            onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) setPdFromFile(f, f.name); }}
            onClick={() => pdFileInputRef.current?.click()}
          >
            <div className="pd-drop-icon">📋</div>
            <div className="pd-drop-main">공정도 이미지를 붙여넣기하거나 클릭하여 업로드</div>
            <div className="pd-drop-sub">Ctrl+V 붙여넣기 · 파일 선택 · 드래그 앤 드롭</div>
            <div className="pd-drop-limit">JPG · PNG · PDF 지원 · 최대 20MB</div>
          </div>
          <input ref={pdFileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf"
            onChange={e => { const f = e.target.files?.[0]; if (f) setPdFromFile(f, f.name); e.target.value = ''; }} />

          {/* 미리보기 */}
          {pdFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f0f3fa', borderRadius: 8, marginTop: 10, fontSize: 13 }}>
              {pdPreviewUrl
                ? <img src={pdPreviewUrl} alt="미리보기" style={{ maxHeight: 120, borderRadius: 6, border: '1px solid #dde3f0' }} />
                : <span style={{ fontSize: 28 }}>📄</span>
              }
              <span>{pdFileName}</span>
            </div>
          )}

          {/* 분석 버튼 */}
          {pdFile && pdPhase !== 'loading' && (
            <button className="btn btn-primary btn-full mt-12" onClick={runProcessDiagram}>
              공정도 분석 시작
            </button>
          )}

          {/* 로딩 */}
          {pdPhase === 'loading' && (
            <div>
              <div className="section-divider" />
              {PD_LABELS.map((label, i) => (
                <LoadingRowEl key={i} label={label} status={pdRows[i]} />
              ))}
            </div>
          )}

          {/* 결과 */}
          {pdPhase === 'result' && (
            <div>
              <div className="section-divider" />
              {pdLangNote && <div className="alert alert-info">{pdLangNote}</div>}
              <div className="step-label mt-12" style={{ marginBottom: 10 }}>판독된 공정 순서</div>
              <div className="pd-flow">
                {(() => {
                  let mNum = 0;
                  return pdProcesses.map((p, i) => {
                    const isBranch = p.isBranch === true;
                    if (!isBranch) mNum++;
                    const koEl = p.stepKo ? <span className="pd-step-ko">({p.stepKo})</span> : null;
                    const prevMain = i > 0 && pdProcesses.slice(0, i).some(pp => !pp.isBranch);

                    if (isBranch) {
                      return (
                        <div key={i} className="pd-branch-row">
                          <span className="pd-branch-icon">↳</span>
                          <span className="pd-branch-chip">{p.step}{koEl}</span>
                        </div>
                      );
                    }
                    return (
                      <React.Fragment key={i}>
                        {prevMain && <div className="pd-connector" />}
                        <div className="pd-step-row">
                          <div className="pd-step-num">{mNum}</div>
                          <div className="pd-step-name">{p.step}{koEl}</div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
              {pdWarnMsg && <div className="alert alert-warn mt-12">{pdWarnMsg}</div>}
              <button className="btn btn-primary btn-full mt-12" onClick={runProcessDiagram}>
                다시 분석
              </button>
            </div>
          )}

          {/* 오류 */}
          {pdPhase === 'error' && (
            <div>
              <div className="section-divider" />
              <div className="alert alert-error">{pdErrMsg}</div>
              <button className="btn btn-ghost btn-full mt-8" onClick={runProcessDiagram}>재시도</button>
            </div>
          )}
        </div>
      </div>

      {/* ── 원문 보기 모달 ── */}
      {modal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-box">
            <div className="modal-title">{modal.title}</div>
            <div className="modal-body">{modal.body}</div>
            <button className="modal-close" onClick={() => setModal(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
