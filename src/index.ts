// 1. Load signal handlers
// 3. Start client
import * as Client from "./client/client.ts";
// 2. Load database connection
import * as DB from "./db/db.ts";
import * as NodeSignalHandler from "./handlers/node-signal.handler.ts";

NodeSignalHandler.load();

DB.load();

Client.start();
