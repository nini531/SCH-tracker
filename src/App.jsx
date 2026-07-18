import React, { useState, useEffect, useMemo } from 'react';
import { Home, GraduationCap, Utensils, Bus, Coffee, Trash2, Pencil, X, Check, AlertTriangle } from 'lucide-react';

// ---------- 상수 ----------
const JEONGJU_TOTAL = 500000;
const HAKSEUP_TOTAL = 200000;

const SUB_LIMITS = {
  주거비: 500000,
  식비: 200000,
  교육비: 400000,
  교통비: 400000,
};

const SUB_META = {
  주거비: { icon: Home, color: '#1E4E8C' },
  식비: { icon: Utensils, color: '#1E4E8C' },
  교육비: { icon: GraduationCap, color: '#1E4E8C' },
  교통비: { icon: Bus, color: '#1E4E8C' },
};

const PAY_METHODS = ['자동이체', '카드결제', '계좌이체'];

const WARN_RATIO = 0.85; // 85% 이상 사용 시 경고

// ---------- 유틸 ----------
const won = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;

const fmtDate = (iso) => {
  const d = new Date(iso);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 사용 날짜(YYYY-MM-DD) 표시용: 2026.07.15 (수)
const fmtSpentDate = (ymd) => {
  if (!ymd) return '-';
  const d = new Date(`${ymd}T00:00:00`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`;
};

const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// 이 앱은 브라우저의 localStorage에 데이터를 저장합니다.
// 즉, 이 기기(브라우저)에만 데이터가 남고 다른 기기/브라우저에서는 보이지 않습니다.
// 브라우저 데이터를 삭제하거나 시크릿(프라이빗) 모드로 열면 데이터가 사라질 수 있습니다.
const STORAGE_KEY = 'sinchunghae-entries';

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // ---- 폼 상태: 정주비 ----
  const [jjAmount, setJjAmount] = useState('');
  const [jjSub, setJjSub] = useState('주거비');
  const [jjPay, setJjPay] = useState('카드결제');
  const [jjDetail, setJjDetail] = useState('');
  const [jjDate, setJjDate] = useState(todayYMD());
  const [jjEditId, setJjEditId] = useState(null);

  // ---- 폼 상태: 학습공간비 ----
  const [hsAmount, setHsAmount] = useState('');
  const [hsPay, setHsPay] = useState('카드결제');
  const [hsDetail, setHsDetail] = useState('');
  const [hsDate, setHsDate] = useState(todayYMD());
  const [hsEditId, setHsEditId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ---------- 불러오기 (브라우저 localStorage에서 동기적으로 읽음) ----------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
      setLoadError(false);
    } catch (e) {
      // localStorage 접근 불가(프라이빗 브라우징 등) 또는 저장된 데이터 손상
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  // ---------- 저장 (변경될 때마다 localStorage에 동기적으로 기록) ----------
  useEffect(() => {
    if (!loaded) return;
    if (loadError) return; // 불러오기가 실패한 상태면, 기존 데이터를 덮어쓸 위험이 있으므로 저장을 잠근다
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      setSaveError(false);
    } catch (e) {
      // 저장 공간 부족 등으로 실패할 수 있음
      setSaveError(true);
    }
  }, [entries, loaded, loadError]);

  // ---------- 계산 ----------
  const jeongjuEntries = useMemo(
    () =>
      entries
        .filter((e) => e.category === '정주비')
        .sort((a, b) => (b.spentDate || '').localeCompare(a.spentDate || '') || b.createdAt - a.createdAt),
    [entries]
  );
  const hakseupEntries = useMemo(
    () =>
      entries
        .filter((e) => e.category === '학습공간비')
        .sort((a, b) => (b.spentDate || '').localeCompare(a.spentDate || '') || b.createdAt - a.createdAt),
    [entries]
  );

  const jeongjuSpent = jeongjuEntries.reduce((s, e) => s + e.amount, 0);
  const hakseupSpent = hakseupEntries.reduce((s, e) => s + e.amount, 0);

  const jeongjuBalance = JEONGJU_TOTAL - jeongjuSpent;
  const hakseupBalance = HAKSEUP_TOTAL - hakseupSpent;

  const subSpent = useMemo(() => {
    const map = { 주거비: 0, 식비: 0, 교육비: 0, 교통비: 0 };
    jeongjuEntries.forEach((e) => {
      if (map[e.subCategory] !== undefined) map[e.subCategory] += e.amount;
    });
    return map;
  }, [jeongjuEntries]);

  // ---------- 폼 리셋 ----------
  const resetJJForm = () => {
    setJjAmount('');
    setJjSub('주거비');
    setJjPay('카드결제');
    setJjDetail('');
    setJjDate(todayYMD());
    setJjEditId(null);
  };
  const resetHSForm = () => {
    setHsAmount('');
    setHsPay('카드결제');
    setHsDetail('');
    setHsDate(todayYMD());
    setHsEditId(null);
  };

  // ---------- 제출 ----------
  const submitJJ = () => {
    const amt = Number(jjAmount);
    if (!amt || amt <= 0) return;
    if (!jjDetail.trim()) return;

    if (jjEditId) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === jjEditId
            ? { ...e, amount: amt, subCategory: jjSub, payMethod: jjPay, detail: jjDetail.trim(), spentDate: jjDate }
            : e
        )
      );
    } else {
      setEntries((prev) => [
        ...prev,
        {
          id: uid(),
          category: '정주비',
          subCategory: jjSub,
          amount: amt,
          payMethod: jjPay,
          detail: jjDetail.trim(),
          spentDate: jjDate,
          createdAt: Date.now(),
        },
      ]);
    }
    resetJJForm();
  };

  const submitHS = () => {
    const amt = Number(hsAmount);
    if (!amt || amt <= 0) return;
    if (!hsDetail.trim()) return;

    if (hsEditId) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === hsEditId
            ? { ...e, amount: amt, payMethod: hsPay, detail: hsDetail.trim(), spentDate: hsDate }
            : e
        )
      );
    } else {
      setEntries((prev) => [
        ...prev,
        {
          id: uid(),
          category: '학습공간비',
          subCategory: null,
          amount: amt,
          payMethod: hsPay,
          detail: hsDetail.trim(),
          spentDate: hsDate,
          createdAt: Date.now(),
        },
      ]);
    }
    resetHSForm();
  };

  const startEditJJ = (entry) => {
    setJjEditId(entry.id);
    setJjAmount(String(entry.amount));
    setJjSub(entry.subCategory);
    setJjPay(entry.payMethod);
    setJjDetail(entry.detail);
    setJjDate(entry.spentDate || todayYMD());
    document.getElementById('jj-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const startEditHS = (entry) => {
    setHsEditId(entry.id);
    setHsAmount(String(entry.amount));
    setHsPay(entry.payMethod);
    setHsDetail(entry.detail);
    setHsDate(entry.spentDate || todayYMD());
    document.getElementById('hs-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setEntries((prev) => prev.filter((e) => e.id !== deleteTarget));
    setDeleteTarget(null);
  };

  // ---------- 경고 메세지 ----------
  const subWarnings = Object.entries(subSpent)
    .filter(([k, v]) => v >= SUB_LIMITS[k] * WARN_RATIO)
    .map(([k, v]) => ({
      key: k,
      spent: v,
      limit: SUB_LIMITS[k],
      over: v > SUB_LIMITS[k],
    }));

  return (
    <div style={styles.page}>
      <style>{fontImport}</style>

      {/* ---------- 헤더 ---------- */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLabel}>신청해 참여자용</div>
          <h1 style={styles.headerTitle}>신청해 지원금 지출기록</h1>
          <p style={styles.headerSub}>월 700,000원 · 정해진 항목 내 지출 증빙 기록</p>
        </div>
      </header>

      <main style={styles.main}>
        {/* ---------- 잔액 요약 ---------- */}
        <section style={styles.balanceGrid}>
          <BalanceCard
            title="정주비"
            subtitle="주거비 · 식비 · 교통비 · 교육비"
            total={JEONGJU_TOTAL}
            spent={jeongjuSpent}
            balance={jeongjuBalance}
            color="#1E4E8C"
            colorSoft="#E6EDF7"
          />
          <BalanceCard
            title="학습공간비"
            subtitle="스터디카페 · 카페 등"
            total={HAKSEUP_TOTAL}
            spent={hakseupSpent}
            balance={hakseupBalance}
            color="#1B5E4F"
            colorSoft="#E7F0EC"
          />
        </section>

        {(jeongjuSpent >= JEONGJU_TOTAL * WARN_RATIO || hakseupSpent >= HAKSEUP_TOTAL * WARN_RATIO) && (
          <section style={styles.warnBox}>
            {jeongjuSpent >= JEONGJU_TOTAL * WARN_RATIO && (
              <div style={{ ...styles.warnRow, color: jeongjuSpent > JEONGJU_TOTAL ? '#B3261E' : '#8A5A00' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>정주비</strong> 총 사용액이 {won(jeongjuSpent)}로, 전체 한도 {won(JEONGJU_TOTAL)}
                  {jeongjuSpent > JEONGJU_TOTAL ? '을 초과했어요.' : `의 ${Math.round((jeongjuSpent / JEONGJU_TOTAL) * 100)}%에 도달했어요.`}
                </span>
              </div>
            )}
            {hakseupSpent >= HAKSEUP_TOTAL * WARN_RATIO && (
              <div style={{ ...styles.warnRow, color: hakseupSpent > HAKSEUP_TOTAL ? '#B3261E' : '#8A5A00' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>학습공간비</strong> 총 사용액이 {won(hakseupSpent)}로, 전체 한도 {won(HAKSEUP_TOTAL)}
                  {hakseupSpent > HAKSEUP_TOTAL ? '을 초과했어요.' : `의 ${Math.round((hakseupSpent / HAKSEUP_TOTAL) * 100)}%에 도달했어요.`}
                </span>
              </div>
            )}
          </section>
        )}

        {/* ---------- 경고 메세지 ---------- */}
        {subWarnings.length > 0 && (
          <section style={styles.warnBox}>
            {subWarnings.map((w) => (
              <div key={w.key} style={{ ...styles.warnRow, color: w.over ? '#B3261E' : '#8A5A00' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>{w.key}</strong> 지출액이 {won(w.spent)}로, 한도 {won(w.limit)}
                  {w.over ? '을 초과했어요.' : `의 ${Math.round((w.spent / w.limit) * 100)}%에 도달했어요.`}
                </span>
              </div>
            ))}
          </section>
        )}

        {loadError && (
          <section style={{ ...styles.warnBox, background: '#FDEDEC' }}>
            <div style={{ ...styles.warnRow, color: '#B3261E' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                기존 지출 내역을 불러오지 못했어요. 지금 화면에서 새로 입력하면 이전 데이터를 덮어쓸 수 있으니, 페이지를 새로고침한 후 다시 시도해 주세요.
              </span>
            </div>
          </section>
        )}

        {saveError && (
          <section style={{ ...styles.warnBox, background: '#FDEDEC' }}>
            <div style={{ ...styles.warnRow, color: '#B3261E', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', gap: 8 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                기기 저장 공간 문제로 저장에 실패했어요. 저장 공간을 확인한 후 다시 시도해 주세요.
              </span>
              <button
                style={styles.retryBtn}
                onClick={() => setEntries((prev) => [...prev])}
              >
                다시 시도
              </button>
            </div>
          </section>
        )}

        {/* ============ 정주비 섹션 ============ */}
        <section style={{ ...styles.sectionBlock, borderColor: '#1E4E8C22' }}>
          <div style={{ ...styles.sectionHeaderBar, background: '#1E4E8C' }}>
            <span style={styles.sectionHeaderText}>정주비</span>
            <span style={styles.sectionHeaderSub}>{won(jeongjuBalance)} 남음 / {won(JEONGJU_TOTAL)}</span>
          </div>

          <div style={styles.sectionBody}>
            {/* 입력 폼 */}
            <div id="jj-form" style={styles.formCard}>
              <div style={styles.formTitleRow}>
                <span style={styles.formTitle}>{jjEditId ? '지출 내역 수정' : '지출 내역 추가'}</span>
                {jjEditId && (
                  <button style={styles.cancelEditBtn} onClick={resetJJForm}>
                    <X size={14} /> 수정 취소
                  </button>
                )}
              </div>

              <div style={styles.formGrid}>
                <Field label="세부항목" full>
                  <div style={styles.chipRow}>
                    {Object.keys(SUB_LIMITS).map((k) => (
                      <button
                        key={k}
                        onClick={() => setJjSub(k)}
                        style={{
                          ...styles.chip,
                          ...(jjSub === k ? { background: '#1E4E8C', color: '#fff', borderColor: '#1E4E8C' } : {}),
                        }}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </Field>

                <AmountDateRow
                  amountValue={jjAmount}
                  onAmountChange={setJjAmount}
                  amountPlaceholder="예: 15000"
                  dateValue={jjDate}
                  onDateChange={setJjDate}
                />

                <Field label="결제 방식" full>
                  <div style={styles.chipRow}>
                    {PAY_METHODS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setJjPay(p)}
                        style={{
                          ...styles.chip,
                          ...(jjPay === p ? { background: '#1E4E8C', color: '#fff', borderColor: '#1E4E8C' } : {}),
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="상세 내용 (사용처 등)" full>
                  <input
                    type="text"
                    placeholder="예: 강남역 스타벅스 원두 구입"
                    value={jjDetail}
                    onChange={(e) => setJjDetail(e.target.value)}
                    style={styles.input}
                  />
                </Field>
              </div>

              <button
                style={{ ...styles.submitBtn, background: '#1E4E8C' }}
                onClick={submitJJ}
                disabled={!jjAmount || !jjDetail.trim()}
              >
                {jjEditId ? <><Check size={16} /> 수정 완료</> : '내역 추가'}
              </button>
            </div>

            {/* 테이블 */}
            <EntryTable
              entries={jeongjuEntries}
              accent="#1E4E8C"
              accentSoft="#E6EDF7"
              showSub
              onEdit={startEditJJ}
              onDelete={(id) => setDeleteTarget(id)}
            />
          </div>
        </section>

        {/* ============ 학습공간비 섹션 ============ */}
        <section style={{ ...styles.sectionBlock, borderColor: '#1B5E4F22' }}>
          <div style={{ ...styles.sectionHeaderBar, background: '#1B5E4F' }}>
            <span style={styles.sectionHeaderText}>학습공간비</span>
            <span style={styles.sectionHeaderSub}>{won(hakseupBalance)} 남음 / {won(HAKSEUP_TOTAL)}</span>
          </div>

          <div style={styles.sectionBody}>
            <div id="hs-form" style={styles.formCard}>
              <div style={styles.formTitleRow}>
                <span style={styles.formTitle}>{hsEditId ? '지출 내역 수정' : '지출 내역 추가'}</span>
                {hsEditId && (
                  <button style={styles.cancelEditBtn} onClick={resetHSForm}>
                    <X size={14} /> 수정 취소
                  </button>
                )}
              </div>

              <div style={styles.formGrid}>
                <AmountDateRow
                  amountValue={hsAmount}
                  onAmountChange={setHsAmount}
                  amountPlaceholder="예: 8000"
                  dateValue={hsDate}
                  onDateChange={setHsDate}
                />

                <Field label="결제 방식" full>
                  <div style={styles.chipRow}>
                    {PAY_METHODS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setHsPay(p)}
                        style={{
                          ...styles.chip,
                          ...(hsPay === p ? { background: '#1B5E4F', color: '#fff', borderColor: '#1B5E4F' } : {}),
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="상세 내용 (사용처 등)" full>
                  <input
                    type="text"
                    placeholder="예: 신촌 트레바리 스터디카페 1일권"
                    value={hsDetail}
                    onChange={(e) => setHsDetail(e.target.value)}
                    style={styles.input}
                  />
                </Field>
              </div>

              <button
                style={{ ...styles.submitBtn, background: '#1B5E4F' }}
                onClick={submitHS}
                disabled={!hsAmount || !hsDetail.trim()}
              >
                {hsEditId ? <><Check size={16} /> 수정 완료</> : '내역 추가'}
              </button>
            </div>

            <EntryTable
              entries={hakseupEntries}
              accent="#1B5E4F"
              accentSoft="#E7F0EC"
              showSub={false}
              onEdit={startEditHS}
              onDelete={(id) => setDeleteTarget(id)}
            />
          </div>
        </section>

        {/* ---------- 안내사항 ---------- */}
        <section style={styles.guideSection}>
          <h2 style={styles.guideMainTitle}>지출 항목 안내</h2>

          <GuideBlock
            color="#1E4E8C"
            colorSoft="#E6EDF7"
            title="1. 정주비"
            okTitle="사용 가능항목"
            okItems={[
              { label: '주거비', desc: '월세(기숙사비), 숙박비, 공공요금(전기·가스·수도 등)' },
              { label: '식비', desc: '식당 이용, 배달음식, 식자재 구입 등' },
              { label: '교통비', desc: '대중교통 이용요금 (버스, 지하철, 철도(KTX·SRT, 일반 열차 등), 고속버스)' },
              { label: '교육비', desc: '학원비, 인터넷강의 수강료, 시험 응시료, 대회 참가비, 교재·교구 구입, 프로그램·어플리케이션, 재료구입비' },
            ]}
            noItems={[
              { label: '통신요금', desc: '휴대전화 사용료(통신비, 유심, 휴대폰 소액결제), 인터넷 요금' },
              { label: '여가문화 활동비', desc: '헬스·PT·필라테스, 전시·공연관람, OTT·스트리밍 서비스 등' },
              { label: '전자기기 구입비', desc: '노트북, 태블릿, 주변기기, 외장하드, 그래픽카드 등' },
              { label: '미용비', desc: '패션·잡화 구입, 미용실 이용료 등' },
              { label: '병원비', desc: '병원·한의원·약국 등' },
              { label: '금융활동비', desc: '적금, 저축, 주식, 이자(신용대출, 전세대출, 학자금대출), 펀드, 보험료 등' },
              { label: '기타', desc: '참가 목적에서 벗어나거나 지출 증빙이 불가한 경우' },
            ]}
          />

          <GuideBlock
            color="#1B5E4F"
            colorSoft="#E7F0EC"
            title="2. 학습공간 지원비"
            okTitle="사용 가능항목"
            okItems={[
              { label: '지원목적', desc: '학업 수행에 필요한 공간 사용을 목적으로 하는 경우 이용 가능(프랜차이즈, 개인카페 등 식·음료를 이용할 수 있는 곳 포함)' },
              { label: '사용처', desc: '스터디카페, 독서실, 공유 오피스, 일반 카페 등' },
              { label: '결제 방식', desc: '스터디카페, 독서실, 공유 오피스의 경우 월간·주간·시간권 결제 가능' },
            ]}
            noItems={[
              { label: '비대면 이용', desc: '직접 매장을 이용하지 않는 경우 이용 불가(카페 메뉴를 배달하는 경우 등)' },
              { label: '선결제류', desc: '기프티콘, 선결제, MD구매 불가' },
              { label: '기타', desc: '참가 목적에서 벗어나거나 지출 증빙이 불가한 경우' },
            ]}
          />
        </section>
      </main>

      {/* ---------- 삭제 확인 모달 ---------- */}
      {deleteTarget && (
        <div style={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p style={styles.modalText}>이 지출 내역을 삭제할까요?</p>
            <p style={styles.modalSubText}>삭제하면 되돌릴 수 없어요.</p>
            <div style={styles.modalBtnRow}>
              <button style={styles.modalCancelBtn} onClick={() => setDeleteTarget(null)}>취소</button>
              <button style={styles.modalDeleteBtn} onClick={confirmDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- 하위 컴포넌트 ----------

function BalanceCard({ title, subtitle, total, spent, balance, color, colorSoft }) {
  const pct = Math.min(100, Math.round((spent / total) * 100));
  return (
    <div style={{ ...styles.balanceCard, borderColor: color + '33' }}>
      <div style={styles.balanceCardTop}>
        <div>
          <div style={{ ...styles.balanceTitle, color }}>{title}</div>
          <div style={styles.balanceSubtitle}>{subtitle}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...styles.balanceAmount, color: balance < 0 ? '#B3261E' : '#1A1A1A' }}>
            {won(balance)}
          </div>
          <div style={styles.balanceAmountLabel}>남음</div>
        </div>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${pct}%`, background: color }} />
      </div>
      <div style={styles.balanceFooterRow}>
        <span>사용 {won(spent)}</span>
        <span>총 {won(total)}</span>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{ ...styles.field, ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

// 사용 금액 / 사용 날짜를 하나의 전체폭 wrapper 안에서 세로로 쌓는다.
// (formGrid의 2열 배치에 직접 들어가면 자동으로 나란히 배치되어 폭이 갈라지므로,
//  반드시 이 컴포넌트가 gridColumn 전체를 차지하는 하나의 블록으로 렌더링되어야 한다.)
function AmountDateRow({ amountValue, onAmountChange, amountPlaceholder, dateValue, onDateChange }) {
  return (
    <div style={styles.amountDateWrap}>
      <div style={styles.field}>
        <label style={styles.fieldLabel}>사용 금액 (원)</label>
        <input
          type="number"
          inputMode="numeric"
          placeholder={amountPlaceholder}
          value={amountValue}
          onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9]/g, ''))}
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.fieldLabel}>사용 날짜</label>
        <input
          type="date"
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
          style={{ ...styles.input, ...styles.dateInput }}
        />
      </div>
    </div>
  );
}

function EntryTable({ entries, accent, accentSoft, showSub, onEdit, onDelete }) {
  if (entries.length === 0) {
    return (
      <div style={styles.emptyState}>
        아직 기록된 지출 내역이 없어요. 위 양식에 내용을 입력하고 추가해 주세요.
      </div>
    );
  }
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, background: accentSoft, color: accent }}>사용 날짜</th>
            {showSub && <th style={{ ...styles.th, background: accentSoft, color: accent }}>세부항목</th>}
            <th style={{ ...styles.th, background: accentSoft, color: accent }}>금액</th>
            <th style={{ ...styles.th, background: accentSoft, color: accent }}>결제 방식</th>
            <th style={{ ...styles.th, background: accentSoft, color: accent }}>상세 내용</th>
            <th style={{ ...styles.th, background: accentSoft, color: accent, width: 84 }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} style={styles.tr}>
              <td style={styles.td}>{fmtSpentDate(e.spentDate) !== '-' ? fmtSpentDate(e.spentDate) : fmtDate(e.createdAt).split(' ')[0]}</td>
              {showSub && (
                <td style={styles.td}>
                  <span style={{ ...styles.subBadge, borderColor: accent, color: accent }}>{e.subCategory}</span>
                </td>
              )}
              <td style={{ ...styles.td, fontWeight: 700 }}>{won(e.amount)}</td>
              <td style={styles.td}>{e.payMethod}</td>
              <td style={styles.td}>{e.detail}</td>
              <td style={styles.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={styles.iconBtn} onClick={() => onEdit(e)} aria-label="수정">
                    <Pencil size={14} />
                  </button>
                  <button style={{ ...styles.iconBtn, color: '#B3261E' }} onClick={() => onDelete(e.id)} aria-label="삭제">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuideBlock({ color, colorSoft, title, okTitle, okItems, noItems }) {
  return (
    <div style={{ ...styles.guideBlock, borderColor: color + '33' }}>
      <div style={{ ...styles.guideBlockTitle, color, borderBottomColor: color + '33' }}>{title}</div>

      <div style={styles.guideCol}>
        <div style={{ ...styles.guideColHeader, color }}>✓ {okTitle}</div>
        {okItems.map((it) => (
          <div key={it.label} style={styles.guideItem}>
            <span style={{ ...styles.guideItemLabel, background: colorSoft, color }}>{it.label}</span>
            <span style={styles.guideItemDesc}>{it.desc}</span>
          </div>
        ))}
      </div>

      <div style={styles.guideCol}>
        <div style={{ ...styles.guideColHeader, color: '#B3261E' }}>✕ 사용 불가항목</div>
        {noItems.map((it) => (
          <div key={it.label} style={styles.guideItem}>
            <span style={{ ...styles.guideItemLabel, background: '#FDEDEC', color: '#B3261E' }}>{it.label}</span>
            <span style={styles.guideItemDesc}>{it.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- 스타일 ----------
const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap');
  * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; box-sizing: border-box; }
  input:focus { outline: 2px solid #1E4E8C55; }
  button { cursor: pointer; font-family: inherit; }
  table { border-collapse: collapse; }
  input[type="date"] {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    -webkit-appearance: none;
    appearance: none;
  }
  input[type="date"]::-webkit-date-and-time-value {
    text-align: left;
  }
`;

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F7F6F2',
    color: '#1A1A1A',
    paddingBottom: 60,
    overflowX: 'hidden',
  },
  header: {
    background: '#123061',
    padding: '32px 20px 28px',
  },
  headerInner: { maxWidth: 960, margin: '0 auto' },
  headerLabel: {
    color: '#9FC0E8',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    marginBottom: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  headerSub: {
    color: '#C3D4EC',
    fontSize: 13,
    marginTop: 6,
  },
  main: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 14px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  balanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 14,
  },
  balanceCard: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid',
    padding: '18px 20px',
  },
  balanceCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  balanceTitle: { fontSize: 16, fontWeight: 800 },
  balanceSubtitle: { fontSize: 12, color: '#767676', marginTop: 2 },
  balanceAmount: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' },
  balanceAmountLabel: { fontSize: 11, color: '#9A9A9A', textAlign: 'right' },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    background: '#EFEDE6',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width .3s ease' },
  balanceFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#8A8A8A',
  },
  warnBox: {
    background: '#FFF6E5',
    border: '1px solid #F0DDA6',
    borderRadius: 12,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  warnRow: {
    display: 'flex',
    gap: 8,
    fontSize: 13,
    lineHeight: 1.5,
  },
  retryBtn: {
    flexShrink: 0,
    border: '1px solid #B3261E55',
    background: '#fff',
    color: '#B3261E',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  sectionBlock: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid',
    overflow: 'hidden',
  },
  sectionHeaderBar: {
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderText: { color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' },
  sectionHeaderSub: { color: '#fff', fontSize: 12.5, opacity: 0.9, fontWeight: 600 },
  sectionBody: { padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 18 },
  formCard: {
    background: '#FAFAF7',
    border: '1px solid #EAE8E0',
    borderRadius: 12,
    padding: '14px 12px',
  },
  formTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: { fontSize: 13.5, fontWeight: 700, color: '#444' },
  cancelEditBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#767676',
    background: 'none',
    border: 'none',
    padding: '2px 4px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
    marginBottom: 14,
  },
  amountDateWrap: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
    width: '100%',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, width: '100%', alignSelf: 'stretch' },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: '#666' },
  input: {
    border: '1px solid #DDD9CE',
    borderRadius: 8,
    padding: '9px 11px',
    fontSize: 13.5,
    background: '#fff',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    display: 'block',
    boxSizing: 'border-box',
  },
  dateInput: {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    border: '1px solid #DDD9CE',
    background: '#fff',
    color: '#444',
    borderRadius: 20,
    padding: '6px 13px',
    fontSize: 12.5,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  submitBtn: {
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontSize: 13.5,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  emptyState: {
    textAlign: 'center',
    color: '#9A9A9A',
    fontSize: 13,
    padding: '28px 0',
    border: '1px dashed #E0DDD3',
    borderRadius: 10,
  },
  tableWrap: { overflowX: 'auto', borderRadius: 10, border: '1px solid #EEEBE2' },
  table: { width: 'max-content', minWidth: '100%', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' },
  tr: { borderTop: '1px solid #F0EEE6' },
  td: { padding: '10px 12px', color: '#333', verticalAlign: 'middle', whiteSpace: 'nowrap' },
  subBadge: {
    display: 'inline-block',
    border: '1px solid',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 11.5,
    fontWeight: 700,
  },
  iconBtn: {
    border: '1px solid #E4E1D8',
    background: '#fff',
    borderRadius: 6,
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    color: '#555',
  },
  guideSection: {
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  guideMainTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#1A1A1A',
    borderBottom: '2px solid #1A1A1A',
    paddingBottom: 8,
    marginBottom: 2,
  },
  guideBlock: {
    background: '#fff',
    border: '1px solid',
    borderRadius: 14,
    padding: '16px 18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  guideBlockTitle: {
    fontSize: 15,
    fontWeight: 800,
    paddingBottom: 10,
    borderBottom: '1px solid',
  },
  guideCol: { display: 'flex', flexDirection: 'column', gap: 8 },
  guideColHeader: { fontSize: 12.5, fontWeight: 800, marginBottom: 2 },
  guideItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    fontSize: 12.5,
    lineHeight: 1.5,
  },
  guideItemLabel: {
    flexShrink: 0,
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 11.5,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    marginTop: 1,
  },
  guideItemDesc: { color: '#555' },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 20,
  },
  modalCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '24px 22px',
    maxWidth: 320,
    width: '100%',
  },
  modalText: { fontSize: 14.5, fontWeight: 700, marginBottom: 4 },
  modalSubText: { fontSize: 12.5, color: '#888', marginBottom: 18 },
  modalBtnRow: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  modalCancelBtn: {
    border: '1px solid #DDD',
    background: '#fff',
    color: '#444',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
  },
  modalDeleteBtn: {
    border: 'none',
    background: '#B3261E',
    color: '#fff',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
  },
};
