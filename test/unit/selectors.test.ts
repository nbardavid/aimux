import { describe, expect, test } from 'bun:test'

import { filterSessions, filterSnippets } from '../../src/state/selectors'

describe('state selectors', () => {
  test('filters sessions by name and project path', () => {
    expect(
      filterSessions(
        [
          {
            id: 's1',
            name: 'Main project',
            projectPath: '/tmp/alpha',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            lastOpenedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 's2',
            name: 'Infra',
            projectPath: '/tmp/beta',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            lastOpenedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        'beta'
      )
    ).toHaveLength(1)
  })

  test('filters snippets by name and content', () => {
    expect(
      filterSnippets(
        [
          { id: 'n1', name: 'Review', content: 'Check for bugs' },
          { id: 'n2', name: 'Explain', content: 'Step by step' },
        ],
        'bugs'
      )
    ).toEqual([{ id: 'n1', name: 'Review', content: 'Check for bugs' }])
  })
})
