// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LoginPage } from './LoginPage'

// TanStack Router의 useNavigate는 RouterProvider 컨텍스트가 필요하므로 목으로 대체한다.
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

afterEach(cleanup)

describe('LoginPage', () => {
  it('아이디·비밀번호 입력 필드와 로그인 버튼을 렌더한다', () => {
    render(<LoginPage />)

    expect(screen.getByPlaceholderText('아이디 입력')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('비밀번호 입력')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('빈 값으로 제출하면 Zod 검증 메시지를 보여준다', async () => {
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('아이디를 입력해주세요')).toBeInTheDocument()
    expect(await screen.findByText('비밀번호를 입력해주세요')).toBeInTheDocument()
  })
})
