type ProfileRow = {
  user_id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  role: "user" | "admin";
  login_method: string | null;
  created_at: string;
  updated_at: string;
  last_signed_in: string | null;
};

export function toProfile(row: ProfileRow) {
  return {
    id: row.user_id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: row.role,
    loginMethod: row.login_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSignedIn: row.last_signed_in,
  };
}
