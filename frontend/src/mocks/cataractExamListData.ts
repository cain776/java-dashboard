import type { CataractExamListItem } from '@/api/cataractExamList'

/**
 * 백내장 검사자 리스트 목업 (2026-04, 성민CRM 실제 데이터 패턴 기반).
 * 적절수술/수술방법 = IOL 렌즈명, 진료구분 = C_OP전검사/C_일반검사/수술당일 등.
 */
const base = (o: Partial<CataractExamListItem>): CataractExamListItem => ({
  chartNo: '', name: '', nameEng: '', examDate: '2026-04-06', examType: 'C_OP전검사', examRegDate: '2026-04-01',
  examCategory: '백내장', patientType: '구환',
  examMemo: '', estimate: '', surgeryRate: '', examTime: '10:00', recommendedR: '', recommendedL: '',
  surgeryRegDate: '', surgeryReserveDate: '', surgeryDate: '', surgeryR: '', surgeryL: '', surgeon: '',
  payment: '', counselor: '', doctor: '최한뉘', jumin: '******-*******', birth: '', lunar: '양',
  phone1: '', phone2: '010-0000-0000', email: '', zip: '06000', addr1: '서울 강남구', addr2: '',
  memo: '', examStop: 'N', opImpossible: 'N', route: 'CTI', section: '2',
  motiveL: '소개', motiveM: '지인소개', motiveS: '소개', motiveMemo: '', optometrist: '',
  cancelCode: '', cancelMemo: '', grade: 'R', job: '주부', lastVisit: '2026-04-06',
  insurance: '', nationality: '대한민국',
  ...o,
})

export const CATARACT_EXAM_LIST_MOCK: CataractExamListItem[] = [
  base({ chartNo: '2228904', name: '김관일', nameEng: 'Kim Kwanil', examTime: '10:00', route: 'CRM', estimate: 'R 220 / L 170', recommendedR: 'Tecnis PureSee+IOL', recommendedL: 'Tecnis Eyhance', surgeryReserveDate: '2026-04-17', surgeryDate: '2026-04-17', surgeryR: 'Tecnis PureSee', surgeryL: 'Tecnis Eyhance', surgeon: '이인식', payment: '3,900,000', counselor: '전해성', doctor: '이인식', optometrist: '전해성', birth: '1958-03-12', job: '無', motiveL: '소개', motiveM: '직원소개', examMemo: '다초점 IOL 상담 / 양안 수술 예정' }),
  base({ chartNo: '2085276', name: '강연호', nameEng: 'Kang Yeonho', examTime: '10:30', estimate: '380', recommendedR: 'T-Clareon+IOL', recommendedL: '', surgeryReserveDate: '2026-04-14', surgeryDate: '2026-04-14', surgeryR: 'T-Clareon', surgeryL: 'Panoptix', surgeon: '이인식', payment: '3,800,000', counselor: '이혜민', doctor: '이인식', optometrist: '이혜민', birth: '1955-07-21', insurance: 'PRP', motiveL: '소개', motiveM: '직원소개', examMemo: '난시교정 토릭 IOL / 우안 수술' }),
  base({ chartNo: '2228919', name: '이재면', nameEng: 'Lee Jaemyeon', examTime: '11:00', route: 'CRM', estimate: 'R 330 / L 220', recommendedR: 'Clareon+IOL', recommendedL: 'Clareon Vivity', surgeryReserveDate: '2026-04-27', surgeryDate: '2026-04-27', surgeryR: 'Clareon', surgeryL: 'Clareon Vivity', surgeon: '이인식', payment: '5,500,000', counselor: '정민식', doctor: '이인식', optometrist: '신동화', birth: '1960-11-03', grade: 'R', insurance: 'PRP', motiveL: 'VIP고객관리팀', motiveM: 'VIP', examMemo: '비비티 연속초점 IOL 설명' }),
  base({ chartNo: '2200698', name: '이영기', nameEng: 'Lee Younggi', examType: '수술당일', examTime: '13:10', route: 'CRM', estimate: '330', recommendedR: 'T-Clareon+IOL', recommendedL: '', surgeryReserveDate: '2026-04-06', surgeryDate: '2026-04-06', surgeryR: 'T-Clareon', surgeryL: 'Tecnis Eyhance', surgeon: '이인식', payment: '3,300,000', counselor: '김종희', doctor: '이인식', optometrist: '김종희', birth: '1952-05-19', motiveL: '소개', motiveM: '직원소개', examMemo: '수술 당일 검사' }),
  base({ chartNo: '2228942', name: '오미숙', nameEng: 'Oh Misuk', examTime: '15:00', estimate: '180', recommendedR: '', recommendedL: 'Tecnis Eyhance+IOL', surgeryReserveDate: '2026-05-02', surgeryDate: '2026-05-02', surgeryR: '', surgeryL: 'Tecnis Eyhance', surgeon: '최한뉘', payment: '1,800,000', counselor: '정민식', doctor: '최한뉘', optometrist: '정민식', birth: '1963-02-08', insurance: 'PRP', route: 'CTI', motiveL: '홈페이지', motiveM: '온라인', examMemo: '단초점 IOL / 좌안 수술' }),
  base({ chartNo: '2228938', name: '이현지', nameEng: 'Lee Hyunji', examType: '단_OP전검사', examTime: '15:30', estimate: 'R 227,400 / L 227,400', recommendedR: 'K-flex+IOL', recommendedL: 'K-flex', surgeryReserveDate: '2026-05-01', surgeryDate: '2026-05-01', surgeryR: 'K-flex', surgeryL: 'K-flex', surgeon: '최한뉘', payment: '4,548,000', counselor: '이혜민', doctor: '최한뉘', optometrist: '이혜민', birth: '1959-09-27', motiveL: '소개', motiveM: '지인소개', examMemo: '양안 K-flex 단초점' }),
  base({ chartNo: '2228836', name: '안현석', nameEng: 'An Hyunseok', examType: 'C_일반검사', examTime: '10:30', recommendedR: '', recommendedL: '', counselor: 'BS미지정', doctor: '최한뉘', birth: '1968-04-15', grade: 'G', job: '군인', motiveL: '기타', examMemo: '백내장 일반검사' }),
  base({ chartNo: '2228946', name: '최병호', nameEng: 'Choi Byungho', examType: 'C_일반검사', examTime: '14:30', route: 'CRM', counselor: 'BS미지정', doctor: '최한뉘', birth: '1957-12-01', grade: 'G', job: '자영업', motiveL: '소개', motiveM: '직원소개', examMemo: '' }),
  base({ chartNo: '2227743', name: '김경선', nameEng: 'Kim Kyungsun', examType: 'C_일반검사', examTime: '09:30', recommendedR: '', recommendedL: '', counselor: '박선미', doctor: '이인식', birth: '1961-06-22', examStop: 'Y', cancelCode: '121', cancelMemo: '본인 사정', examMemo: '검사 중단' }),
]
