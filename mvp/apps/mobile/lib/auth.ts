import { createAuthStore } from "@repo/shared";
import { asyncStorage } from "./storage";

// Create a mobile-specific auth store using AsyncStorage for persistence
export const useAuthStore = createAuthStore(asyncStorage);
