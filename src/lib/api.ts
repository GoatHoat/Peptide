import { supabase } from './supabaseClient';
import { toISODate } from './date';
import { clearLocalState } from './storage';

// ============================================================================
// Types — mirror supabase/migrations/0001_init.sql
// ============================================================================

export interface Profile {
  id: string;
  display_name: string | null;
  notifications_per_day: number;
  reduce_motion: boolean;
  larger_text: boolean;
  subscription_tier: string;
  blood_test_reminder: boolean;
  /** collected in onboarding; drives the personalised intake */
  age?: number | null;
  sex?: 'm' | 'f' | 'na' | null;
  /** the waking day; absent until migration 0014 has been run */
  wake_time?: string | null;
  sleep_time?: string | null;
  /**
   * The three personalisation answers; absent until migration 0018 has been
   * run. `reactions_note` is free text and is deliberately never parsed by a
   * rule — it is context for the assistant and nothing else.
   */
  diet?: string[] | null;
  reactions?: string[] | null;
  reactions_note?: string | null;
  form_prefs?: string[] | null;
  /**
   * Whether the person menstruates, which is the only thing the iron figure
   * turns on. Absent until migration 0019 has been run, and null until they
   * answer on the iron entry — null renders both figures rather than a guess.
   * Never asked in onboarding; see `src/lib/intake.ts`.
   */
  menstruates?: boolean | null;
}

export type GlossaryCategory = 'healing' | 'growth' | 'cosmetic' | 'cognitive' | 'other';
export type GlossaryRoute = 'injected' | 'oral' | 'topical' | 'nasal';

export interface GlossaryEntry {
  /** the label's own serving, e.g. 2 — migration 0033 */
  serving_amount?: number | null;
  serving_unit?: string | null;
  /** as the label prints it: "2 Capsules", "1 Scoop" */
  serving_form?: string | null;
  servings_per_day?: number | null;
  /** commonly-studied range, only ever set alongside a citation id */
  studied_low?: number | null;
  studied_high?: number | null;
  studied_unit?: string | null;
  id: string;
  slug: string;
  name: string;
  category: GlossaryCategory;
  mechanism_summary: string | null;
  storage_notes: string | null;
  route: GlossaryRoute;
  research_summary: string | null;
  goal_tags: string[];
  search_keywords: string[];
  /** these arrive with migrations 0016 / 0017 */
  kind?: 'peptide' | 'supplement' | null;
  brand?: string | null;
  product_form?: string | null;
  /** the NIH Dietary Supplement Label Database filing for this product */
  label_url?: string | null;
  timing?: 'with_food' | 'empty' | 'evening' | 'any' | null;
  timing_note?: string | null;
  evidence?: 'strong' | 'mixed' | 'thin' | null;
  /** the NIH Office of Dietary Supplements fact sheet */
  ods_url?: string | null;
}

export interface NutrientReference {
  glossary_id: string;
  age_band: '14-18' | '19-50' | '51+';
  sex: 'm' | 'f' | 'any';
  rda: number | null;
  ul: number | null;
  unit: string;
}

export interface GlossaryResearch {
  id: string;
  glossary_id: string;
  title: string;
  meta: string | null;
  url: string | null;
}

export interface Dose {
  id: string;
  user_id: string;
  glossary_id: string | null;
  name: string;
  amount: string;
  log_date: string;
  scheduled_time: string | null;
  taken: boolean;
  taken_at: string | null;
  notes: string | null;
  injection_site: string | null;
  schedule_item_id: string | null;
}

export interface NewDose {
  name: string;
  amount: string;
  log_date: string;
  scheduled_time: string | null;
  glossary_id?: string | null;
  notes?: string | null;
  injection_site?: string | null;
}

export interface StackItem {
  id: string;
  glossary_id: string;
  expires_on: string | null;
  vial_total_ml: number | null;
  ml_per_dose: number | null;
  vial_started_on: string | null;
  glossary: GlossaryEntry;
}

export interface VialInfo {
  vial_total_ml: number;
  ml_per_dose: number;
  vial_started_on: string;
}

export interface ScheduleItem {
  id: string;
  glossary_id: string | null;
  name: string;
  amount: string;
  scheduled_time: string | null;
  injection_site: string | null;
  active: boolean;
  created_at: string;
  /** the first day this repeats on; absent until migration 0013 has been run */
  start_date?: string | null;
}

export interface NewScheduleItem {
  name: string;
  amount: string;
  scheduled_time: string | null;
  glossary_id?: string | null;
  injection_site?: string | null;
  /** YYYY-MM-DD, the user's local date. Defaults to today. */
  start_date?: string | null;
}

/** The day an item begins, falling back to when it was created. */
export const scheduleStart = (item: ScheduleItem): string =>
  item.start_date ?? item.created_at.slice(0, 10);

export interface ProgressNote {
  id: string;
  note_date: string;
  text_note: string | null;
  measurement: string | null;
  photo_path: string | null;
  created_at: string;
}

export interface NewProgressNote {
  note_date: string;
  text_note?: string | null;
  measurement?: string | null;
  photo_path?: string | null;
}

// ============================================================================
// Profile
// ============================================================================

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

// ============================================================================
// Doses
// ============================================================================

export async function getDosesForDate(userId: string, date: Date): Promise<Dose[]> {
  const { data, error } = await supabase
    .from('doses')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', toISODate(date))
    .order('scheduled_time', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as Dose[];
}

export async function getDoseHistory(userId: string, name: string): Promise<Dose[]> {
  const { data, error } = await supabase
    .from('doses')
    .select('*')
    .eq('user_id', userId)
    .eq('name', name)
    .order('log_date', { ascending: false })
    .limit(60);
  if (error) throw error;
  return data as Dose[];
}

/** Every logged dose, newest first — used for export, not for any on-screen list. */
export async function getAllDoses(userId: string): Promise<Dose[]> {
  const { data, error } = await supabase
    .from('doses')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false });
  if (error) throw error;
  return data as Dose[];
}

export async function addDose(userId: string, input: NewDose): Promise<Dose> {
  const { data, error } = await supabase
    .from('doses')
    .insert({ user_id: userId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as Dose;
}

export async function setDoseTaken(doseId: string, taken: boolean): Promise<Dose> {
  const { data, error } = await supabase
    .from('doses')
    .update({ taken, taken_at: taken ? new Date().toISOString() : null })
    .eq('id', doseId)
    .select()
    .single();
  if (error) throw error;
  return data as Dose;
}

/** date (YYYY-MM-DD) -> { total, taken } across the given inclusive range. */
export interface InjectionSiteStat {
  lastUsed: string;
  count30d: number;
}

/** Groups the user's own logged injection sites by name — no interpretation, just a count and a most-recent date per site. */
export async function getInjectionSiteStats(userId: string): Promise<Record<string, InjectionSiteStat>> {
  const since = toISODate(new Date(Date.now() - 30 * 86_400_000));
  const { data, error } = await supabase
    .from('doses')
    .select('injection_site, log_date')
    .eq('user_id', userId)
    .not('injection_site', 'is', null)
    .gte('log_date', since)
    .order('log_date', { ascending: false });
  if (error) throw error;

  const stats: Record<string, InjectionSiteStat> = {};
  for (const row of data as { injection_site: string; log_date: string }[]) {
    const key = row.injection_site.trim().toLowerCase();
    const existing = stats[key];
    if (!existing) {
      stats[key] = { lastUsed: row.log_date, count30d: 1 };
    } else {
      existing.count30d += 1;
      if (row.log_date > existing.lastUsed) existing.lastUsed = row.log_date;
    }
  }
  return stats;
}

export async function getComplianceMap(
  userId: string,
  from: Date,
  to: Date,
): Promise<Record<string, { total: number; taken: number }>> {
  const { data, error } = await supabase
    .from('doses')
    .select('log_date, taken')
    .eq('user_id', userId)
    .gte('log_date', toISODate(from))
    .lte('log_date', toISODate(to));
  if (error) throw error;

  const map: Record<string, { total: number; taken: number }> = {};
  for (const row of data as { log_date: string; taken: boolean }[]) {
    const entry = (map[row.log_date] ??= { total: 0, taken: 0 });
    entry.total += 1;
    if (row.taken) entry.taken += 1;
  }
  return map;
}

// ============================================================================
// Schedule — a recurring item the user sets up once (name, their own amount,
// optional time/site). Today materializes it into a real doses row the
// first time it's viewed each day, so it behaves exactly like any other
// logged dose from then on — the app just stopped making the user retype
// the same entry every morning.
// ============================================================================

export async function getScheduleItems(userId: string): Promise<ScheduleItem[]> {
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as ScheduleItem[];
}

/** What the user themselves last entered for this item. Never a suggestion. */
export interface PriorEntry {
  amount: string;
  scheduled_time: string | null;
  injection_site: string | null;
  /** where it came from, so the form can say so rather than appear to know */
  source: 'schedule' | 'log';
  lastUsed: string | null;
}

/**
 * The user's own most recent numbers for a given item, so adding it again does
 * not mean retyping it.
 *
 * This is deliberately the only thing that ever pre-fills the amount field.
 * The app has no recommended dose to offer — the glossary carries name,
 * category, mechanism, storage and route and nothing else, by design (see
 * legal.md). Prior entries are the user's own data being handed back to them,
 * which is the food-diary model the schema was built around.
 *
 * Looks at a previous schedule entry first (including deactivated ones, so
 * removing and re-adding remembers), then falls back to the dose log.
 */
export async function getPriorEntry(
  userId: string,
  opts: { name?: string | null; glossaryId?: string | null },
): Promise<PriorEntry | null> {
  const { name, glossaryId } = opts;
  if (!name && !glossaryId) return null;

  let schedQ = supabase
    .from('schedule_items')
    .select('amount, scheduled_time, injection_site')
    .eq('user_id', userId);
  schedQ = glossaryId ? schedQ.eq('glossary_id', glossaryId) : schedQ.eq('name', name!);
  const { data: sched } = await schedQ.order('created_at', { ascending: false }).limit(1);

  const s = sched?.[0];
  if (s) {
    return { ...s, source: 'schedule', lastUsed: null };
  }

  let logQ = supabase
    .from('doses')
    .select('amount, scheduled_time, injection_site, log_date')
    .eq('user_id', userId);
  logQ = glossaryId ? logQ.eq('glossary_id', glossaryId) : logQ.eq('name', name!);
  const { data: logged } = await logQ.order('log_date', { ascending: false }).limit(1);

  const d = logged?.[0];
  if (d) {
    const { log_date, ...rest } = d;
    return { ...rest, source: 'log', lastUsed: log_date };
  }
  return null;
}

/**
 * The catalogue entry for a name the user typed, matched case-insensitively.
 * Without this a hand-typed item carries no glossary_id, which is what kept it
 * out of the stack — stack_items.glossary_id is NOT NULL.
 */
export async function findGlossaryByName(name: string): Promise<GlossaryEntry | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data } = await supabase
    .from('glossary')
    .select('*')
    .ilike('name', trimmed)
    .limit(1);
  return ((data ?? [])[0] as GlossaryEntry) ?? null;
}

/**
 * Thrown when something tries to put a peptide on the schedule.
 *
 * Not a validation message for the user to work around — nothing in the UI
 * offers this, so reaching it means a code path forgot the rule.
 */
export class PeptideNotSchedulable extends Error {
  constructor(name: string) {
    super(`${name} is a peptide. Peptides are reference only and cannot be scheduled.`);
    this.name = 'PeptideNotSchedulable';
  }
}

export async function addScheduleItem(userId: string, input: NewScheduleItem): Promise<ScheduleItem> {
  /* Peptides are a reference library: no dose, no timing, not schedulable.
     Checked here because this is the one function every path to the schedule
     goes through — Discover, Today, and the onboarding builder all call it, and
     a rule enforced in three screens is a rule that will be missed in the
     fourth. The glossary row is the authority rather than the caller's word for
     it, so a hand-built payload cannot talk its way past. */
  if (input.glossary_id) {
    const { data: entry } = await supabase
      .from('glossary')
      .select('kind, name')
      .eq('id', input.glossary_id)
      .maybeSingle();
    if (entry && (entry as { kind?: string }).kind === 'peptide') {
      throw new PeptideNotSchedulable((entry as { name?: string }).name ?? input.name);
    }
  }

  const { data, error } = await supabase
    .from('schedule_items')
    .insert({ user_id: userId, ...input })
    .select()
    .single();

  // Migration 0013 adds start_date. Until it has been run the column is not
  // there and PostgREST rejects the whole insert (PGRST204), so fall back to
  // an insert without it rather than failing to save the item at all.
  if (error && input.start_date && /start_date/.test(error.message ?? '')) {
    const { start_date, ...rest } = input;
    void start_date;
    const retry = await supabase
      .from('schedule_items')
      .insert({ user_id: userId, ...rest })
      .select()
      .single();
    if (retry.error) throw retry.error;
    return retry.data as ScheduleItem;
  }
  if (error) throw error;
  const item = data as ScheduleItem;
  await linkToStack(userId, item);
  return item;
}

/**
 * Scheduling something means you have it, so it belongs in the stack too.
 * Adding to the stack from Discover offered to schedule it, but the reverse
 * never happened and the two lists drifted apart.
 *
 * Only an item linked to the catalogue can join — stack_items.glossary_id is
 * NOT NULL, so a name typed freehand that matches nothing has nowhere to go.
 * A failure here must not lose the schedule item, which is the thing the user
 * actually asked for.
 */
async function linkToStack(userId: string, item: ScheduleItem): Promise<void> {
  const glossaryId =
    item.glossary_id ?? (await findGlossaryByName(item.name).catch(() => null))?.id ?? null;
  if (!glossaryId) return;
  await addToStack(userId, glossaryId).catch(() => {});
  if (!item.glossary_id) {
    // remember the link so the row is not re-matched by name every time
    await supabase.from('schedule_items').update({ glossary_id: glossaryId }).eq('id', item.id);
  }
}

export async function removeScheduleItem(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_items').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Ensures today has a doses row for every active schedule item, so the
 * existing doses-based rendering, history, and compliance logic all keep
 * working unchanged. Safe to call every time Today loads — only inserts
 * rows that don't already exist for today.
 */
export async function ensureTodayDoses(userId: string): Promise<void> {
  const today = toISODate(new Date());
  const [{ data: items, error: itemsErr }, { data: existing, error: existingErr }] = await Promise.all([
    supabase.from('schedule_items').select('*').eq('user_id', userId).eq('active', true),
    supabase.from('doses').select('schedule_item_id').eq('user_id', userId).eq('log_date', today).not('schedule_item_id', 'is', null),
  ]);
  if (itemsErr) throw itemsErr;
  if (existingErr) throw existingErr;

  const covered = new Set((existing as { schedule_item_id: string }[]).map((r) => r.schedule_item_id));
  const missing = (items as ScheduleItem[]).filter(
    // an item set to begin later simply has no row today yet
    (item) => !covered.has(item.id) && scheduleStart(item) <= today,
  );
  if (missing.length === 0) return;

  const { error: insertErr } = await supabase.from('doses').insert(
    missing.map((item) => ({
      user_id: userId,
      schedule_item_id: item.id,
      glossary_id: item.glossary_id,
      name: item.name,
      amount: item.amount,
      log_date: today,
      scheduled_time: item.scheduled_time,
      injection_site: item.injection_site,
    })),
  );
  if (insertErr) throw insertErr;
}

// ============================================================================
// Glossary
// ============================================================================

export async function listGlossary(limit = 8): Promise<GlossaryEntry[]> {
  const { data, error } = await supabase.from('glossary').select('*').order('name').limit(limit);
  if (error) throw error;
  return data as GlossaryEntry[];
}

/**
 * Free-text match against the existing catalog — name, category, mechanism,
 * research summary, and goal tags. Postgres full-text + trigram search plus
 * a curated synonym table (see migration 0007), no LLM involved. Always
 * returns a filtered list of existing entries, never a generated answer.
 */
export async function matchGoal(query: string): Promise<GlossaryEntry[]> {
  const { data, error } = await supabase.rpc('match_goal', { query_text: query });
  if (error) throw error;
  return data as GlossaryEntry[];
}

export interface GoalSynonym {
  phrase: string;
  expands_to: string[];
}

/**
 * The full synonym table (small, ~50 rows) — fetched once so the client can
 * mirror match_goal()'s substring-expansion step and show the user *why* a
 * search term matched (e.g. "height" -> Growth), instead of a result
 * appearing with no visible connection to what they typed.
 */
export async function getGoalSynonyms(): Promise<GoalSynonym[]> {
  const { data, error } = await supabase.from('goal_synonyms').select('phrase, expands_to');
  if (error) throw error;
  return data as GoalSynonym[];
}

/** Reference intakes for a set of entries, all bands and both sexes. */
export async function getNutrientReference(glossaryIds: string[]): Promise<Record<string, NutrientReference[]>> {
  if (glossaryIds.length === 0) return {};
  const { data, error } = await supabase
    .from('nutrient_reference')
    .select('*')
    .in('glossary_id', glossaryIds);
  if (error) return {};
  const out: Record<string, NutrientReference[]> = {};
  for (const r of (data ?? []) as NutrientReference[]) (out[r.glossary_id] ??= []).push(r);
  return out;
}

/* `pickReference` moved to lib/intake.ts, which owns the whole question of
   which figure applies to a person — including the one nutrient where the
   answer is two figures. It is pure, and this module is not: importing it from
   here would drag the Supabase client into the unit tests. */

export async function getGlossaryResearch(glossaryId: string): Promise<GlossaryResearch[]> {
  const { data, error } = await supabase
    .from('glossary_research')
    .select('*')
    .eq('glossary_id', glossaryId)
    // ascending, so the five read efficacy -> mechanism -> safety ->
    // practical -> interactions rather than arriving backwards
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as GlossaryResearch[];
}

// ============================================================================
// Stacks — one default stack per user, created lazily
// ============================================================================

const DEFAULT_STACK_NAME = 'My Stack';

async function ensureDefaultStack(userId: string): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from('stacks')
    .select('id')
    .eq('user_id', userId)
    .eq('name', DEFAULT_STACK_NAME)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id as string;

  const { data: created, error: insErr } = await supabase
    .from('stacks')
    .insert({ user_id: userId, name: DEFAULT_STACK_NAME })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return created.id as string;
}

export async function isInStack(userId: string, glossaryId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('stack_items')
    .select('id, stacks!inner(user_id)')
    .eq('glossary_id', glossaryId)
    .eq('stacks.user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Batch version of isInStack, for checking a whole result list in one query. */
export async function getStackMembership(userId: string, glossaryIds: string[]): Promise<Set<string>> {
  if (glossaryIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('stack_items')
    .select('glossary_id, stacks!inner(user_id)')
    .in('glossary_id', glossaryIds)
    .eq('stacks.user_id', userId);
  if (error) throw error;
  return new Set((data as { glossary_id: string }[]).map((row) => row.glossary_id));
}

export async function addToStack(userId: string, glossaryId: string): Promise<void> {
  const stackId = await ensureDefaultStack(userId);
  const already = await isInStack(userId, glossaryId);
  if (already) return;
  const { error } = await supabase.from('stack_items').insert({ stack_id: stackId, glossary_id: glossaryId });
  if (error) throw error;
}

export async function getStack(userId: string): Promise<StackItem[]> {
  const { data, error } = await supabase
    .from('stack_items')
    .select(
      'id, glossary_id, expires_on, vial_total_ml, ml_per_dose, vial_started_on, glossary:glossary_id(*), stacks!inner(user_id)',
    )
    .eq('stacks.user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as (StackItem & { stacks: unknown })[]).map(({ stacks: _stacks, ...rest }) => rest);
}

export async function removeFromStack(stackItemId: string): Promise<void> {
  const { error } = await supabase.from('stack_items').delete().eq('id', stackItemId);
  if (error) throw error;
}

export async function setStackItemExpiry(stackItemId: string, expiresOn: string | null): Promise<void> {
  const { error } = await supabase.from('stack_items').update({ expires_on: expiresOn }).eq('id', stackItemId);
  if (error) throw error;
}

/** Vial size and draw-per-dose the user computed for themselves (e.g. via the reconstitution calculator). */
export async function setVialInfo(stackItemId: string, info: VialInfo): Promise<void> {
  const { error } = await supabase.from('stack_items').update(info).eq('id', stackItemId);
  if (error) throw error;
}

export async function clearVialInfo(stackItemId: string): Promise<void> {
  const { error } = await supabase
    .from('stack_items')
    .update({ vial_total_ml: null, ml_per_dose: null, vial_started_on: null })
    .eq('id', stackItemId);
  if (error) throw error;
}

/** How many doses under this name were actually taken on or after a given date — used to work out what's left in a vial. */
export async function getTakenCountSince(userId: string, name: string, sinceDate: string): Promise<number> {
  const { count, error } = await supabase
    .from('doses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('name', name)
    .eq('taken', true)
    .gte('log_date', sinceDate);
  if (error) throw error;
  return count ?? 0;
}

// ============================================================================
// Progress notes — user's own text, measurements, and photos. The app has
// no opinion on these values; it only stores and displays what was entered.
// ============================================================================

export async function getProgressNotes(userId: string): Promise<ProgressNote[]> {
  const { data, error } = await supabase
    .from('progress_notes')
    .select('*')
    .eq('user_id', userId)
    .order('note_date', { ascending: false })
    .limit(60);
  if (error) throw error;
  return data as ProgressNote[];
}

export async function addProgressNote(userId: string, input: NewProgressNote): Promise<ProgressNote> {
  const { data, error } = await supabase
    .from('progress_notes')
    .insert({ user_id: userId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as ProgressNote;
}

export async function uploadProgressPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('progress-photos').upload(path, file);
  if (error) throw error;
  return path;
}

export async function getProgressPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Deletes the signed-in user's account and everything in it, permanently.
 *
 * The work happens in `public.delete_account` (migration 0026) rather than as
 * a set of deletes from here: the auth record itself is the one thing no
 * client role can remove, and leaving it behind is a half-deleted account that
 * can still be logged into. The function takes no arguments — it reads
 * `auth.uid()` from the request — so there is no id for this call to get wrong.
 *
 * The local session is dropped afterwards. Its access token stays
 * cryptographically valid until it expires, so signing out is what actually
 * ends the session on the device.
 */
export async function deleteAccount(userId: string | null): Promise<void> {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  /* Deleting the server-side account and leaving the person's onboarding
     answers and whole assistant conversation sitting in local storage rather
     defeats the point of deleting it. */
  clearLocalState(userId);
  await supabase.auth.signOut();
}

// ============================================================================
// Ingredient search
// ============================================================================

/** One product in an ingredient search, with how much of it is in there. */
export interface IngredientHit {
  /** 1 = the product is for this ingredient, 2 = it merely contains it */
  section: 1 | 2;
  glossary_id: string;
  slug: string;
  name: string;
  brand: string | null;
  kind: string | null;
  evidence: string | null;
  product_form: string | null;
  amount: number | null;
  unit: string | null;
  /** as printed on the panel, e.g. "Zinc (as zinc picolinate)" */
  raw_name: string;
}

/**
 * Products containing an ingredient, whether or not the name says so.
 *
 * Returns an empty array when the query is not an ingredient — the caller reads
 * that as "fall back to name and keyword matching" rather than as "no results".
 * The two are different: "zinc" matching nothing would be a bug, "hair loss"
 * matching nothing is simply not an ingredient search.
 */
export async function searchByIngredient(query: string): Promise<IngredientHit[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase.rpc('search_by_ingredient', { query_text: q });
  /* The function is added by migration 0032. Until that has been applied
     PostgREST answers 404, and an ingredient search that has not been deployed
     yet must degrade to the old name search rather than emptying the screen. */
  if (error) {
    if (/does not exist|not find|PGRST202/i.test(error.message ?? '')) return [];
    throw error;
  }
  return (data ?? []) as IngredientHit[];
}

// ============================================================================
// Catch-up
// ============================================================================

/** The chips offered when someone says they did not take a dose. */
export const SKIP_REASONS = [
  { id: 'forgot', label: 'Forgot' },
  { id: 'not_near', label: "Wasn't near them" },
  { id: 'ran_out', label: 'Ran out' },
  { id: 'didnt_feel', label: "Didn't feel like it" },
  { id: 'felt_off', label: 'Felt off last time I took it' },
  { id: 'travelling', label: 'Was travelling' },
  { id: 'other', label: 'Something else' },
] as const;

/**
 * Records this app open and returns the previous one.
 *
 * Null on a first launch, which the catch-up screen reads as "do not fire" —
 * a device seeing the app for the first time must not be told it missed a week.
 */
export async function touchLastOpened(): Promise<Date | null> {
  const { data, error } = await supabase.rpc('touch_last_opened');
  /* Added by migration 0034. Until it is applied the RPC is absent, and a
     catch-up screen that has not been deployed yet must simply not fire. */
  if (error) {
    if (/does not exist|not find|PGRST202/i.test(error.message ?? '')) return null;
    throw error;
  }
  return data ? new Date(data as string) : null;
}

/**
 * Doses whose time passed while the app was closed, still unmarked.
 *
 * `since` is the previous open. A dose due at 10:30 fires when the app was last
 * open at 21:00 the night before and is opened at 11:00; it does not fire when
 * that same app is opened at 10:00.
 */
export async function getMissedSince(userId: string, since: Date, now: Date): Promise<Dose[]> {
  const { data, error } = await supabase
    .from('doses')
    .select('*')
    .eq('user_id', userId)
    .eq('taken', false)
    .eq('log_date', toISODate(now))
    .order('scheduled_time', { ascending: true });
  if (error) throw error;

  const minutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
  const sinceM = minutes(since);
  const nowM = minutes(now);
  const sameDay = toISODate(since) === toISODate(now);

  return (data as Dose[]).filter((dose) => {
    if (!dose.scheduled_time) return false;
    const [h, m] = dose.scheduled_time.split(':').map(Number);
    const at = h * 60 + (m || 0);
    // due before now, and not already passed the last time the app was open
    if (at > nowM) return false;
    return sameDay ? at > sinceM : true;
  });
}

/** Records why a dose was not taken. One answer per dose; changing it updates. */
export async function skipDose(input: {
  userId: string;
  doseId: string;
  reason: string;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.from('dose_skips').upsert(
    {
      user_id: input.userId,
      dose_id: input.doseId,
      reason: input.reason,
      note: input.note?.slice(0, 500) || null,
    },
    { onConflict: 'dose_id' },
  );
  if (error) throw error;
}

/**
 * Deletes a progress note, and its photo if it had one.
 *
 * The photo goes first: a storage object whose row is already gone is
 * unreachable from the app and would sit in the bucket forever, counted against
 * the user's data but invisible to them. A failure to remove it is swallowed
 * rather than blocking the delete — the row is what the user asked to be rid of.
 */
export async function deleteProgressNote(note: {
  id: string;
  photo_path?: string | null;
}): Promise<void> {
  if (note.photo_path) {
    await supabase.storage.from('progress-photos').remove([note.photo_path]).catch(() => undefined);
  }
  const { error } = await supabase.from('progress_notes').delete().eq('id', note.id);
  if (error) throw error;
}

/**
 * The catalogue row behind a slug.
 *
 * The assistant's cards carry a slug rather than an id — the model only ever
 * sees slugs — so anything that acts on a card has to resolve it first.
 */
export async function findGlossaryBySlug(slug: string): Promise<GlossaryEntry | null> {
  const { data, error } = await supabase.from('glossary').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return (data as GlossaryEntry | null) ?? null;
}
