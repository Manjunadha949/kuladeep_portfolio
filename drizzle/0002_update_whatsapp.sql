INSERT INTO settings (id, value) VALUES ('whatsapp', '917386404940') ON CONFLICT(id) DO UPDATE SET value = excluded.value;
