import { ipfs, json, store } from "@graphprotocol/graph-ts";
import {
  Confirmation,
  Rule,
  RuleDisabled,
  RuleEffect
} from "../../generated/RuleRepo/RuleRepo";
import {
  ActionEntity,
  JurisdictionRuleEffectEntity,
  JurisdictionRuleEntity
} from "../../generated/schema";
import {
  getJurisdictionEntity,
  isJurisdictionRuleEntityPositive
} from "../utils";

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
  let jurisdictionEntity = getJurisdictionEntity(
    event.params.originAddress.toHexString()
  );
  // Find or create jurisdiction rule
  let isRuleNew = false;
  let ruleEntityId = `${event.params.originAddress.toHexString()}_${event.params.id.toString()}`;
  let ruleEntity = JurisdictionRuleEntity.load(ruleEntityId);
  if (!ruleEntity) {
    isRuleNew = true;
    ruleEntity = new JurisdictionRuleEntity(ruleEntityId);
    ruleEntity.effects = [];
  }
  // Load uri data
  let uriIpfsHash = event.params.uri.split("/").at(-1);
  let uriData = ipfs.cat(uriIpfsHash);
  let uriJson = uriData ? json.fromBytes(uriData) : null;
  let uriJsonObject = uriJson ? uriJson.toObject() : null;
  let uriName = uriJsonObject ? uriJsonObject.get("name") : null;
  let uriNameString = uriName ? uriName.toString() : null;
  // Update jurisdiction rule
  ruleEntity.jurisdiction = jurisdictionEntity.id;
  ruleEntity.about = actionEntity.id;
  ruleEntity.aboutSubject = actionEntity.subject;
  ruleEntity.ruleId = event.params.id;
  ruleEntity.affected = event.params.affected;
  ruleEntity.uri = event.params.uri;
  ruleEntity.uriData = uriData;
  ruleEntity.uriName = uriNameString;
  ruleEntity.negation = event.params.negation;
  ruleEntity.isDisabled = false;
  ruleEntity.save();
  // Increase rules count if jurisdiction rule is new
  if (isRuleNew) {
    jurisdictionEntity.rulesCount = jurisdictionEntity.rulesCount + 1;
    jurisdictionEntity.save();
  }
}

/**
 * Handle a rule effect event to update a jurisdiction rule entity.
 */
export function handleRuleEffect(event: RuleEffect): void {
  // Find rule entity and return if not found
  let ruleEntityId = `${event.params.originAddress.toHexString()}_${event.params.id.toString()}`;
  let ruleEntity = JurisdictionRuleEntity.load(ruleEntityId);
  if (!ruleEntity) {
    return;
  }
  // Clear rule effects if emitted event with effect from another block
  if (ruleEntity.effectsBlock != event.block.number) {
    for (let i = 0; i < ruleEntity.effects.length; i++) {
      store.remove("JurisdictionRuleEffectEntity", ruleEntity.effects[i]);
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
  ruleEntity.isPositive = isJurisdictionRuleEntityPositive(
    ruleEntity,
    ruleEffectEntity
  );
  // Save rule
  ruleEntity.save();
}

/**
 * Handle a confirmation event to update a jurisdiction rule entity.
 */
export function handleConfirmation(event: Confirmation): void {
  // Find entity and return if not found
  let ruleEntityId = `${event.params.originAddress.toHexString()}_${event.params.id.toString()}`;
  let ruleEntity = JurisdictionRuleEntity.load(ruleEntityId);
  if (!ruleEntity) {
    return;
  }
  // Update entity's params
  ruleEntity.confirmationRuling = event.params.ruling;
  ruleEntity.confirmationEvidence = event.params.evidence;
  ruleEntity.confirmationWitness = event.params.witness;
  ruleEntity.save();
}

/**
 * Handle a rule disabled event to disable or enable a jurisdiction rule entity.
 */
export function handleRuleDisabled(event: RuleDisabled): void {
  // Find entity and return if not found
  let ruleEntityId = `${event.params.originAddress.toHexString()}_${event.params.id.toString()}`;
  let ruleEntity = JurisdictionRuleEntity.load(ruleEntityId);
  if (!ruleEntity) {
    return;
  }
  // Update entity's params
  ruleEntity.isDisabled = event.params.disabled;
  ruleEntity.save();
}
