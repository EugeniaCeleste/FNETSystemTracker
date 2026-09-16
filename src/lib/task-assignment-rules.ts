export interface ValidatedCrewPair {
  primary: string;
  collaborator: string;
  key: string;
}

export function validateCrewPair(primary: string, collaborator: string): ValidatedCrewPair | null {
  const normalizedPrimary = primary.trim();
  const normalizedCollaborator = collaborator.trim();
  if (!normalizedPrimary || !normalizedCollaborator) return null;
  if (normalizedPrimary.localeCompare(normalizedCollaborator, "es", { sensitivity: "base" }) === 0) return null;
  const members = [normalizedPrimary, normalizedCollaborator].sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
  return { primary: normalizedPrimary, collaborator: normalizedCollaborator, key: members.join(" + ") };
}

export function crewContainsTechnician(pair: ValidatedCrewPair, technician: string): boolean {
  return [pair.primary, pair.collaborator].some((member) => member.localeCompare(technician.trim(), "es", { sensitivity: "base" }) === 0);
}
