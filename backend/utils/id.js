/** Normalize SQLite numeric ids, Mongo ObjectIds, and populated refs to strings. */
function toId(value) {
  if (value == null) return null;
  if (typeof value === "object" && value._id != null) return String(value._id);
  return String(value);
}

function sameId(a, b) {
  return toId(a) === toId(b);
}

function withUserId(user) {
  if (!user) return null;
  return { ...user, id: toId(user.id ?? user._id) };
}

module.exports = { toId, sameId, withUserId };
