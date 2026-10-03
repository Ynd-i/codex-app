import { expect, it } from "vitest";
import { createValidatedPersistStorage } from "@/storage/validated-persist-storage";
import { ChatSectionsPersistedSchema } from "./desktop-chat-sections-store";

it("still loads sections saved before pinned projects and sidebar organization existed", async () => {
  const saved = {
    state: {
      sections: [{ id: "section-a", name: "Work" }],
      sortBySection: { recent: "manual" },
      chatOrderBySection: {},
      collapsedSections: [],
      hideProjects: false,
      chatSection: { "local:agent": "section-a" },
      projectSection: {},
    },
    version: 1,
  };
  const entries: Record<string, string | null> = {
    "desktop-chat-sections": JSON.stringify(saved),
  };
  const storage = createValidatedPersistStorage(
    {
      getItem: (name) => entries[name] ?? null,
      setItem: (name, value) => {
        entries[name] = value;
      },
      removeItem: (name) => {
        entries[name] = null;
      },
    },
    ChatSectionsPersistedSchema,
  );
  // A state the schema rejects is deleted, which would drop every section the user made.
  expect(await storage.getItem("desktop-chat-sections")).toEqual(saved);
  expect(entries["desktop-chat-sections"]).not.toBeNull();
});
