#!/usr/bin/env node

const BLOCK_PATTERNS = [
  /ignore\s+previous\s+instructions/gi,
  /ignore\s+all\s+prior/gi,
  /system\s+prompt/gi,
  /developer\s+message/gi,
  /jailbreak/gi,
  /face\s*swap/gi,
  /impersonat(e|ion)/gi,
  /de-?aging/gi,
  /ethnicity\s+shift/gi,
];

function sanitizeUserConstraints(input) {
  if (!input || typeof input !== 'string') {
    return {
      text: '',
      removed: false,
      reasons: [],
    };
  }

  let text = input.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  const reasons = [];

  if (text.length > 240) {
    text = text.slice(0, 240).trim();
    reasons.push('truncated_to_240_chars');
  }

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(`blocked_pattern:${pattern}`);
    }
  }

  if (reasons.some((r) => r.startsWith('blocked_pattern:'))) {
    return {
      text: '',
      removed: true,
      reasons,
    };
  }

  return {
    text,
    removed: false,
    reasons,
  };
}

module.exports = {
  sanitizeUserConstraints,
};
