const { validateAndSanitize } = require('../validator');

test('validator rejects forbidden keyword', () => {
  expect(() => validateAndSanitize("MATCH (n) RETURN n; CALL db.indexes()"))
    .toThrow();
});

test('validator requires RETURN', () => {
  expect(() => validateAndSanitize("MATCH (n) WHERE n.name = $p")).toThrow();
});

test('add limit if missing', () => {
  const out = validateAndSanitize("MATCH (r:Register) RETURN r.name AS name");
  expect(out).toMatch(/LIMIT 100$/);
});
