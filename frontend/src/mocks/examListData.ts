import type { ExamListItem } from '@/api/examList'

/**
 * 검사자 리스트 목업 (2026-04, 성민CRM 실제 데이터 패턴 기반).
 * base()가 47개 필드 기본값을 채우고, 각 행은 의미 있는 컬럼만 override.
 */
const inferPayment = (estimate: string) => {
  const [, pricePart] = estimate.match(/_(\d+(?:\+\d+)*)/) ?? []
  if (!pricePart) return ''

  const total = pricePart
    .split('+')
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0)

  return total > 0 ? (total * 10000).toLocaleString('ko-KR') : ''
}

const base = (o: Partial<ExamListItem>): ExamListItem => {
  const row: ExamListItem = {
    chartNo: '', name: '', nameEng: '', examDate: '2026-04-01', examType: '검사', examRegDate: '2026-03-26',
    examCategory: '시력교정', patientType: '신환',
    examMemo: '', estimate: '', surgeryRate: '', examTime: '10:00', recommendedR: '', recommendedL: '',
    surgeryRegDate: '', surgeryReserveDate: '', surgeryDate: '', surgeryR: '', surgeryL: '', surgeon: '',
    payment: '', counselor: '', doctor: '', jumin: '******-*******', birth: '', lunar: '양',
    phone1: '', phone2: '010-0000-0000', email: '', zip: '06000', addr1: '서울 강남구', addr2: '',
    memo: '', examStop: 'N', opImpossible: 'N', route: '홈페이지', section: '2',
    motiveL: '광고', motiveM: '온라인', motiveS: '검색', motiveMemo: '온라인 검색 유입', optometrist: '',
    cancelCode: '', cancelMemo: '', grade: 'R', job: '직장인', lastVisit: '2026-04-01',
    insurance: '-', nationality: '대한민국',
    ...o,
  }

  return {
    ...row,
    surgeryRate: row.surgeryRate || (row.estimate ? '90%' : ''),
    surgeryRegDate: row.surgeryRegDate || row.surgeryReserveDate,
    surgeon: row.surgeon || (row.surgeryDate ? row.doctor : ''),
    payment: row.payment || inferPayment(row.estimate),
  }
}

export const EXAM_LIST_MOCK: ExamListItem[] = [
  base({ chartNo: '2102517', name: '김권수', nameEng: 'Kim Kwonsoo', examTime: '14:00', estimate: 'SMILE PRO+(P)_460/직원소개-90', recommendedR: 'SMILE PRO+(P)', recommendedL: 'SMILE PRO+(P)', surgeryReserveDate: '2026-04-02', surgeryDate: '2026-04-02', surgeryR: 'SMILE PRO+(P)', surgeryL: 'SMILE PRO+(P)', surgeon: '김욱겸', payment: '4,600,000', counselor: '유혜진', doctor: '김욱겸', optometrist: '정진성', birth: '1996-02-06', phone2: '010-4931-0206', email: 'ksbshs206@gmail.com', addr1: '서울 강남구 선릉로 8', addr2: '래미안 214동 2401호', job: '대학생', motiveL: '소개', motiveM: '직원소개', examMemo: '드림 13y 2m off / 프로-초기뿌연, 재수술 le' }),
  base({ chartNo: '2228744', name: '김도희', nameEng: 'Kim Dohee', examTime: '15:00', estimate: 'SMILE_300/온라인-30', recommendedR: 'SMILE', recommendedL: 'SMILE', counselor: '유혜진', doctor: '김보이', birth: '1998-03-28', phone2: '010-3882-2167', email: 'kimdh805@naver.com', addr1: '경기 과천시 관문로 106', job: '직장인', examMemo: '★dna미진행 / sl 가끔 2w off / 스마일·프로 설명' }),
  base({ chartNo: '2228725', name: '김량진', nameEng: 'Kim Ryangjin', examType: '검사OP', examTime: '09:30', estimate: 'EVOp ICL_560/온라인-30', recommendedR: 'EVOp ICL', recommendedL: 'EVOp ICL', counselor: '유혜진', doctor: '강은민', birth: '1998-03-30', grade: 'G', phone2: '010-6441-8342', email: 'tbcar030@naver.com', addr1: '서울 은평구 갈현로 230', job: '취업준비(휴식)', examMemo: '★렌즈주문+선결제 필요 / ICL 설명' }),
  base({ chartNo: '2228512', name: '김민호', nameEng: 'Kim Minho', examType: '검사OP', examTime: '10:30', estimate: 'SMILE_300/원데이-20', recommendedR: 'SMILE', recommendedL: 'SMILE', surgeryReserveDate: '2026-04-01', surgeryDate: '2026-04-01', surgeryR: 'SMILE', surgeryL: 'SMILE', surgeon: '강은민', payment: '2,800,000', counselor: '윤경희', birth: '1990-08-21', phone2: '010-2222-9766', email: 'kim5074090@naver.com', addr1: '인천 서구 보석로 31', job: '자영업/프리랜서', motiveL: '검색', motiveM: '네이버', examMemo: 'sl10y off / 당뇨 전단계 / 스마일·프로 설명' }),
  base({ chartNo: '2228726', name: '김보경', nameEng: 'Kim Bokyoung', examType: '검사OP', examTime: '09:30', estimate: 'SMILE_150+170/소개+원데이-60', recommendedR: 'SMILE', recommendedL: 'SMILE+X', surgeryReserveDate: '2026-04-01', surgeryDate: '2026-04-01', surgeryR: 'SMILE', surgeryL: 'SMILE+X', surgeon: '강은민', payment: '3,200,000', counselor: '정형경', birth: '1992-11-06', phone2: '010-8259-0871', email: 'choco@naver.com', addr1: '경기 고양시 일산서구 일산로 488', job: '자영업/프리랜서', motiveL: '소개', motiveM: '지인소개', examMemo: '초기뿌연 ok / 재수술 라섹 / 엑스트라' }),
  base({ chartNo: '2228733', name: '김상원', nameEng: 'Kim Sangwon', examType: '검사OP', examTime: '11:00', estimate: 'EVOp T-ICL_615/원데이+직계-30', recommendedR: 'EVOp T-ICL', recommendedL: 'EVOp ICL', surgeryReserveDate: '2026-04-01', surgeryDate: '2026-04-01', surgeryR: 'EVOp T-ICL', surgeryL: 'EVOp ICL', surgeon: '강은민', payment: '5,850,000', counselor: '정형경', birth: '2004-12-18', phone2: '010-6893-5896', email: 'smage04@naver.com', addr1: '경기 용인시 수지구 고기로45번길 40', job: '대학생', examMemo: 'T-ICL 설명 / 정기검진 안내' }),
  base({ chartNo: '2228729', name: '김성현', nameEng: 'Kim Sunghyun', examType: '검사OP', examTime: '10:10', estimate: 'SMILE PRO_460/B2B군인-70', recommendedR: 'SMILE PRO', recommendedL: 'SMILE PRO', surgeryReserveDate: '2026-04-01', surgeryDate: '2026-04-01', surgeryR: 'SMILE PRO', surgeryL: 'SMILE PRO', surgeon: '강은민', payment: '3,900,000', counselor: '양다영', doctor: '강은민', birth: '2004-12-07', phone2: '010-2483-8953', email: 'kim24838953@gmail.com', addr1: '경기 시흥시 미산로69번길 4', job: '대학생', route: 'B2B', motiveL: 'B2B', motiveM: '군인', examMemo: '스마일선호 / od 재수술불가 / 프로설명' }),
  base({ chartNo: '2228738', name: '김의경', nameEng: 'Kim Uikyoung', examTime: '14:30', counselor: 'BS미지정', doctor: '※기타', birth: '1997-05-16', grade: 'G', phone2: '010-8459-7702', email: 'dmlrud0516@naver.com', addr1: '서울 양천구 공항대로 630', examMemo: '타병원 산동상태로 내원' }),
  base({ chartNo: '2228724', name: '김준서', nameEng: 'Kim Junseo', examType: '검사OP', examTime: '10:00', estimate: 'SMILE PRO_460/스마일프로특가-60', recommendedR: 'SMILE PRO', recommendedL: 'SMILE PRO', surgeryReserveDate: '2026-04-01', surgeryDate: '2026-04-01', surgeryR: 'SMILE PRO', surgeryL: 'SMILE PRO', surgeon: '강은민', payment: '4,000,000', counselor: '양다영', doctor: '강은민', birth: '2006-09-01', phone2: '010-8980-4281', email: 'kimjunseo@naver.com', addr1: '서울 마포구 새터산8길 20', job: '취업준비(휴식)', examMemo: '4/20 입대 / 재수술 le / 프로설명' }),
  base({ chartNo: '2228735', name: '김진희', nameEng: 'Kim Jinhee', examTime: '11:30', counselor: 'BS미지정', birth: '1983-03-30', grade: 'G', phone2: '010-2671-3900', email: 'wlsqkddk@naver.com', addr1: '서울 동작구 사당로16마길 44', examStop: 'Y', cancelCode: '121', cancelMemo: '본인 사정 취소', examMemo: '골디 / 검사 중단' }),
  base({ chartNo: '2228737', name: '소민준', nameEng: 'So Minjun', examTime: '14:30', estimate: 'SMILE_300/온라인-30', recommendedR: 'SMILE', recommendedL: 'SMILE', counselor: '양다영', birth: '2005-03-02', phone2: '010-7587-8260', email: 'ose7210@gmail.com', addr1: '경기 화성시 남양읍 현대기아로 703', job: '군인', examMemo: '★dna미진행, 수술미정 / 6/24~8/12 출국' }),
  base({ chartNo: '2228723', name: '신은혜', nameEng: 'Shin Eunhye', examType: '검사OP', examTime: '09:30', estimate: 'SMILE+(P)_300/원데이-20', recommendedR: 'SMILE+(P)', recommendedL: 'SMILE+(P)', surgeryReserveDate: '2026-04-01', surgeryDate: '2026-04-01', surgeryR: 'SMILE+(P)', surgeryL: 'SMILE+(P)', surgeon: '김보이', payment: '2,800,000', counselor: '윤경희', birth: '1994-01-16', phone2: '010-5094-4927', email: 'eneshin@naver.com', addr1: '경기 성남시 중원구 금광로 39', job: '취업준비(휴식)', examMemo: 'sl10y off / 스마일·프로 설명' }),
  base({ chartNo: '2228739', name: '염수연', nameEng: 'Yeom Suyeon', examTime: '14:30', estimate: 'SMILE_300/직원소개-90', recommendedR: 'SMILE', recommendedL: 'SMILE', surgeryReserveDate: '2026-04-03', surgeryDate: '2026-04-03', surgeryR: 'SMILE', surgeryL: 'SMILE', surgeon: '김보이', payment: '2,100,000', counselor: '정형경', birth: '2002-09-15', phone2: '010-2946-6353', email: 'suyeonooo@naver.com', addr1: '경기 광주시 이배재로 426-13', job: '취업준비(휴식)', motiveL: '소개', motiveM: '직원소개', examMemo: '5/4 출국(캐나다 1y) / 재수술 라섹' }),
  base({ chartNo: '2228746', name: '오현민', nameEng: 'Oh Hyunmin', examTime: '15:00', estimate: 'EYECLE+EX500+(P)_220/조조할인-50', recommendedR: 'EYECLE+EX500+(P)', recommendedL: 'EYECLE+EX500+(P)', surgeryReserveDate: '2026-04-20', surgeryDate: '2026-04-20', surgeryR: 'EYECLE+EX500+(P)', surgeryL: 'EYECLE+EX500+(P)', surgeon: '김보이', payment: '1,700,000', counselor: '윤경희', doctor: '김보이', birth: '1999-08-23', phone2: '010-9510-9152', email: 'hyunmin0823@naver.com', addr1: '경기 안양시 동안구 관평로212번길 21', job: '취업준비(휴식)', lastVisit: '2026-04-04', examMemo: 'barrier 안내 / 라식·라섹·스마일 설명' }),
  base({ chartNo: '2229014', name: '박재현', nameEng: 'Park Jaehyun', examType: '재검사', examDate: '2026-04-02', examTime: '13:30', estimate: '라섹_220/소개-20', recommendedR: '라섹', recommendedL: '라섹', surgeryReserveDate: '2026-04-05', surgeryDate: '2026-04-05', surgeryR: '라섹', surgeryL: '라섹', surgeon: '박원장', payment: '2,000,000', counselor: '김상담', doctor: '박원장', birth: '1995-05-05', grade: 'B', phone2: '010-1234-5678', email: 'park@naver.com', addr1: '서울 송파구 올림픽로 300', job: '직장인', lastVisit: '2026-04-02', motiveL: '소개', motiveM: '지인소개', examMemo: '야간운전 빛번짐 상담 / 재검 굴절 확인' }),
  base({ chartNo: '2229020', name: '최유나', nameEng: 'Choi Yuna', examType: 'DNA검사', examDate: '2026-04-03', examTime: '11:00', estimate: 'SMILE_300/원데이-20', recommendedR: 'SMILE', recommendedL: 'SMILE', counselor: '양다영', birth: '2001-01-15', grade: 'A', phone2: '010-9876-5432', email: 'yuna@gmail.com', addr1: '경기 수원시 영통구 광교로 145', job: '대학생', lastVisit: '2026-04-03', motiveL: '광고', motiveM: '인스타', examMemo: '아벨리노 유전자 샘플 발송' }),
]
