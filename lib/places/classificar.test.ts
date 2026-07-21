import { describe, expect, it } from 'vitest'
import { classificar } from './classificar'

describe('classificar', () => {
  describe('sem_nada — nenhum site declarado', () => {
    it('classifica ausencia de websiteUri', () => {
      expect(classificar({})).toBe('sem_nada')
      expect(classificar({ websiteUri: undefined })).toBe('sem_nada')
      expect(classificar({ websiteUri: null })).toBe('sem_nada')
      expect(classificar({ websiteUri: '' })).toBe('sem_nada')
    })
  })

  describe('lead_quente — presenca digital alugada, o melhor lead', () => {
    it.each([
      'https://www.instagram.com/salaodabruna',
      'https://instagram.com/petshop',
      'http://Instagram.COM/CAIXA_ALTA',
      'https://www.facebook.com/barbearia',
      'https://facebook.com/pg/restaurante',
      'https://linktr.ee/estudiotattoo',
      'https://linktree.com/loja',
      'https://wa.me/5511999999999',
      'https://beacons.ai/consultorio',
    ])('%s', (websiteUri) => {
      expect(classificar({ websiteUri })).toBe('lead_quente')
    })
  })

  describe('tem_site — filtrado fora por padrao', () => {
    it.each([
      'https://www.salaodabruna.com.br',
      'https://restaurante.com',
      'http://clinica.med.br/agendamento',
      'https://loja.shop',
    ])('%s', (websiteUri) => {
      expect(classificar({ websiteUri })).toBe('tem_site')
    })
  })

  describe('bordas', () => {
    it('pega o dominio social em qualquer posicao da URL', () => {
      // Alguns places apontam para uma pagina interna do perfil.
      expect(classificar({ websiteUri: 'https://m.facebook.com/loja/about' })).toBe(
        'lead_quente',
      )
    })

    it('site proprio que apenas linka o instagram continua sendo site proprio', () => {
      expect(classificar({ websiteUri: 'https://minhaloja.com.br/#instagram' })).toBe(
        'tem_site',
      )
    })

    it('e estavel entre chamadas — a regex nao carrega estado', () => {
      // Guarda contra a armadilha da flag /g com lastIndex.
      const p = { websiteUri: 'https://instagram.com/x' }
      expect(classificar(p)).toBe('lead_quente')
      expect(classificar(p)).toBe('lead_quente')
      expect(classificar(p)).toBe('lead_quente')
    })
  })
})
