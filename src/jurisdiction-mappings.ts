import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  CaseCreated,
  Confirmation,
  Rule,
  RuleEffects,
  TransferSingle
} from "../generated/Jurisdiction/Jurisdiction";
import {
  ActionEntity,
  CaseEntity,
  JurisdictionParticipantEntity,
  JurisdictionRuleEntity
} from "../generated/schema";
import { Case } from "../generated/templates";

/**
 * Handle a tranfer single event to create or update a participant of jurisdiction.
 */
export function handleTransferSingle(event: TransferSingle): void {
  let isTokenMinted = event.params.from.equals(Address.zero());
  let isTokenBurned = event.params.to.equals(Address.zero());
  if (isTokenMinted || isTokenBurned) {
    // Find or create entity
    let account = isTokenMinted
      ? event.params.to.toHexString()
      : event.params.from.toHexString();
    let entity = JurisdictionParticipantEntity.load(account);
    if (!entity) {
      entity = new JurisdictionParticipantEntity(account);
    }
    // Update admin role (id=1)
    if (event.params.id.equals(BigInt.fromString("1"))) {
      entity.isAdmin = isTokenMinted ? true : false;
    }
    // Update member role (id=2)
    if (event.params.id.equals(BigInt.fromString("2"))) {
      entity.isMember = isTokenMinted ? true : false;
    }
    // Update judge role (id=3)
    if (event.params.id.equals(BigInt.fromString("3"))) {
      entity.isJudge = isTokenMinted ? true : false;
    }
    entity.save();
  }
}

/**
 * Handle a rule event to create or update an rule entity.
 */
export function handleRuleAdded(event: Rule): void {
  // Skip if action entity not exists
  let actionEntity = ActionEntity.load(event.params.about.toHexString());
  if (!actionEntity) {
    return;
  }
  // Find or create entity
  let entity = JurisdictionRuleEntity.load(event.params.id.toString());
  if (!entity) {
    entity = new JurisdictionRuleEntity(event.params.id.toString());
  }
  // Update entity's params
  entity.about = actionEntity.id;
  entity.affected = event.params.affected;
  entity.uri = event.params.uri;
  entity.negation = event.params.negation;
  entity.save();
}

/**
 * Handle a rule effects event to update an rule entity.
 */
export function handleRuleEffects(event: RuleEffects): void {
  // Find entity and return if not found
  let entity = JurisdictionRuleEntity.load(event.params.id.toString());
  if (!entity) {
    return;
  }
  // Update entity's params
  entity.effectsEnvironmental = event.params.environmental;
  entity.effectsPersonal = event.params.personal;
  entity.effectsSocial = event.params.social;
  entity.effectsProfessional = event.params.professional;
  entity.save();
}

/**
 * Handle a confirmation event to update an rule entity.
 */
export function handleConfirmation(event: Confirmation): void {
  // Find entity and return if not found
  let entity = JurisdictionRuleEntity.load(event.params.id.toString());
  if (!entity) {
    return;
  }
  // Update entity's params
  entity.confirmationRuling = event.params.ruling;
  entity.confirmationEvidence = event.params.evidence;
  entity.confirmationWitness = event.params.witness;
  entity.save();
}

/**
 * Handle a case created event to create case entities and case contract.
 */
export function handleCaseCreated(event: CaseCreated): void {
  // Skip if case entity is exists
  if (CaseEntity.load(event.params.contractAddress.toHexString())) {
    return;
  }
  // Create case entity
  let caseEntity = new CaseEntity(event.params.contractAddress.toHexString());
  caseEntity.jurisdiction = event.address;
  caseEntity.rules = [];
  caseEntity.createdDate = event.block.timestamp;
  caseEntity.save();
  // Create case contract
  Case.create(event.params.contractAddress);
}
