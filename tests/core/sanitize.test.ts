import { describe, it, expect } from 'vitest'
import { sanitizeUrl } from '../../src/core/sanitize'

describe('sanitizeUrl', () => {
  it('masks token when it is the only query param', () => {
    const url = 'https://api.tiny.com.br/api2/produtos.pesquisar?token=SECRET123'
    expect(sanitizeUrl(url)).toBe('https://api.tiny.com.br/api2/produtos.pesquisar?token=***')
  })

  it('masks token when there are params before it', () => {
    const url = 'https://api.tiny.com.br/api2/produtos.pesquisar?page=1&token=SECRET123'
    expect(sanitizeUrl(url)).toBe('https://api.tiny.com.br/api2/produtos.pesquisar?page=1&token=***')
  })

  it('masks token when there are params after it', () => {
    const url = 'https://api.tiny.com.br/api2/produtos.pesquisar?token=SECRET123&page=1'
    expect(sanitizeUrl(url)).toBe('https://api.tiny.com.br/api2/produtos.pesquisar?token=***&page=1')
  })

  it('masks token when surrounded by other params', () => {
    const url = 'https://api.tiny.com.br/api2/produtos?formato=json&token=ABC&page=2'
    expect(sanitizeUrl(url)).toBe('https://api.tiny.com.br/api2/produtos?formato=json&token=***&page=2')
  })

  it('does not modify URLs without a token param', () => {
    const url = 'https://api.tiny.com.br/api2/produtos?page=1'
    expect(sanitizeUrl(url)).toBe(url)
  })

  it('does not modify URLs with no query string', () => {
    const url = 'https://api.tiny.com.br/api2/produtos'
    expect(sanitizeUrl(url)).toBe(url)
  })

  it('handles empty token value', () => {
    const url = 'https://api.tiny.com.br/api2/produtos?token='
    expect(sanitizeUrl(url)).toBe('https://api.tiny.com.br/api2/produtos?token=***')
  })

  it('masks all occurrences when token appears multiple times', () => {
    const url = 'https://api.tiny.com.br/api2?token=ABC&other=x&token=DEF'
    expect(sanitizeUrl(url)).toBe('https://api.tiny.com.br/api2?token=***&other=x&token=***')
  })

  it('does not treat partial word matches as token (e.g. "mytoken")', () => {
    const url = 'https://api.tiny.com.br/api2?mytoken=SECRET'
    expect(sanitizeUrl(url)).toBe(url)
  })
})
