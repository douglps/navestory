import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_EXPENSE_CATEGORY_VALUES } from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import type { CreateCategoryDto } from "./dto/create-category.dto";

export interface UserCategory {
  id: string;
  user_id: string;
  value: string;
  label: string;
  created_at: string;
}

const CUSTOM_CATEGORY_LIMIT = 20;
const UNIQUE_VIOLATION_CODE = "23505";

/**
 * @spec SPEC-20260602-004
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly configService: ConfigService) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /**
   * @spec SPEC-20260602-004 RF-01, CA-07
   */
  async findAll(
    accessToken: string,
    userId: string,
  ): Promise<{ default: typeof DEFAULT_EXPENSE_CATEGORIES; custom: UserCategory[] }> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("user_categories")
      .select("id, user_id, value, label, created_at")
      .eq("user_id", userId)
      .order("label", { ascending: true });

    if (error) {
      throw new NotFoundException("Não foi possível listar as categorias");
    }

    return { default: DEFAULT_EXPENSE_CATEGORIES, custom: (data ?? []) as UserCategory[] };
  }

  /**
   * @spec SPEC-20260602-004 RF-02, RF-03, RF-04, RF-05, CA-01..05, R-CAT-01, R-CAT-02, R-CAT-03
   */
  async create(accessToken: string, userId: string, dto: CreateCategoryDto): Promise<UserCategory> {
    if ((DEFAULT_EXPENSE_CATEGORY_VALUES as readonly string[]).includes(dto.value)) {
      throw new ConflictException("Já é uma categoria padrão");
    }

    const client = this.clientForUser(accessToken);

    const { count, error: countError } = await client
      .from("user_categories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw new NotFoundException("Não foi possível validar o limite de categorias");
    }
    if ((count ?? 0) >= CUSTOM_CATEGORY_LIMIT) {
      throw new UnprocessableEntityException("Limite de 20 categorias personalizadas atingido");
    }

    const { data, error } = await client
      .from("user_categories")
      .insert({ ...dto, user_id: userId })
      .select("id, user_id, value, label, created_at")
      .single();

    if (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException("Categoria já existe");
      }
      throw new NotFoundException("Não foi possível criar a categoria");
    }

    return data as UserCategory;
  }

  /**
   * @spec SPEC-20260602-004 RF-06, CA-06
   */
  async remove(accessToken: string, userId: string, categoryId: string): Promise<void> {
    const client = this.clientForUser(accessToken);

    const { data: existing, error: findError } = await client
      .from("user_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("user_id", userId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException("Categoria não encontrada");
    }

    const { error } = await client
      .from("user_categories")
      .delete()
      .eq("id", categoryId)
      .eq("user_id", userId);

    if (error) {
      throw new NotFoundException("Não foi possível remover a categoria");
    }
  }
}
