import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Iymon loyihasi: faqat Postgres. AI Gateway pullik plan talab qiladi (Free'da ishlamaydi),
  // shuning uchun o'chirilgan. AI kerak bo'lsa AI_API_KEY/AI_BASE_URL/AI_MODEL ishlatiladi.
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
