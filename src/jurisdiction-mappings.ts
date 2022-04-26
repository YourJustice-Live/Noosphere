import { Address, ipfs } from "@graphprotocol/graph-ts";
import { Case as CaseContract } from "../generated/Jurisdiction/Case";
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
  JurisdictionRoleEntity,
  JurisdictionRuleEntity
} from "../generated/schema";
import { Case as CaseTemplate } from "../generated/templates";
import { getJurisdictionEntity } from "./utils";

/**
 * Handle a tranfer single event to create or update jurisdiction roles.
 */
export function handleTransferSingle(event: TransferSingle): void {
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Define transfer type
  let isTokenMinted = event.params.from.equals(Address.zero());
  let isTokenBurned = event.params.to.equals(Address.zero());
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
      jurisdictionRoleEntity.accounts = [];
    }
    // Add account to jurisdiction role entity
    let account = isTokenMinted ? event.params.to : event.params.from;
    let accounts = jurisdictionRoleEntity.accounts;
    accounts.push(account);
    jurisdictionRoleEntity.accounts = accounts;
    jurisdictionRoleEntity.save();
  }
}

/**
 * Handle a rule event to create a rule entity.
 */
export function handleRuleAdded(event: Rule): void {
  // Skip if action entity not exists
  let actionEntity = ActionEntity.load(event.params.about.toHexString());
  if (!actionEntity) {
    return;
  }
  // Get jurisdiction
  let jurisdictionEntity = getJurisdictionEntity(event.address.toHexString());
  // Skip if rule entity exists
  let jurisdictionRuleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
  let jurisdictionRuleEntity = JurisdictionRuleEntity.load(
    jurisdictionRuleEntityId
  );
  if (jurisdictionRuleEntity) {
    return;
  }
  // Load uri data
  let uriIpfsHash = event.params.uri.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  // Create jurisdiction rule
  jurisdictionRuleEntity = new JurisdictionRuleEntity(jurisdictionRuleEntityId);
  jurisdictionRuleEntity.jurisdiction = jurisdictionEntity.id;
  jurisdictionRuleEntity.about = actionEntity.id;
  jurisdictionRuleEntity.ruleId = event.params.id;
  jurisdictionRuleEntity.affected = event.params.affected;
  jurisdictionRuleEntity.uri = event.params.uri;
  jurisdictionRuleEntity.uriData = uriData;
  jurisdictionRuleEntity.negation = event.params.negation;
  jurisdictionRuleEntity.save();
}

/**
 * Handle a rule effects event to update a rule entity.
 */
export function handleRuleEffects(event: RuleEffects): void {
  // Find entity and return if not found
  let jurisdictionRuleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
  let jurisdictionRuleEntity = JurisdictionRuleEntity.load(
    jurisdictionRuleEntityId
  );
  if (!jurisdictionRuleEntity) {
    return;
  }
  // Update entity's params
  jurisdictionRuleEntity.effectsEnvironmental = event.params.environmental;
  jurisdictionRuleEntity.effectsPersonal = event.params.personal;
  jurisdictionRuleEntity.effectsSocial = event.params.social;
  jurisdictionRuleEntity.effectsProfessional = event.params.professional;
  jurisdictionRuleEntity.save();
}

/**
 * Handle a confirmation event to update a rule entity.
 */
export function handleConfirmation(event: Confirmation): void {
  // Find entity and return if not found
  let jurisdictionRuleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
  let jurisdictionRuleEntity = JurisdictionRuleEntity.load(jurisdictionRuleEntityId);
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
  // Load case name from contract
  let caseContract = CaseContract.bind(event.params.contractAddress);
  let caseContractName = caseContract.name();
  // Create case entity
  let caseEntity = new CaseEntity(event.params.contractAddress.toHexString());
  caseEntity.name = caseContractName;
  caseEntity.createdDate = event.block.timestamp;
  caseEntity.jurisdiction = event.address;
  caseEntity.rules = [];
  caseEntity.participantAccounts = [];
  caseEntity.save();
  // Create case contract for subgraph using template
  CaseTemplate.create(event.params.contractAddress);
}
