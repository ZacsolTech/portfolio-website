import { GoogleGenAI } from '@google/genai'

export function getGenAI() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  return new GoogleGenAI({ apiKey: key })
}

export const models = {
  pro: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
  flash: process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash',
} as const
