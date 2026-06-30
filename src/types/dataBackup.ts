import { z } from "zod";

export const SETTINGS_BACKUP_VERSION = 1 as const;

const loanTypeDefaultSchema = z.object({
  loan_type: z.string(),
  interest_rate: z.number().nullable(),
  installments: z.number().nullable(),
  due_day: z.number().nullable(),
});

const creditSourceBackupSchema = z.object({
  name: z.string(),
  region: z.string(),
  type: z.string(),
  is_active: z.boolean(),
  default_interest_rate: z.number().nullable(),
  default_installments: z.number().nullable(),
  default_due_day: z.number().nullable(),
  loan_type_defaults: z.array(loanTypeDefaultSchema),
});

export const settingsBackupSchema = z.object({
  version: z.literal(SETTINGS_BACKUP_VERSION),
  exported_at: z.string(),
  app: z.literal("loantracker"),
  scope: z.literal("settings"),
  profile: z.object({
    full_name: z.string(),
    region: z.string(),
    avatar_url: z.string().nullable(),
  }),
  budget_currencies: z.array(z.string()).optional(),
  organization: z
    .object({
      name: z.string(),
      region: z.string(),
      active_regions: z.array(z.string()).nullable(),
    })
    .optional(),
  credit_sources: z.array(creditSourceBackupSchema).optional(),
});

export type SettingsBackupPayload = z.infer<typeof settingsBackupSchema>;

export type SettingsRestoreResult = {
  profileUpdated: boolean;
  budgetCurrenciesUpdated: number;
  organizationUpdated: boolean;
  creditSourcesUpserted: number;
  loanTypeDefaultsUpserted: number;
};
