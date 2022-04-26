import { JurisdictionEntity } from "../generated/schema";

export function getJurisdictionEntity(id: string): JurisdictionEntity {
  let jurisdictionEntity = JurisdictionEntity.load(id);
  if (!jurisdictionEntity) {
    jurisdictionEntity = new JurisdictionEntity(id);
    jurisdictionEntity.save();
  }
  return jurisdictionEntity;
}
