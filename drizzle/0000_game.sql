CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,nickname TEXT NOT NULL,grade TEXT NOT NULL,is_public INTEGER NOT NULL DEFAULT 0,password_hash TEXT NOT NULL,salt TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX sessions_user ON sessions(user_id);
--> statement-breakpoint
CREATE TABLE auth_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,attempt_key TEXT NOT NULL,at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX auth_attempt_lookup ON auth_attempts(attempt_key,at);
--> statement-breakpoint
CREATE TABLE progress(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,payload TEXT NOT NULL,updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE runs(run_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,level INTEGER NOT NULL,score INTEGER NOT NULL,stars INTEGER NOT NULL,seconds INTEGER NOT NULL,cleared INTEGER NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX runs_user_level ON runs(user_id,level);
--> statement-breakpoint
CREATE TABLE rooms(id TEXT PRIMARY KEY,name TEXT NOT NULL,mode TEXT NOT NULL,capacity INTEGER NOT NULL,status TEXT NOT NULL,seed INTEGER NOT NULL,duration INTEGER NOT NULL,host_id TEXT NOT NULL,password_hash TEXT,created_at INTEGER NOT NULL,started_at INTEGER,winner TEXT);
--> statement-breakpoint
CREATE TABLE room_members(id TEXT PRIMARY KEY,room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,nickname TEXT NOT NULL,score INTEGER NOT NULL DEFAULT 0,cleared INTEGER NOT NULL DEFAULT 0,done INTEGER NOT NULL DEFAULT 0,has_left INTEGER NOT NULL DEFAULT 0,joined_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX room_members_room ON room_members(room_id);
