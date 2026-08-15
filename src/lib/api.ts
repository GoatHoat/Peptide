import { supabase } from './supabaseClient';
import { toISODate } from './date';

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
}

export type GlossaryCategory = 'healing' | 'growth' | 'cosmetic' | 'cognitive' | 'other';
export type GlossaryRoute = 'injected' | 'oral' | 'topical' | 'nasal';

export interface GlossaryEntry {
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

export async function addScheduleItem(userId: string, input: NewScheduleItem): Promise<ScheduleItem> {
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
  return data as ScheduleItem;
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

export async function getGlossaryResearch(glossaryId: string): Promise<GlossaryResearch[]> {
  const { data, error } = await supabase
    .from('glossary_research')
    .select('*')
    .eq('glossary_id', glossaryId)
    .order('created_at', { ascending: false });
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
