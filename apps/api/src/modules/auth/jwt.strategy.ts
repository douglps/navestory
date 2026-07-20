export interface JwtPayload {
  sub: string;
  email: string;
  aud: string;
  user_metadata?: { role?: string };
}
