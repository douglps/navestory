import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import type { CreateGroupDto } from "./dto/create-group.dto";
import type { SetGroupMembersDto } from "./dto/set-group-members.dto";
import type { UpdateGroupDto } from "./dto/update-group.dto";

export interface VehicleGroup {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  [key: string]: unknown;
}

const GROUP_COLUMNS = "id, user_id, name, color, created_at, updated_at";

/**
 * @spec SPEC-20260602-003
 * Nota: a spec original previa gerenciamento exclusivo via Server Actions do
 * Next.js (sem REST API). Esta implementação segue o padrão arquitetural
 * consolidado em `docs/architecture/overview.md` e já estabelecido em
 * SPEC-20260602-002 (VehiclesModule): NestJS REST API + TanStack Query.
 * Ver changelog da spec.
 */
@Injectable()
export class VehicleGroupsService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
    private readonly configService: ConfigService,
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /**
   * @spec SPEC-20260602-003 RF-01, RF-02, CA-01
   */
  async create(accessToken: string, userId: string, dto: CreateGroupDto): Promise<VehicleGroup> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicle_groups")
      .insert({ ...dto, user_id: userId })
      .select(GROUP_COLUMNS)
      .single();

    if (error || !data) {
      throw new NotFoundException("Não foi possível criar o grupo");
    }
    return data as VehicleGroup;
  }

  /**
   * @spec SPEC-20260602-003 RF-08
   */
  async findAll(accessToken: string, userId: string): Promise<VehicleGroup[]> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicle_groups")
      .select(`${GROUP_COLUMNS}, vehicle_group_members(count)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new NotFoundException("Não foi possível listar os grupos");
    }

    return ((data ?? []) as Array<VehicleGroup & { vehicle_group_members?: { count: number }[] }>).map(
      (group) => ({
        ...group,
        member_count: group.vehicle_group_members?.[0]?.count ?? 0,
      }),
    );
  }

  /**
   * @spec SPEC-20260602-003 RF-03, CA-08
   */
  async update(
    accessToken: string,
    userId: string,
    groupId: string,
    dto: UpdateGroupDto,
  ): Promise<VehicleGroup> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicle_groups")
      .update(dto)
      .eq("id", groupId)
      .eq("user_id", userId)
      .select(GROUP_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Grupo não encontrado");
    }
    return data as VehicleGroup;
  }

  /**
   * @spec SPEC-20260602-003 RF-04, R-GRP-04, CA-07
   * Hard-delete; membros são removidos por cascade FK.
   */
  async remove(accessToken: string, userId: string, groupId: string): Promise<void> {
    const client = this.clientForUser(accessToken);

    const { data: existing, error: findError } = await client
      .from("vehicle_groups")
      .select("id")
      .eq("id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException("Grupo não encontrado");
    }

    const { error } = await client.from("vehicle_groups").delete().eq("id", groupId).eq("user_id", userId);
    if (error) {
      throw new NotFoundException("Não foi possível remover o grupo");
    }
  }

  /**
   * @spec SPEC-20260602-003 RF-05, RF-06, RF-07, R-GRP-01, R-GRP-02, R-GRP-03, CA-04, CA-05, CA-06
   * Replace-all não-atômico: apaga todos os membros e insere os válidos.
   */
  async setMembers(
    accessToken: string,
    userId: string,
    groupId: string,
    dto: SetGroupMembersDto,
  ): Promise<{ vehicleIds: string[] }> {
    const client = this.clientForUser(accessToken);

    const { data: group, error: groupError } = await client
      .from("vehicle_groups")
      .select("id")
      .eq("id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (groupError || !group) {
      throw new NotFoundException("Grupo não encontrado");
    }

    let validVehicleIds: string[] = [];
    if (dto.vehicleIds.length > 0) {
      const { data: vehicles, error: vehiclesError } = await client
        .from("vehicles")
        .select("id")
        .in("id", dto.vehicleIds)
        .eq("user_id", userId)
        .is("deleted_at", null);

      if (vehiclesError) {
        throw new NotFoundException("Não foi possível validar os veículos informados");
      }
      validVehicleIds = (vehicles ?? []).map((vehicle) => (vehicle as { id: string }).id);
    }

    const { error: deleteError } = await client
      .from("vehicle_group_members")
      .delete()
      .eq("group_id", groupId);
    if (deleteError) {
      throw new NotFoundException("Não foi possível atualizar os membros do grupo");
    }

    if (validVehicleIds.length > 0) {
      const { error: insertError } = await client
        .from("vehicle_group_members")
        .insert(validVehicleIds.map((vehicleId) => ({ group_id: groupId, vehicle_id: vehicleId })));
      if (insertError) {
        throw new NotFoundException("Não foi possível atualizar os membros do grupo");
      }
    }

    return { vehicleIds: validVehicleIds };
  }
}
