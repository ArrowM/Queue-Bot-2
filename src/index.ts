// 1. Load signal handlers
import * as NodeSignalHandler from "./handlers/node-signal.handler.ts";
// 2. Load database connection
import * as DB from "./db/db.ts";
// 3. Start client
import * as Client from "./client/client.ts";

NodeSignalHandler.load();

DB.load();

Client.start();
