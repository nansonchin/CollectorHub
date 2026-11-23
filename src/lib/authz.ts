export type Role ="PLAYER" | "MODERATOR" |"ADMIN"

export const isStaff = (role:Role) =>role === "MODERATOR" || "ADMIN"

export const isAdmin = (role:Role) =>role ==="ADMIN"
