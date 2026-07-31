function hexToLinearRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = Number.parseInt(value, 16);
  const channelToLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return [channelToLinear((int >> 16) & 255), channelToLinear((int >> 8) & 255), channelToLinear(int & 255)];
}

function oklchToLinearRgb(l: number, c: number, hueDeg: number): [number, number, number] {
  const hue = (hueDeg * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const clamp = (channel: number) => Math.min(Math.max(channel, 0), 1);
  return [clamp(r), clamp(g), clamp(bl)];
}

function colorToLinearRgb(color: string): [number, number, number] {
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) return hexToLinearRgb(trimmed);

  const oklchMatch = trimmed.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/i)
    ?? trimmed.match(/^([\d.]+)%\s+([\d.]+)\s+([\d.]+)$/);
  if (!oklchMatch) throw new Error(`Cor não reconhecida (esperado hex ou "oklch(L% C H)"): ${color}`);

  const [, l, c, h] = oklchMatch;
  return oklchToLinearRgb(Number(l) / 100, Number(c), Number(h));
}

export function relativeLuminance(color: string): number {
  const [r, g, b] = colorToLinearRgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(colorA: string, colorB: string): number {
  const luminanceA = relativeLuminance(colorA) + 0.05;
  const luminanceB = relativeLuminance(colorB) + 0.05;
  return luminanceA > luminanceB ? luminanceA / luminanceB : luminanceB / luminanceA;
}

export function wcagLevel(ratio: number): "AAA" | "AA" | "Falha" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "Falha";
}
