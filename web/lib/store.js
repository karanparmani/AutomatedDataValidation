const { domains, rules: defaultRules, templates } = require("./catalog");

let ruleStore = cloneRules(defaultRules);

function getCatalog() {
  return {
    domains,
    rules: getRules(),
    templates
  };
}

function getRules() {
  return cloneRules(ruleStore);
}

function getRule(ruleId) {
  return getRules().find((rule) => rule.ruleId === ruleId);
}

function upsertRule(input, existingRuleId) {
  const ruleId = normalizeRuleId(input.ruleId || existingRuleId || `CUSTOM_${Date.now()}`);
  const index = ruleStore.findIndex((rule) => rule.ruleId === existingRuleId || rule.ruleId === ruleId);
  const existing = index >= 0 ? ruleStore[index] : {};
  const nextRule = sanitizeRule({ ...existing, ...input, ruleId });

  if (index >= 0) {
    ruleStore[index] = nextRule;
  } else {
    ruleStore.push(nextRule);
  }

  return { rule: { ...nextRule }, rules: getRules() };
}

function deleteRule(ruleId) {
  const before = ruleStore.length;
  ruleStore = ruleStore.filter((rule) => rule.ruleId !== ruleId);
  return { deleted: before !== ruleStore.length, rules: getRules() };
}

function resetRules() {
  ruleStore = cloneRules(defaultRules);
  return getRules();
}

function cloneRules(source) {
  return source.map((rule) => ({ ...rule }));
}

function normalizeRuleId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function sanitizeRule(rule) {
  const domainId = String(rule.domainId || "standard_qa");
  const ruleId = normalizeRuleId(rule.ruleId);
  const weight = Number.parseInt(rule.weight, 10);

  return {
    domainId,
    ruleId: ruleId || `CUSTOM_${Date.now()}`,
    title: String(rule.title || "Untitled Rule").trim(),
    description: String(rule.description || "").trim(),
    ruleType: String(rule.ruleType || "presence"),
    targetField: String(rule.targetField || "").trim(),
    expectedValue: String(rule.expectedValue || "").trim(),
    matchMode: String(rule.matchMode || rule.matcherType || "specialized"),
    weight: Number.isFinite(weight) ? Math.max(0, Math.min(100, weight)) : 10,
    isActive: rule.isActive === false || rule.isActive === "false" ? false : true
  };
}

module.exports = {
  deleteRule,
  getCatalog,
  getRule,
  getRules,
  resetRules,
  upsertRule
};
