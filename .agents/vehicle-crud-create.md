# 🛠️ Skill: `vehicle-crud-create`

**Objetivo**: Criar Server Action + Schema + Migration para cadastro de veículos.

**Input**:
```ts
interface VehicleCreateInput {
  plate: string      // Formato brasileiro: ABC-1234
  brand: string
  model: string
  year: number
  vin?: string       // Opcional
}
```

**Arquivos Gerados**:
```
apps/web/actions/vehicles.ts
packages/validators/src/vehicle.schemas.ts
supabase/migrations/xxxx_create_vehicles.sql
```

**Regras**:
- [ ] RLS: `user_id = auth.uid()` na policy
- [ ] Zod: `plate.regex(/^\w{3}-?\w{4}$/)`
- [ ] Calm UI: variantes pastéis para status
- [ ] Audit: log em `vehicle_audit_log`

**Exemplo de Uso**:
```ts
import { createVehicle } from '@/actions/vehicles'

const result = await createVehicle(formData)
if (result.success) {
  toast.success('Veículo cadastrado')
  revalidateTag('fleet-vehicles')
}
```
