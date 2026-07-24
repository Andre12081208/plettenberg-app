import { createContext, useContext, useState } from 'react'
import { translations } from './translations.js'

const LanguageContext = createContext({ language: 'de', setLanguage: () => {}, t: (key) => key })

export function LanguageProvider({ initialLanguage, children }) {
  const [language, setLanguage] = useState(initialLanguage || 'de')

  function t(key) {
    const parts = key.split('.')

    let node = translations[language] || translations.de
    for (const part of parts) {
      node = node?.[part]
    }
    if (node != null) return node

    let fallback = translations.de
    for (const part of parts) {
      fallback = fallback?.[part]
    }
    return fallback ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
