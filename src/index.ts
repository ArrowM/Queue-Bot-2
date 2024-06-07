import { NodeSignalHandler } from "./handlers/node-signal.handler.ts";
import { ClientUtils } from "./utils/client.utils.ts";

NodeSignalHandler.load();

ClientUtils.start();
