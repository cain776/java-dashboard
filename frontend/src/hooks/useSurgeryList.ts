import { useQuery } from '@tanstack/react-query'
import { surgeryListApi, type SurgeryListItem } from '@/api/surgeryList'
import { EXAM_LIST_MOCK } from '@/mocks/examListData'
import { useDataSourceStore } from '@/stores/dataSourceStore'

const mockSurgeryRows = (from: string, to: string): SurgeryListItem[] =>
  EXAM_LIST_MOCK
    .filter((row) => row.surgeryDate >= from && row.surgeryDate <= to)
    .map((row) => ({
      chartNo: row.chartNo,
      name: row.name,
      nameEng: row.nameEng,
      surgeryCategory: '시력교정',
      surgeryDate: row.surgeryDate,
      examDate: row.examDate,
      patientType: row.surgeryRegDate >= from && row.surgeryRegDate <= to ? '신환' : '구환',
      surgeryReserveDate: row.surgeryReserveDate,
      surgeryRegDate: row.surgeryRegDate,
      surgeryTime: row.examTime,
      surgeryR: row.surgeryR,
      surgeryL: row.surgeryL,
      recommendedR: row.recommendedR,
      recommendedL: row.recommendedL,
      estimate: row.estimate,
      surgeryRate: row.surgeryRate,
      payment: row.payment,
      surgeon: row.surgeon,
      counselor: row.counselor,
      doctor: row.doctor,
      optometrist: row.optometrist,
      birth: row.birth,
      lunar: row.lunar,
      phone1: row.phone1,
      phone2: row.phone2,
      email: row.email,
      zip: row.zip,
      addr1: row.addr1,
      addr2: row.addr2,
      memo: row.memo,
      grade: row.grade,
      job: row.job,
      lastVisit: row.lastVisit,
      route: row.route,
      section: row.section,
      motiveL: row.motiveL,
      motiveM: row.motiveM,
      motiveS: row.motiveS,
      motiveMemo: row.motiveMemo,
      examMemo: row.examMemo,
      insurance: row.insurance,
      nationality: row.nationality,
    }))

/**
 * 수술자 리스트 조회 훅. 수술일 범위(from~to)로 서버 조회.
 */
export function useSurgeryList(from: string, to: string, enabled = true) {
  const source = useDataSourceStore((state) => state.source)
  const isMock = source === 'mock'

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['surgery-list', from, to, source],
    queryFn: async () => (isMock ? mockSurgeryRows(from, to) : surgeryListApi.getSurgeryList(from, to)),
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: enabled ? (data ?? []) as SurgeryListItem[] : [],
    isLoading,
    isFetching,
    isError,
  }
}
