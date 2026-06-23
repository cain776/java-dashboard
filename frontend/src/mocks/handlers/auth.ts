import { http, HttpResponse } from 'msw'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { loginId: string; password: string }

    if (body.loginId && body.password) {
      const loginId = body.loginId.trim().toLowerCase()

      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-jwt-token-123',
          user: {
            id: 1,
            loginId,
            email: loginId === 'admin' ? 'admin@bviit.com' : `${loginId}@bviit.local`,
            name: loginId === 'admin' ? '관리자' : loginId,
          },
        },
      })
    }

    return HttpResponse.json({ success: false, status: 401, message: '로그인 실패' }, { status: 401 })
  }),
]
