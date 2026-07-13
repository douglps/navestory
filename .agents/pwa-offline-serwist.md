# 🛠️ Skill: `pwa-offline-serwist`

**Objetivo**: Estratégia Offline-First com Serwist (PWA).

**Arquivos Gerados**:
```
apps/web/serwist.ts
apps/web/manifest.json
apps/web/app/offline/page.tsx
```

**Regras**:
- [ ] Cache: assets estáticos + API responses (stale-while-revalidate)
- [ ] Offline page: fallback para rotas críticas
- [ ] Manifest: ícones 192x192 + 512x512
- [ ] Update: notificar usuário quando nova versão disponível

**Exemplo de Cache Strategy**:
```ts
Serwist.precacheAndRoute({
  match: ({ request, url }) => {
    return request.destination === 'image' || 
           url.pathname.startsWith('/api/fleet')
  },
  handler: 'StaleWhileRevalidate'
})
```
