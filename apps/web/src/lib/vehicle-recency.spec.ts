import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRecentVehicleIds, recordVehicleAccess } from "./vehicle-recency";

const STORAGE_KEY = "navestory-recent-vehicle-ids";

/**
 * @spec SPEC-20260602-001 RF-12
 */
describe("vehicle-recency", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("getRecentVehicleIds retorna [] quando não há nada salvo", () => {
    expect(getRecentVehicleIds()).toEqual([]);
  });

  it("recordVehicleAccess grava o veículo mais recente primeiro", () => {
    recordVehicleAccess("v1");
    recordVehicleAccess("v2");

    expect(getRecentVehicleIds()).toEqual(["v2", "v1"]);
  });

  it("recordVehicleAccess remove duplicata e promove o id para o topo", () => {
    recordVehicleAccess("v1");
    recordVehicleAccess("v2");
    recordVehicleAccess("v1");

    expect(getRecentVehicleIds()).toEqual(["v1", "v2"]);
  });

  it("recordVehicleAccess respeita o limite máximo de entradas", () => {
    for (const id of ["v1", "v2", "v3", "v4", "v5", "v6"]) {
      recordVehicleAccess(id);
    }

    expect(getRecentVehicleIds()).toEqual(["v6", "v5", "v4", "v3", "v2"]);
  });

  it("getRecentVehicleIds respeita o limit informado", () => {
    recordVehicleAccess("v1");
    recordVehicleAccess("v2");
    recordVehicleAccess("v3");

    expect(getRecentVehicleIds(2)).toEqual(["v3", "v2"]);
  });

  it("getRecentVehicleIds retorna [] quando o JSON salvo é inválido", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not-json");

    expect(getRecentVehicleIds()).toEqual([]);
  });

  it("getRecentVehicleIds retorna [] quando o valor salvo não é um array", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));

    expect(getRecentVehicleIds()).toEqual([]);
  });

  it("getRecentVehicleIds descarta entradas que não são string", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["v1", 42, null, "v2"]));

    expect(getRecentVehicleIds()).toEqual(["v1", "v2"]);
  });
});
