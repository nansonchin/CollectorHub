export type GuildRole = "OWNER" | "MODERATOR" |"MEMBER"

export const canReviewRequests=(role:GuildRole)=>role!=="MEMBER"

export const canEditAnnouncement = (role:GuildRole) => role!=="MEMBER"

export const canEditProfile = (role: GuildRole) => role === "OWNER";

export const canManageRoles = (role: GuildRole) => role === "OWNER";

export function  canKick(actor:GuildRole,target:GuildRole){
    if(target === "OWNER"){
        return false
    }

    if(actor === "OWNER"){
        return true
    }

    if(actor === "MODERATOR"){
        return target ==="MEMBER"
    }

    return false
}

export const ROLE_LABELS: Record<GuildRole, string> = {
  OWNER: "Owner",
  MODERATOR: "Moderator",
  MEMBER: "Member",
};