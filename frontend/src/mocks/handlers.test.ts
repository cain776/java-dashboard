import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = dirname(dirname(fileURLToPath(import.meta.url)))

const walk = (dir: string): string[] =>
  readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry)
      return statSync(path).isDirectory() ? walk(path) : [path]
    })

const read = (path: string) => readFileSync(path, 'utf8')

const unique = (values: string[]) => [...new Set(values)].sort()

describe('MSW handlers', () => {
  it('frontend API 호출 경로는 MSW opt-in 모드에서 모두 처리된다', () => {
    const apiPaths = unique(
      walk(join(srcDir, 'api'))
        .filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts'))
        .flatMap((path) => {
          const source = read(path)
          return [
            ...source.matchAll(/withQuery\('([^']+)'/g),
            ...source.matchAll(/api\.(?:get|post|put|delete)<[^>]+>\('([^']+)'/g),
          ].map((match) => match[1])
        }),
    )

    const handlerPaths = unique(
      walk(join(srcDir, 'mocks', 'handlers'))
        .filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts'))
        .flatMap((path) =>
          [...read(path).matchAll(/http\.(?:get|post|put|delete)\('\/api([^']+)'/g)]
            .map((match) => match[1]),
        ),
    )

    expect(apiPaths.filter((path) => !handlerPaths.includes(path))).toEqual([])
  })
})
