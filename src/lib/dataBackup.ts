import { supabase } from "@/lib/supabase";
import {
  SETTINGS_BACKUP_VERSION,
  settingsBackupSchema,
  type SettingsBackupPayload,
  type SettingsRestoreResult,
} from "@/types/dataBackup";
import type { CreditSourceType } from "@/types/enums";

interface ExportSettingsBackupParams {
  userId: string;
  orgId: string | null;
  isAdmin: boolean;
}

export async function exportSettingsBackup({
  userId,
  orgId,
  isAdmin,
}: ExportSettingsBackupParams): Promise<SettingsBackupPayload> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, region, avatar_url")
    .eq("id", userId)
    .single();

  if (profileError) throw profileError;

  const { data: currencyRows, error: currencyError } = await supabase
    .from("budget_currencies")
    .select("currency, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (currencyError) throw currencyError;

  const payload: SettingsBackupPayload = {
    version: SETTINGS_BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    app: "loantracker",
    scope: "settings",
    profile: {
      full_name: profile.full_name,
      region: profile.region,
      avatar_url: profile.avatar_url,
    },
    budget_currencies: (currencyRows ?? []).map((r) => r.currency),
  };

  if (isAdmin && orgId) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, region, active_regions")
      .eq("id", orgId)
      .single();

    if (orgError) throw orgError;

    payload.organization = {
      name: org.name,
      region: org.region,
      active_regions: org.active_regions,
    };

    const { data: sources, error: sourcesError } = await supabase
      .from("credit_sources")
      .select(
        "id, name, region, type, is_active, default_interest_rate, default_installments, default_due_day"
      )
      .eq("org_id", orgId)
      .order("region")
      .order("name");

    if (sourcesError) throw sourcesError;

    const sourceIds = (sources ?? []).map((s) => s.id);
    let loanDefaults: Array<{
      credit_source_id: string;
      loan_type: string;
      interest_rate: number | null;
      installments: number | null;
      due_day: number | null;
    }> = [];

    if (sourceIds.length > 0) {
      const { data: defaults, error: defaultsError } = await supabase
        .from("credit_source_loan_type_defaults")
        .select("credit_source_id, loan_type, interest_rate, installments, due_day")
        .in("credit_source_id", sourceIds);

      if (defaultsError) throw defaultsError;
      loanDefaults = defaults ?? [];
    }

    payload.credit_sources = (sources ?? []).map((source) => ({
      name: source.name,
      region: source.region,
      type: source.type,
      is_active: source.is_active,
      default_interest_rate: source.default_interest_rate,
      default_installments: source.default_installments,
      default_due_day: source.default_due_day,
      loan_type_defaults: loanDefaults
        .filter((d) => d.credit_source_id === source.id)
        .map(({ loan_type, interest_rate, installments, due_day }) => ({
          loan_type,
          interest_rate,
          installments,
          due_day,
        })),
    }));
  }

  return payload;
}

export function downloadSettingsBackup(payload: SettingsBackupPayload): void {
  const stamp = payload.exported_at.slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `loantracker-settings-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface RestoreSettingsBackupParams {
  userId: string;
  orgId: string | null;
  isAdmin: boolean;
  payload: SettingsBackupPayload;
}

export async function restoreSettingsBackup({
  userId,
  orgId,
  isAdmin,
  payload,
}: RestoreSettingsBackupParams): Promise<SettingsRestoreResult> {
  const parsed = settingsBackupSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid backup file format.");
  }

  const data = parsed.data;
  const result: SettingsRestoreResult = {
    profileUpdated: false,
    budgetCurrenciesUpdated: 0,
    organizationUpdated: false,
    creditSourcesUpserted: 0,
    loanTypeDefaultsUpserted: 0,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: data.profile.full_name,
      region: data.profile.region,
      avatar_url: data.profile.avatar_url,
    })
    .eq("id", userId);

  if (profileError) throw profileError;
  result.profileUpdated = true;

  if (data.budget_currencies && data.budget_currencies.length > 0) {
    const { data: existingRows, error: fetchError } = await supabase
      .from("budget_currencies")
      .select("currency")
      .eq("user_id", userId);

    if (fetchError) throw fetchError;

    const existing = new Set((existingRows ?? []).map((r) => r.currency));
    const toAdd = data.budget_currencies.filter((c) => !existing.has(c));

    if (toAdd.length > 0) {
      const startOrder = existing.size;
      const { error: insertError } = await supabase.from("budget_currencies").insert(
        toAdd.map((currency, index) => ({
          user_id: userId,
          currency,
          sort_order: startOrder + index,
        }))
      );

      if (insertError) throw insertError;
      result.budgetCurrenciesUpdated = toAdd.length;
    }
  }

  if (isAdmin && orgId && data.organization) {
    const { error: orgError } = await supabase
      .from("organizations")
      .update({
        name: data.organization.name,
        region: data.organization.region,
        active_regions: data.organization.active_regions,
      })
      .eq("id", orgId);

    if (orgError) throw orgError;
    result.organizationUpdated = true;
  }

  if (isAdmin && orgId && data.credit_sources) {
    for (const source of data.credit_sources) {
      const { data: existing, error: findError } = await supabase
        .from("credit_sources")
        .select("id")
        .eq("org_id", orgId)
        .eq("name", source.name)
        .eq("region", source.region)
        .maybeSingle();

      if (findError) throw findError;

      let sourceId = existing?.id;

      if (sourceId) {
        const { error: updateError } = await supabase
          .from("credit_sources")
          .update({
            type: source.type as CreditSourceType,
            is_active: source.is_active,
            default_interest_rate: source.default_interest_rate,
            default_installments: source.default_installments,
            default_due_day: source.default_due_day,
          })
          .eq("id", sourceId);

        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("credit_sources")
          .insert({
            org_id: orgId,
            name: source.name,
            region: source.region,
            type: source.type as CreditSourceType,
            is_active: source.is_active,
            default_interest_rate: source.default_interest_rate,
            default_installments: source.default_installments,
            default_due_day: source.default_due_day,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        sourceId = inserted.id;
      }

      result.creditSourcesUpserted += 1;

      const { error: deleteDefaultsError } = await supabase
        .from("credit_source_loan_type_defaults")
        .delete()
        .eq("credit_source_id", sourceId);

      if (deleteDefaultsError) throw deleteDefaultsError;

      if (source.loan_type_defaults.length > 0) {
        const { error: defaultsError } = await supabase
          .from("credit_source_loan_type_defaults")
          .insert(
            source.loan_type_defaults.map((d) => ({
              org_id: orgId,
              credit_source_id: sourceId,
              loan_type: d.loan_type,
              interest_rate: d.interest_rate,
              installments: d.installments,
              due_day: d.due_day,
            }))
          );

        if (defaultsError) throw defaultsError;
        result.loanTypeDefaultsUpserted += source.loan_type_defaults.length;
      }
    }
  }

  return result;
}

export async function parseSettingsBackupFile(file: File): Promise<SettingsBackupPayload> {
  const text = await file.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Could not read backup file — invalid JSON.");
  }

  const parsed = settingsBackupSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Backup file is not a valid Loan Tracker settings export.");
  }

  return parsed.data;
}
