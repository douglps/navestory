import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

function renderTable(): ReturnType<typeof render> {
  return render(
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>15/06/26</TableCell>
          <TableCell>R$ 350</TableCell>
        </TableRow>
        <TableRow striped>
          <TableCell>14/06/26</TableCell>
          <TableCell>R$ 120</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

describe("Table", () => {
  it("renderiza cabeçalho e linhas como uma tabela semântica", () => {
    renderTable();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Data" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // 1 header + 2 body
  });

  it("aplica zebra striping só na linha com striped=true", () => {
    renderTable();
    const rows = screen.getAllByRole("row");
    expect(rows[1]).not.toHaveClass("bg-muted/15");
    expect(rows[2]).toHaveClass("bg-muted/15");
  });

  it("célula usa align-top por padrão", () => {
    renderTable();
    expect(screen.getByText("R$ 350")).toHaveClass("align-top");
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = renderTable();
    expect(await axe(container)).toHaveNoViolations();
  });
});
