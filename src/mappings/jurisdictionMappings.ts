import { BigInt, ipfs, json, store } from "@graphprotocol/graph-ts";
import {
  ActionEntity,
  AvatarNftEntity,
  AvatarNftReputationEntity,
  CaseEntity,
  JurisdictionRoleEntity,
  JurisdictionRuleEffectEntity,
  JurisdictionRuleEntity
} from "../../generated/schema";
import { Case as CaseTemplate } from "../../generated/templates";
import {
  Case as CaseContract,
  ContractURI
} from "../../generated/templates/Jurisdiction/Case";
import {
  CaseCreated,
  Confirmation,
  OpinionChange,
  Rule,
  RuleEffect,
  TransferByToken
} from "../../generated/templates/Jurisdiction/Jurisdiction";
import {
  addJurisdictionToAvatarNftEntity,
  getJurisdictionEntity, isJurisdictionRuleEntityPositive, removeJurisdctionFromAvatarEntity,
  updateJurisdictionEntityRoles
} from "../utils";

/**
 * Handle a contract uri event to update jurisdiction uri data.
 */
export function handleContractUri(event: ContractURI): void {
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Load uri data
  let uriIpfsHash = event.params.param0.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  // Update jurisdiction
  jurisdictionEntity.uri = event.params.param0;
  jurisdictionEntity.uriData = uriData;
  jurisdictionEntity.save();
}

/**
 * Handle a tranfer by token event to create or update jurisdiction roles.
 */
export function handleTransferByToken(event: TransferByToken): void {
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Define transfer type
  let isTokenMinted = event.params.fromOwnerToken.equals(BigInt.zero());
  let isTokenBurned = event.params.toOwnerToken.equals(BigInt.zero());
  if (isTokenMinted || isTokenBurned) {
    // Find or create jurisdiction role entity
    let jurisdictionRoleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
    let jurisdictionRoleEntity = JurisdictionRoleEntity.load(
      jurisdictionRoleEntityId
    );
    if (!jurisdictionRoleEntity) {
      jurisdictionRoleEntity = new JurisdictionRoleEntity(
        jurisdictionRoleEntityId
      );
      jurisdictionRoleEntity.jurisdiction = jurisdictionEntity.id;
      jurisdictionRoleEntity.roleId = event.params.id;
      jurisdictionRoleEntity.participants = [];
      jurisdictionRoleEntity.participantsCount = 0;
    }
    // Update participants in jurisdiction role entity
    let participants = jurisdictionRoleEntity.participants;
    let participantsCount = jurisdictionRoleEntity.participantsCount;
    if (isTokenMinted) {
      participants.push(event.params.toOwnerToken.toString());
      participantsCount = participantsCount + 1;
    }
    if (isTokenBurned) {
      const accountIndex = participants.indexOf(event.params.fromOwnerToken.toString());
      if (accountIndex > -1) {
        participants.splice(accountIndex, 1);
      }
      participantsCount = participantsCount - 1;
    }
    // Update jurisdiction role entity
    jurisdictionRoleEntity.participants = participants;
    jurisdictionRoleEntity.participantsCount = participantsCount;
    jurisdictionRoleEntity.save();
    // Update jurisdiction role accounts
    updateJurisdictionEntityRoles(
      jurisdictionEntity,
      event.params.id.toString(),
      participants,
      participantsCount,
    )
    // Update and avatar nft entity
    if (isTokenMinted) {
      addJurisdictionToAvatarNftEntity(event.params.toOwnerToken.toString(), jurisdictionEntity);
    }
    if (isTokenBurned) {
      removeJurisdctionFromAvatarEntity(event.params.fromOwnerToken.toString(), jurisdictionEntity);
    }
  }
}

/**
 * Handle a rule event to create or update a jurisdiction rule entity.
 */
export function handleRule(event: Rule): void {
  // Skip if action entity not exists
  let actionEntity = ActionEntity.load(event.params.about.toHexString());
  if (!actionEntity) {
    return;
  }
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Find or create jurisdiction rule
  let isJurisdictionRuleNew = false;
  let jurisdictionRuleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
  let jurisdictionRuleEntity = JurisdictionRuleEntity.load(
    jurisdictionRuleEntityId
  );
  if (!jurisdictionRuleEntity) {
    isJurisdictionRuleNew = true;
    jurisdictionRuleEntity = new JurisdictionRuleEntity(
      jurisdictionRuleEntityId
    );
    jurisdictionRuleEntity.effects = [];
  }
  // Load uri data
  let uriIpfsHash = event.params.uri.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  let uriJson = uriData ? json.fromBytes(uriData) : null;
  let uriJsonObject = uriJson ? uriJson.toObject() : null;
  let uriName = uriJsonObject ? uriJsonObject.get("name") : null;
  let uriNameString = uriName ? uriName.toString() : null;
  // Update jurisdiction rule
  jurisdictionRuleEntity.jurisdiction = jurisdictionEntity.id;
  jurisdictionRuleEntity.about = actionEntity.id;
  jurisdictionRuleEntity.aboutSubject = actionEntity.subject;
  jurisdictionRuleEntity.ruleId = event.params.id;
  jurisdictionRuleEntity.affected = event.params.affected;
  jurisdictionRuleEntity.uri = event.params.uri;
  jurisdictionRuleEntity.uriData = uriData;
  jurisdictionRuleEntity.uriName = uriNameString;
  jurisdictionRuleEntity.negation = event.params.negation;
  jurisdictionRuleEntity.save();
  // Increase rules count if jurisdiction rule is new
  if (isJurisdictionRuleNew) {
    jurisdictionEntity.rulesCount = jurisdictionEntity.rulesCount + 1;
    jurisdictionEntity.save();
  }
}

/**
 * Handle a role effect event to update a rule entity.
 */
export function handleRuleEffect(event: RuleEffect): void {
  // Find rule entity and return if not found
  let ruleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
  let ruleEntity = JurisdictionRuleEntity.load(ruleEntityId);
  if (!ruleEntity) {
    return;
  }
  // Clear rule effects if emitted event with effect from another block
  if (ruleEntity.effectsBlock != event.block.number) {
    for (let i = 0; i < ruleEntity.effects.length; i++) {
      store.remove('JurisdictionRuleEffectEntity', ruleEntity.effects[i]);
    }
    ruleEntity.effects = [];
    ruleEntity.effectsBlock = event.block.number;
  }
  // Find or create rule effect entity
  let ruleEffectEntityId = `${ruleEntityId}_${event.params.name}`;
  let ruleEffectEntity = JurisdictionRuleEffectEntity.load(ruleEffectEntityId);
  if (!ruleEffectEntity) {
    ruleEffectEntity = new JurisdictionRuleEffectEntity(ruleEffectEntityId);
    ruleEffectEntity.rule = ruleEntity.id;
    ruleEffectEntity.name = event.params.name;
  }
  // Update rule effect
  ruleEffectEntity.direction = event.params.direction;
  ruleEffectEntity.value = event.params.value;
  ruleEffectEntity.save();
  // Add new effect to rule
  if (!ruleEntity.effects.includes(ruleEffectEntityId)) {
    let ruleEffects = ruleEntity.effects;
    ruleEffects.push(ruleEffectEntityId);
    ruleEntity.effects = ruleEffects;
  }
  // Check if a rule is positive
  ruleEntity.isPositive = isJurisdictionRuleEntityPositive(ruleEntity, ruleEffectEntity);
  // Save rule
  ruleEntity.save();
}

/**
 * Handle a confirmation event to update a rule entity.
 */
export function handleConfirmation(event: Confirmation): void {
  // Find entity and return if not found
  let jurisdictionRuleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
  let jurisdictionRuleEntity = JurisdictionRuleEntity.load(
    jurisdictionRuleEntityId
  );
  if (!jurisdictionRuleEntity) {
    return;
  }
  // Update entity's params
  jurisdictionRuleEntity.confirmationRuling = event.params.ruling;
  jurisdictionRuleEntity.confirmationEvidence = event.params.evidence;
  jurisdictionRuleEntity.confirmationWitness = event.params.witness;
  jurisdictionRuleEntity.save();
}

/**
 * Handle a case created event to create case entities and case contract.
 */
export function handleCaseCreated(event: CaseCreated): void {
  // Skip if case entity is exists
  if (CaseEntity.load(event.params.contractAddress.toHexString())) {
    return;
  }
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Load case name from contract
  let caseContract = CaseContract.bind(event.params.contractAddress);
  let caseContractName = caseContract.name();
  // Create case entity
  let caseEntity = new CaseEntity(event.params.contractAddress.toHexString());
  caseEntity.name = caseContractName;
  caseEntity.createdDate = event.block.timestamp;
  caseEntity.jurisdiction = jurisdictionEntity.id;
  caseEntity.rules = [];
  caseEntity.participants = [];
  caseEntity.admins = [];
  caseEntity.subjects = [];
  caseEntity.plaintiffs = [];
  caseEntity.judges = [];
  caseEntity.witnesses = [];
  caseEntity.affecteds = [];
  caseEntity.participantsWithConfirmationPosts = [];
  caseEntity.save();
  // Create case contract for subgraph using template
  CaseTemplate.create(event.params.contractAddress);
  // Increase cases count
  jurisdictionEntity.casesCount = jurisdictionEntity.casesCount + 1;
  jurisdictionEntity.save();
}

/**
 * Handle a opinion change event to update avatar reputation.
 */
export function handleOpinionChange(event: OpinionChange): void {
  // Find avatar nft entity and return if not found
  let avatarNftEntity = AvatarNftEntity.load(event.params.tokenId.toString());
  if (!avatarNftEntity) {
    return;
  }
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Find or create reputation entity
  let reputationEntityId = `${event.params.tokenId.toString()}_${
    jurisdictionEntity.id
  }_${event.params.domain.toString()}`;
  let reputationEntity = AvatarNftReputationEntity.load(reputationEntityId);
  if (!reputationEntity) {
    reputationEntity = new AvatarNftReputationEntity(reputationEntityId);
    reputationEntity.jurisdiction = jurisdictionEntity.id;
    reputationEntity.domain = event.params.domain;
    reputationEntity.avatarNft = avatarNftEntity.id;
    reputationEntity.negativeRating = BigInt.zero();
    reputationEntity.positiveRating = BigInt.zero();
  }
  // Update negative rating (rating=false)
  if (event.params.rating === false) {
    avatarNftEntity.totalNegativeRating = avatarNftEntity.totalNegativeRating.plus(
      event.params.score
    );
    reputationEntity.negativeRating = reputationEntity.negativeRating.plus(
      event.params.score
    );
  }
  // Update positive rating (rating=true)
  if (event.params.rating === true) {
    avatarNftEntity.totalPositiveRating = avatarNftEntity.totalPositiveRating.plus(
      event.params.score
    );
    reputationEntity.positiveRating = reputationEntity.positiveRating.plus(
      event.params.score
    );
  }
  // Save entities
  avatarNftEntity.save();
  reputationEntity.save();
}
