import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CategoriesService } from "./categories.service";
import {
  createCategoryDtoSchema,
  type CreateCategoryDto,
} from "./dto/create-category.dto";

/**
 * @spec SPEC-20260602-004
 */
@ApiTags("categories")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: "Listar categorias padrão + personalizadas do usuário",
  })
  @ApiResponse({ status: 200, description: "Categorias" })
  async findAll(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const categories = await this.categoriesService.findAll(
      accessToken,
      userId,
    );
    return { data: categories };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createCategoryDtoSchema))
  @ApiOperation({ summary: "Criar categoria personalizada" })
  @ApiResponse({ status: 201, description: "Categoria criada" })
  @ApiResponse({
    status: 409,
    description: "Value já existe (padrão ou personalizada)",
  })
  @ApiResponse({ status: 422, description: "Limite de 20 categorias atingido" })
  async create(
    @Req() req: Request,
    @UserId() userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const category = await this.categoriesService.create(
      accessToken,
      userId,
      dto,
    );
    return { data: category };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover categoria personalizada" })
  @ApiResponse({ status: 204, description: "Categoria removida" })
  @ApiResponse({ status: 404, description: "Categoria não encontrada" })
  async remove(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.categoriesService.remove(accessToken, userId, id);
  }

  private extractAccessToken(req: Request): string {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }
    const cookieToken = req.cookies?.navestory_access_token as
      | string
      | undefined;
    if (cookieToken) {
      return cookieToken;
    }
    throw new UnauthorizedException("Token de acesso ausente");
  }
}
