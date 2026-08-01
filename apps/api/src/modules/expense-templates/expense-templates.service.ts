import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ExpenseTemplate } from "@navestory/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import type { CreateExpenseTemplateDto } from "./dto/create-expense-template.dto";
import type { UpdateExpenseTemplateDto } from "./dto/update-expense-template.dto";

const TEMPLATE_LIMIT = 20;
const TEMPLATE_COLUMNS = `id, user_id, vehicle_id, name, category, amount, description, liters,
  fuel_type, supplier, last_used_at, created_at, updated_at`;

/**
 * @spec SPEC-20260601-003
 */
@Injectable()
export class ExpenseTemplatesService {
  constructor(private readonly configService: ConfigService) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /**
   * @spec SPEC-20260601-003 RF-01, RNF-01
   */
  async findAll(
    accessToken: string,
    userId: string,
  ): Promise<ExpenseTemplate[]> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("expense_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("user_id", userId)
      .order("last_used_at", { ascending: false });

    if (error) {
      throw new NotFoundException(
        "Não foi possível listar os modelos de despesa",
      );
    }
    return (data ?? []) as ExpenseTemplate[];
  }

  /**
   * @spec SPEC-20260601-003 RF-06, RF-07, RNF-06
   */
  async create(
    accessToken: string,
    userId: string,
    dto: CreateExpenseTemplateDto,
  ): Promise<ExpenseTemplate> {
    const client = this.clientForUser(accessToken);

    const { data: vehicle, error: vehicleError } = await client
      .from("vehicles")
      .select("id")
      .eq("id", dto.vehicle_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      throw new NotFoundException("Veículo não encontrado");
    }

    const { count, error: countError } = await client
      .from("expense_templates")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw new NotFoundException(
        "Não foi possível validar o limite de modelos",
      );
    }
    if ((count ?? 0) >= TEMPLATE_LIMIT) {
      throw new UnprocessableEntityException(
        "Limite de 20 modelos atingido. Exclua um modelo antes de criar outro.",
      );
    }

    const { data, error } = await client
      .from("expense_templates")
      .insert({ ...dto, user_id: userId })
      .select(TEMPLATE_COLUMNS)
      .single();

    if (error || !data) {
      throw new UnprocessableEntityException("Não foi possível criar o modelo");
    }
    return data as ExpenseTemplate;
  }

  private async patch(
    accessToken: string,
    userId: string,
    templateId: string,
    changes: Record<string, unknown>,
  ): Promise<ExpenseTemplate> {
    const client = this.clientForUser(accessToken);
    const { data, error } = await client
      .from("expense_templates")
      .update(changes)
      .eq("id", templateId)
      .eq("user_id", userId)
      .select(TEMPLATE_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Modelo não encontrado");
    }
    return data as ExpenseTemplate;
  }

  /**
   * @spec SPEC-20260601-003 RF-09
   */
  async update(
    accessToken: string,
    userId: string,
    templateId: string,
    dto: UpdateExpenseTemplateDto,
  ): Promise<ExpenseTemplate> {
    return this.patch(accessToken, userId, templateId, dto);
  }

  /**
   * @spec SPEC-20260601-003 RF-08
   */
  async touch(
    accessToken: string,
    userId: string,
    templateId: string,
  ): Promise<ExpenseTemplate> {
    return this.patch(accessToken, userId, templateId, {
      last_used_at: new Date().toISOString(),
    });
  }

  /**
   * @spec SPEC-20260601-003 RF-10, CA-08
   */
  async remove(
    accessToken: string,
    userId: string,
    templateId: string,
  ): Promise<void> {
    const client = this.clientForUser(accessToken);
    const { data: existing, error: findError } = await client
      .from("expense_templates")
      .select("id")
      .eq("id", templateId)
      .eq("user_id", userId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException("Modelo não encontrado");
    }

    const { error } = await client
      .from("expense_templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", userId);

    if (error) {
      throw new NotFoundException("Não foi possível remover o modelo");
    }
  }
}
