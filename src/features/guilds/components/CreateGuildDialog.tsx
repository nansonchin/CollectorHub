"use client"

const ERROR_MESSAGES: Record<string, string> = {
  NAME_TAKEN: "That name is already taken. Your Gold was not charged.",
  ALREADY_IN_GUILD: "You are already in a guild. Leave it first.",
  INSUFFICIENT_FUNDS: "You don't have enough Gold to create a guild.",
  INVALID_BODY: "Check the name (letters, numbers, spaces, - _ ') and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};



const inputClass =
  "mt-1.5 h-12 w-full rounded-xl bg-paper px-4 font-normal outline-none ring-1 ring-transparent focus:ring-ink";

const buttonBase =
  "h-11 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

