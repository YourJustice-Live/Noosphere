import { Address, BigInt, ByteArray, Bytes } from "@graphprotocol/graph-ts";
import {
  CaseEntity,
  CaseEventEntity,
  JurisdictionEntity,
} from "../generated/schema";

export function getJurisdictionEntity(id: string): JurisdictionEntity {
  let jurisdictionEntity = JurisdictionEntity.load(id);
  if (!jurisdictionEntity) {
    jurisdictionEntity = new JurisdictionEntity(id);
    jurisdictionEntity.save();
  }
  return jurisdictionEntity;
}

export function saveCaseEventEntity(
  caseEntity: CaseEntity,
  caseContractAddress: Address,
  eventTransactionHash: Bytes,
  eventBlockTimestamp: BigInt,
  eventType: string,
  eventDataJson: string
): void {
  let caseEventEntityId = `${caseContractAddress.toHexString()}_${eventTransactionHash.toHexString()}`;
  let caseEventEntity = new CaseEventEntity(caseEventEntityId);
  caseEventEntity.caseEntity = caseEntity.id;
  caseEventEntity.createdDate = eventBlockTimestamp;
  caseEventEntity.type = eventType;
  caseEventEntity.data = Bytes.fromByteArray(ByteArray.fromUTF8(eventDataJson));
  caseEventEntity.save();
}
