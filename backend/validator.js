const FORBIDDEN = ["CREATE","MERGE","DELETE","SET","CALL","APOC","LOAD CSV","DBMS","USING PERIODIC COMMIT"];

function uppercaseContainsForbidden(cypher) {
  const up = cypher.toUpperCase();
  return FORBIDDEN.filter(t => up.includes(t));
}

function ensureReturn(cypher) {
  return /\bRETURN\b/i.test(cypher);
}

function ensureParameterized(cypher) {
  const quoted = cypher.match(/'[^']*'|"[^"]*"/g);
  return !quoted || quoted.length === 0;
}

function addLimitIfMissing(cypher, defaultLimit = 100) {
  if (!/\bLIMIT\b/i.test(cypher)) {
    return `${cypher.trim()} LIMIT ${defaultLimit}`;
  }
  return cypher;
}

function validateAndSanitize(cypher) {
  const forb = uppercaseContainsForbidden(cypher);
  if (forb.length) throw new Error(`Forbidden tokens present: ${forb.join(",")}`);
  if (!ensureReturn(cypher)) throw new Error('Cypher must contain RETURN clause');
  if (!ensureParameterized(cypher)) throw new Error('Query contains literal strings; require parameterization');
  return addLimitIfMissing(cypher, 100);
}

module.exports = { validateAndSanitize };
