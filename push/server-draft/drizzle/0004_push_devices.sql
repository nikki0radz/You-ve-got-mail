-- Device tokens are private; the authenticated mailbox owner registers them.
CREATE TABLE IF NOT EXISTS push_devices (
  owner TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  updated INTEGER NOT NULL,
  PRIMARY KEY(owner, token)
);
CREATE INDEX IF NOT EXISTS push_devices_owner ON push_devices(owner);
