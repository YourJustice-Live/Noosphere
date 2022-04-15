import {
  CaseEntity,
  CasePostEntity,
  CaseRoleEntity,
  JurisdictionRuleEntity
} from "../generated/schema";
import {
  Post,
  RuleAdded,
  Stage,
  TransferSingle,
  Verdict
} from "../generated/templates/Case/Case";

/**
 * Handle a transfer single event to add a role to case participant.
 */
export function handleTransferSingle(event: TransferSingle): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Define case role entity id (case address + role id)
  let caseRoleEntityId = `${event.address.toHexString()}_${event.params.id.toString()}`;
  // Find or create case role entity
  let caseRoleEntity = CaseRoleEntity.load(caseRoleEntityId);
  if (!caseRoleEntity) {
    caseRoleEntity = new CaseRoleEntity(caseRoleEntityId);
    caseRoleEntity.caseEntity = caseEntity.id;
    caseRoleEntity.roleId = event.params.id;
    caseRoleEntity.accounts = [];
  }
  // Add event account to case entity accounts
  let accounts = caseRoleEntity.accounts;
  accounts.push(event.params.to)
  caseRoleEntity.accounts = accounts;
  caseRoleEntity.save();
}

/**
 * Handle a rule added event to add a rule to case.
 */
export function handleRuleAdded(event: RuleAdded): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Skip if rule entity not exists
  let ruleEntity = JurisdictionRuleEntity.load(event.params.ruleId.toString());
  if (!ruleEntity) {
    return;
  }
  // Add rule to case entity
  let caseEntityRules = caseEntity.rules;
  caseEntityRules.push(ruleEntity.id);
  caseEntity.rules = caseEntityRules;
  caseEntity.save();
}

/**
 * Handle a post event to add a post to case.
 */
export function handlePost(event: Post): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Create post entity
  let casePostEntity = new CasePostEntity(event.transaction.hash.toHexString());
  casePostEntity.caseEntity = caseEntity.id;
  casePostEntity.entityRole = event.params.entRole.toString();
  casePostEntity.uri = event.params.uri;
  casePostEntity.save();
}

/**
 * Handle a stage event to update case stage.
 */
export function handleStage(event: Stage): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Update case stage
  caseEntity.stage = event.params.stage;
  caseEntity.save();
}

/**
 * Handle a verdict event to set case verdict uri.
 */
export function handleVerdict(event: Verdict): void {
  // Skip if case entity not exists
  let caseEntity = CaseEntity.load(event.address.toHexString());
  if (!caseEntity) {
    return;
  }
  // Set case verdict uri
  caseEntity.verdictUri = event.params.uri;
  caseEntity.save();
}
