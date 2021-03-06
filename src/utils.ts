import { Address, BigInt, ByteArray, Bytes } from "@graphprotocol/graph-ts";
import { Jurisdiction as JurisdictionContract } from "../generated/templates/Jurisdiction/Jurisdiction";
import {
  AccountEntity,
  AvatarNftEntity,
  CaseEntity,
  CaseEventEntity,
  JurisdictionEntity,
  JurisdictionRuleEffectEntity,
  JurisdictionRuleEntity,
} from "../generated/schema";
import {
  JURISDICTION_ROLE_ADMIN_ID,
  JURISDICTION_ROLE_JUDGE_ID,
  JURISDICTION_ROLE_MEMBER_ID,
} from "./constants";

/**
 * Find or create account entity and add avatar nft entity to it.
 */
export function addAvatarNftToAccountEntity(
  account: Address,
  avatarNft: AvatarNftEntity
): void {
  let accountEntity = AccountEntity.load(account.toHexString());
  if (!accountEntity) {
    accountEntity = new AccountEntity(account.toHexString());
  }
  accountEntity.avatarNft = avatarNft.id;
  accountEntity.save();
}

/**
 * Increase amount of positive or negative cases for avatar nft using specified case.
 */
export function addCaseToAvatarNftEntity(
  id: string,
  caseEntity: CaseEntity
): void {
  // Load avatar nft
  let avatarNftEntity = AvatarNftEntity.load(id);
  if (!avatarNftEntity) {
    return;
  }
  // Check case confirmed rules
  let caseConfirmedRules = caseEntity.verdictConfirmedRules;
  if (!caseConfirmedRules || caseConfirmedRules.length == 0) {
    return;
  }
  // Define case is positive or not
  let isCasePositive = true;
  for (let i = 0; i < caseConfirmedRules.length; i++) {
    let caseConfirmedRule = JurisdictionRuleEntity.load(caseConfirmedRules[i]);
    if (caseConfirmedRule && !caseConfirmedRule.isPositive) {
      isCasePositive = false;
    }
  }
  // Update avatar nft
  if (isCasePositive) {
    avatarNftEntity.totalPositiveCases = avatarNftEntity.totalPositiveCases.plus(
      BigInt.fromU32(1)
    );
  } else {
    avatarNftEntity.totalNegativeCases = avatarNftEntity.totalNegativeCases.plus(
      BigInt.fromU32(1)
    );
  }
  avatarNftEntity.save();
}

/**
 * Find avatar nft entity and add jurisdiction entity to it.
 */
export function addJurisdictionToAvatarNftEntity(
  id: string,
  jurisdiction: JurisdictionEntity
): void {
  let avatarNftEntity = AvatarNftEntity.load(id);
  if (!avatarNftEntity) {
    return;
  }
  let jurisdictions = avatarNftEntity.jurisdictions;
  jurisdictions.push(jurisdiction.id);
  avatarNftEntity.jurisdictions = jurisdictions;
  avatarNftEntity.save();
}

/**
 * Find avatar nft entity by id and remove jurisdiction entity from it.
 */
export function removeJurisdctionFromAvatarEntity(
  id: string,
  jurisdiction: JurisdictionEntity
): void {
  let avatarNftEntity = AvatarNftEntity.load(id);
  if (!avatarNftEntity) {
    return;
  }
  let jurisdictions = avatarNftEntity.jurisdictions;
  const jurisdictionIndex = jurisdictions.indexOf(jurisdiction.id);
  if (jurisdictionIndex > -1) {
    jurisdictions.splice(jurisdictionIndex, 1);
  }
  avatarNftEntity.jurisdictions = jurisdictions;
  avatarNftEntity.save();
}

/**
 * Load jurisdiction by id or create new.
 */
export function getJurisdictionEntity(id: string): JurisdictionEntity {
  let jurisdictionEntity = JurisdictionEntity.load(id);
  if (!jurisdictionEntity) {
    // Load jurisdiction name from contract
    let jurisdictionContract = JurisdictionContract.bind(
      Address.fromString(id)
    );
    let jurisdictionContractName = jurisdictionContract.name();
    // Create jurisdiction enity
    jurisdictionEntity = new JurisdictionEntity(id);
    jurisdictionEntity.address = id;
    jurisdictionEntity.name = jurisdictionContractName;
    jurisdictionEntity.rulesCount = 0;
    jurisdictionEntity.casesCount = 0;
    jurisdictionEntity.members = [];
    jurisdictionEntity.judges = [];
    jurisdictionEntity.admins = [];
    jurisdictionEntity.membersCount = 0;
    jurisdictionEntity.save();
  }
  return jurisdictionEntity;
}

/**
 * Update jurisdiction role participants.
 */
export function updateJurisdictionEntityRoles(
  jurisdiction: JurisdictionEntity,
  role: string,
  participants: string[],
  participantsCount: i32,
): void {
  if (role == JURISDICTION_ROLE_MEMBER_ID) {
    jurisdiction.members = participants;
    jurisdiction.membersCount = participantsCount;
  }
  if (role == JURISDICTION_ROLE_JUDGE_ID) {
    jurisdiction.judges = participants;
  }
  if (role == JURISDICTION_ROLE_ADMIN_ID) {
    jurisdiction.admins = participants;
  }
  jurisdiction.save();
}

/**
 * Check if a jurisdiction rule will be positive if an additional effect of the rule is added.
 */
export function isJurisdictionRuleEntityPositive(
  rule: JurisdictionRuleEntity,
  additionalRuleEffect: JurisdictionRuleEffectEntity
): boolean {
  let isRulePositive = true;
  // Prepare array with rule effect ids
  let ruleEffects = rule.effects;
  let fixedRuleEffects: Array<string> = ruleEffects
    ? ruleEffects
    : new Array<string>();
  // Check rule effects
  for (let i = 0; i < fixedRuleEffects.length; i++) {
    let ruleEffect = JurisdictionRuleEffectEntity.load(fixedRuleEffects[i]);
    if (!ruleEffect) {
      continue;
    }
    if (ruleEffect.name == additionalRuleEffect.name) {
      continue;
    }
    if (!ruleEffect.direction) {
      isRulePositive = false;
    }
  }
  // Check new rule effect
  if (!additionalRuleEffect.direction) {
    isRulePositive = false;
  }
  // Return result
  return isRulePositive;
}

/**
 * Create new case event entity.
 */
export function saveCaseEventEntity(
  caseEntity: CaseEntity,
  caseContractAddress: Address,
  eventTransactionHash: Bytes,
  eventLogIndex: BigInt,
  eventBlockTimestamp: BigInt,
  eventType: string,
  eventDataJson: string
): void {
  let caseEventEntityId = `${caseContractAddress.toHexString()}_${eventTransactionHash.toHexString()}_${eventLogIndex.toString()}`;
  let caseEventEntity = new CaseEventEntity(caseEventEntityId);
  caseEventEntity.caseEntity = caseEntity.id;
  caseEventEntity.createdDate = eventBlockTimestamp;
  caseEventEntity.type = eventType;
  caseEventEntity.data = Bytes.fromByteArray(ByteArray.fromUTF8(eventDataJson));
  caseEventEntity.save();
}
