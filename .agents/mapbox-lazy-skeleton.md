# 🛠️ Skill: `mapbox-lazy-skeleton`

**Objetivo**: Mapa Mapbox com lazy loading + skeleton CLS zero.

**Arquivos Gerados**:
```
apps/web/components/maps/vehicle-map.tsx
apps/web/components/maps/map-skeleton.tsx
apps/web/lib/mapbox/lazy-load.ts
```

**Regras**:
- [ ] Lazy: `next/dynamic` com `ssr: false`
- [ ] Skeleton: mesma dimensão do mapa final
- [ ] Token: variável de ambiente (nunca hardcoded)
- [ ] Acessibilidade: `aria-label="Mapa da frota"`

**Exemplo**:
```tsx
const VehicleMap = dynamic(() => import('./vehicle-map'), {
  ssr: false,
  loading: () => <MapSkeleton className="h-64 w-full" />
})
```
