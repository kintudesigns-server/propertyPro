import { EventEmitter } from "events";

export const notificationEmitter = new EventEmitter();

// Avoid memory leak warnings under development HMR
notificationEmitter.setMaxListeners(100);
